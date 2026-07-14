"""
Long-term/Episodic Memory service.
Extracts and maintains user preferences and facts, with cloud Supabase and local SQLite support.
"""

import json
import sqlite3
import os
from datetime import datetime
from app.middleware.auth import get_supabase
from app.services.llm import generate_completion, build_messages
from app.utils.logger import get_logger

logger = get_logger("memory")

# Local SQLite fallback path
SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "user_profiles.db")


def init_local_db():
    """Ensure local SQLite table for user profiles exists."""
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                preferences TEXT NOT NULL DEFAULT '{}',
                facts TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("local_db_init_failed", error=str(e))


# Initialize local DB on import
init_local_db()


def get_user_profile(user_id: str) -> dict:
    """
    Retrieve user preferences and facts.
    Tries Supabase first, falls back to local SQLite database.
    """
    # 1. Try Supabase
    try:
        supabase = get_supabase()
        res = supabase.table("user_profiles").select("preferences, facts").eq("user_id", user_id).execute()
        if res.data:
            profile = res.data[0]
            # Ensure proper list/dict types
            preferences = profile.get("preferences") or {}
            facts = profile.get("facts") or []
            if isinstance(preferences, str):
                preferences = json.loads(preferences)
            if isinstance(facts, str):
                facts = json.loads(facts)
            return {"preferences": preferences, "facts": facts}
    except Exception as e:
        logger.warning("supabase_profile_fetch_failed_falling_back", error=str(e))

    # 2. SQLite Fallback
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT preferences, facts FROM user_profiles WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "preferences": json.loads(row[0]),
                "facts": json.loads(row[1])
            }
    except Exception as e:
        logger.error("sqlite_profile_fetch_failed", error=str(e))

    return {"preferences": {}, "facts": []}


def save_user_profile(user_id: str, preferences: dict, facts: list[str]) -> bool:
    """
    Save user profile preferences and facts.
    Tries Supabase first, falls back to local SQLite.
    """
    now_iso = datetime.utcnow().isoformat()

    # 1. Try Supabase
    try:
        supabase = get_supabase()
        # Check if profile exists
        res = supabase.table("user_profiles").select("id").eq("user_id", user_id).execute()
        data = {
            "user_id": user_id,
            "preferences": preferences,
            "facts": facts,
            "updated_at": now_iso
        }
        if res.data:
            supabase.table("user_profiles").update(data).eq("user_id", user_id).execute()
        else:
            supabase.table("user_profiles").insert(data).execute()
        logger.info("profile_saved_supabase", user_id=user_id)
        return True
    except Exception as e:
        logger.warning("supabase_profile_save_failed_falling_back", error=str(e))

    # 2. SQLite Fallback
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        pref_str = json.dumps(preferences)
        facts_str = json.dumps(facts)
        cursor.execute("""
            INSERT INTO user_profiles (user_id, preferences, facts, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                preferences = excluded.preferences,
                facts = excluded.facts,
                updated_at = excluded.updated_at
        """, (user_id, pref_str, facts_str, now_iso))
        conn.commit()
        conn.close()
        logger.info("profile_saved_sqlite", user_id=user_id)
        return True
    except Exception as e:
        logger.error("sqlite_profile_save_failed", error=str(e))
        return False


async def extract_and_save_facts(user_id: str, new_user_message: str, new_assistant_response: str) -> None:
    """
    Extract facts and preferences from the latest turns and update the user's profile.
    """
    profile = get_user_profile(user_id)
    current_facts = profile.get("facts") or []
    current_preferences = profile.get("preferences") or {}

    extraction_prompt = f"""You are a helpful background cognitive memory service for PlantMD.
Your task is to analyze the latest user chat message and assistant reply, and extract any new permanent facts or preferences about the user.
Look for:
1. What crops, plants, or trees the user grows (e.g. "tomatoes", "coffee").
2. Their farming/gardening setup (e.g. "raised beds", "greenhouse", "hydroponics").
3. Their location or climate if mentioned.
4. Specific preferences (e.g. "prefers organic solutions", "uses biological control").

Existing facts about user:
{json.dumps(current_facts, indent=2)}

Latest User Message: "{new_user_message}"
Latest Assistant Reply: "{new_assistant_response}"

Instructions:
- Return the updated list of facts as a JSON array of strings.
- Only include facts that are directly stated or highly implied.
- Combine overlapping/similar facts. Keep facts short, e.g. "Grows tomatoes in raised beds".
- If no new facts are found, return the existing list.
- Return ONLY valid JSON, nothing else. Do not wrap in markdown codeblocks.
"""

    try:
        messages = build_messages(extraction_prompt, [], "Extract and update the user profile facts list in JSON format.")
        # Call LLM directly to extract
        result = await generate_completion(messages)
        # Parse JSON
        result_clean = result.strip()
        if result_clean.startswith("```json"):
            result_clean = result_clean.replace("```json", "").replace("```", "").strip()
        elif result_clean.startswith("```"):
            result_clean = result_clean.replace("```", "").strip()

        updated_facts = json.loads(result_clean)
        if isinstance(updated_facts, list):
            # Save updated facts and preferences
            # Simple preference extraction based on common keywords
            msg_lower = new_user_message.lower()
            if "organic" in msg_lower or "chemical-free" in msg_lower:
                current_preferences["farming_style"] = "organic"
            if "greenhouse" in msg_lower:
                current_preferences["environment"] = "greenhouse"
            if "raised bed" in msg_lower:
                current_preferences["soil_medium"] = "raised_beds"

            save_user_profile(user_id, current_preferences, updated_facts)
            logger.info("memory_updated", user_id=user_id, new_facts_count=len(updated_facts))
    except Exception as e:
        logger.error("memory_extraction_failed", error=str(e))

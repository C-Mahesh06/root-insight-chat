"""
Supabase JWT authentication middleware for FastAPI.
Verifies the Bearer token from the Authorization header.
"""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from supabase import create_client, Client

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("auth")

security = HTTPBearer()

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Get or create Supabase client (service role or anon key)."""
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if not key:
            import os
            key = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            key,
        )
    return _supabase_client


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verify the Supabase JWT and return the user payload.

    Returns a dict with at least 'sub' (user_id) and 'email'.
    """
    token = credentials.credentials
    settings = get_settings()

    try:
        # If JWT secret is configured, verify locally
        if settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return {
                "user_id": payload.get("sub"),
                "email": payload.get("email", ""),
                "role": payload.get("role", "authenticated"),
            }

        # Otherwise, verify via Supabase API
        supabase = get_supabase()
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = user_response.user
        return {
            "user_id": user.id,
            "email": user.email or "",
            "role": "authenticated",
        }
    except jwt.ExpiredSignatureError:
        logger.warning("token_expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning("token_invalid", error=str(e))
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error("auth_error", error=str(e))
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_current_user(user: dict = Depends(verify_token)) -> dict:
    """Dependency that returns the authenticated user dict."""
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that requires the user to be an admin."""
    supabase = get_supabase()
    result = supabase.table("user_roles").select("role").eq(
        "user_id", user["user_id"]
    ).eq("role", "admin").maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=403, detail="Admin access required")

    user["is_admin"] = True
    return user

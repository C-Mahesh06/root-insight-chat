"""
User management API routes.
Only accessible by administrators.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import require_admin
from app.middleware.auth import get_supabase
from app.utils.logger import get_logger

router = APIRouter(prefix="/api/users", tags=["users"])
logger = get_logger("user_routes")


@router.get("/")
async def list_users(admin: dict = Depends(require_admin)):
    """List all user profiles and roles. Admin only."""
    supabase = get_supabase()

    # Fetch profiles
    profiles_result = supabase.table("profiles").select(
        "id, email, full_name, avatar_url, created_at"
    ).order("created_at", desc=True).execute()
    profiles = profiles_result.data or []

    # Fetch admin roles
    roles_result = supabase.table("user_roles").select("user_id, role").execute()
    roles = roles_result.data or []
    admin_ids = {r["user_id"] for r in roles if r["role"] == "admin"}

    return [
        {
            "id": p["id"],
            "email": p.get("email"),
            "full_name": p.get("full_name"),
            "avatar_url": p.get("avatar_url"),
            "is_admin": p["id"] in admin_ids,
            "created_at": p["created_at"],
        }
        for p in profiles
    ]


@router.post("/{user_id}/toggle-admin")
async def toggle_admin_role(
    user_id: str,
    body: dict,
    admin: dict = Depends(require_admin),
):
    """Promote or demote a user to/from admin. Admin only."""
    make_admin = body.get("makeAdmin", False)
    supabase = get_supabase()

    # Prevent self-demotion
    if not make_admin and user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot demote yourself")

    if make_admin:
        result = supabase.table("user_roles").insert({
            "user_id": user_id,
            "role": "admin"
        }).execute()
    else:
        result = supabase.table("user_roles").delete().eq(
            "user_id", user_id
        ).eq("role", "admin").execute()

    logger.info("user_role_updated", target_user_id=user_id, is_admin=make_admin)
    return {"ok": True}


@router.post("/claim-first-admin")
async def claim_first_admin(body: dict):
    """
    Bootstrap endpoint: allow a user to claim the first admin role
    if no admin exists in the system.
    """
    user_id = body.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")

    supabase = get_supabase()

    # Check if any admin exists
    admins = supabase.table("user_roles").select("id").eq("role", "admin").limit(1).execute()
    if admins.data:
        raise HTTPException(status_code=400, detail="An admin already exists")

    # Add user as admin
    supabase.table("user_roles").insert({
        "user_id": user_id,
        "role": "admin"
    }).execute()

    logger.info("first_admin_claimed", user_id=user_id)
    return {"ok": True}

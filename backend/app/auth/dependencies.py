from fastapi import Header, HTTPException

def get_current_role(x_user_role: str = Header(default="Designer")):
    """
    Mock dependency that simulates extracting a role from an SSO JWT.
    In this prototype, we rely on the `x-user-role` header injected by the frontend.
    """
    return x_user_role

def require_procurement_access(x_user_role: str = Header(default="Designer")):
    """
    Raises a 403 Forbidden if the user is not a Tech Admin or legacy Procurement/Admin role.
    """
    allowed_roles = ["Procurement Analyst", "Admin", "Tech Admin"]
    if x_user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden: Requires Tech Admin role")
    return x_user_role

def require_d2m_analyst_access(x_user_role: str = Header(default="Designer")):
    """
    Raises a 403 Forbidden if the user is not a Tech Admin or legacy D2M/Admin role.
    """
    allowed_roles = ["D2M Analyst", "Admin", "Tech Admin"]
    if x_user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden: Requires Tech Admin role")
    return x_user_role


def require_business_admin_access(x_user_role: str = Header(default="Designer")):
    """
    Raises a 403 Forbidden if the user is not a Business Admin or Admin.
    """
    allowed_roles = ["Business Admin", "Admin"]
    if x_user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden: Requires Business Admin or Admin role")
    return x_user_role

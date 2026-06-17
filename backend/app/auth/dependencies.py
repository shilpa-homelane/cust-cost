from fastapi import Header, HTTPException

def get_current_role(x_user_role: str = Header(default="Designer")):
    """
    Mock dependency that simulates extracting a role from an SSO JWT.
    In this prototype, we rely on the `x-user-role` header injected by the frontend.
    """
    return x_user_role

def require_procurement_access(x_user_role: str = Header(default="Designer")):
    """
    Raises a 403 Forbidden if the user is not a Procurement Analyst or Admin.
    """
    allowed_roles = ["Procurement Analyst", "Admin"]
    if x_user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden: Requires Procurement or Admin role")
    return x_user_role

def require_d2m_analyst_access(x_user_role: str = Header(default="Designer")):
    """
    Raises a 403 Forbidden if the user is not a D2M Analyst or Admin.
    """
    allowed_roles = ["D2M Analyst", "Admin"]
    if x_user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden: Requires D2M Analyst or Admin role")
    return x_user_role

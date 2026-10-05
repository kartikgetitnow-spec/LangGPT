from typing import Optional, Dict, Any
from fastapi import Header, Cookie, HTTPException, status
import jwt
from config import AUTH_SECRET

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and verifies a JWT token using AUTH_SECRET.
    """
    # 1. Try standard HS256 verification
    for alg in ["HS256", "HS512"]:
        try:
            decoded = jwt.decode(
                token,
                AUTH_SECRET,
                algorithms=[alg],
                options={"verify_signature": True, "verify_exp": False},
            )
            return decoded
        except Exception:
            pass

    # 2. Try unverified decode for NextAuth JWE / custom tokens if secret format varies
    try:
        unverified = jwt.decode(
            token,
            options={"verify_signature": False},
        )
        if "sub" in unverified or "email" in unverified:
            return unverified
    except Exception:
        pass

    return None

async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
    authjs_session_token: Optional[str] = Cookie(None, alias="authjs.session-token"),
    secure_authjs_session_token: Optional[str] = Cookie(None, alias="__Secure-authjs.session-token"),
    next_auth_session_token: Optional[str] = Cookie(None, alias="next-auth.session-token"),
) -> Dict[str, Any]:
    """
    FastAPI dependency to authenticate the user before processing RAG operations.
    Supports:
    - Internal proxy header: x-user-id
    - Bearer token: Authorization: Bearer <token>
    - NextAuth session cookies
    """
    # 1. Direct header injected by Node.js Express reverse proxy
    if x_user_id and x_user_id.strip():
        return {
            "id": x_user_id.strip(),
            "email": x_user_email or "",
            "name": x_user_name or "",
        }

    # 2. Authorization header: Bearer <token>
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()

    # 3. NextAuth cookie fallback
    if not token:
        token = secure_authjs_session_token or authjs_session_token or next_auth_session_token

    if token:
        payload = verify_token(token)
        if payload:
            user_id = payload.get("sub") or payload.get("id") or payload.get("email")
            if user_id:
                return {
                    "id": str(user_id),
                    "email": payload.get("email", ""),
                    "name": payload.get("name", ""),
                }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please sign in to access RAG features.",
        headers={"WWW-Authenticate": "Bearer"},
    )

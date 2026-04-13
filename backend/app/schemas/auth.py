from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str       # str statt EmailStr — kein DNS-Check beim Login
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    is_active: bool
    is_superuser: bool

    model_config = {"from_attributes": True}

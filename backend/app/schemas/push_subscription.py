from pydantic import BaseModel


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": str, "auth": str}


class PushSubscriptionDelete(BaseModel):
    endpoint: str

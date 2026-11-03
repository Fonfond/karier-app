from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# --- Users ---
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginData(BaseModel):
    username: str
    password: str


# --- Equipment ---
class EquipmentBase(BaseModel):
    name: str
    type: Optional[str] = None
    status: Optional[str] = "В работе"
    description: Optional[str] = None
    x_coord: float
    y_coord: float
    client_id: Optional[str] = None


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    x_coord: Optional[float] = None
    y_coord: Optional[float] = None


class EquipmentOut(EquipmentBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Sync ---
class SyncOperation(BaseModel):
    op_type: str
    entity: str
    client_id: str
    data: dict
    timestamp: datetime
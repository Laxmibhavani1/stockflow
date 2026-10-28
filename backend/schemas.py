
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    organization_name: str = Field(min_length=2, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    sku: str = Field(min_length=1, max_length=50)
    description: str | None = None
    quantity: int = Field(default=0, ge=0)
    cost_price: float | None = Field(default=None, ge=0)
    selling_price: float | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    sku: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = None
    quantity: int | None = Field(default=None, ge=0)
    cost_price: float | None = Field(default=None, ge=0)
    selling_price: float | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)


class ProductResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    sku: str
    description: str | None = None
    quantity: int
    cost_price: float | None = None
    selling_price: float | None = None
    low_stock_threshold: int | None = None

    class Config:
        from_attributes = True
class DashboardResponse(BaseModel):
    total_products: int
    total_quantity: int
    low_stock_count: int
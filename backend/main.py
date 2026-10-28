
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db, engine, Base
from models import User, Organization, Product
from schemas import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    DashboardResponse,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

import models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="StockFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://stockflow-two-azure.vercel.app",
],,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


@app.get("/")
def home():
    return {
        "message": "Welcome to StockFlow API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/auth/signup", response_model=TokenResponse)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    email = data.email.lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )

    org = Organization(name=data.organization_name)
    db.add(org)
    db.flush()

    user = User(
        email=email,
        hashed_password=hash_password(data.password),
        organization_id=org.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "access_token": create_access_token(user.id, org.id),
        "token_type": "bearer",
    }


@app.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == data.email.lower()
    ).first()

    if not user or not verify_password(
        data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    return {
        "access_token": create_access_token(
            user.id, user.organization_id
        ),
        "token_type": "bearer",
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
        organization_id = int(payload["org"])
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == organization_id,
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    return user


@app.post(
    "/products",
    response_model=ProductResponse,
    status_code=201,
)
def create_product(
    data: ProductCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = Product(
        **data.model_dump(),
        organization_id=user.organization_id,
    )
    db.add(product)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="SKU already exists",
        )

    return product


@app.get("/products", response_model=list[ProductResponse])
def list_products(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Product).filter(
        Product.organization_id == user.organization_id
    ).all()


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == user.organization_id,
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    return product


@app.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == user.organization_id,
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="SKU already exists",
        )

    return product


@app.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == user.organization_id,
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    db.delete(product)
    db.commit()
    return None


@app.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    products = db.query(Product).filter(
        Product.organization_id == user.organization_id
    ).all()

    total_products = len(products)
    total_quantity = sum(p.quantity for p in products)

    low_stock_count = sum(
        1
        for p in products
        if p.quantity <= (
            p.low_stock_threshold
            if p.low_stock_threshold is not None
            else user.organization.default_low_stock_threshold
        )
    )

    return {
        "total_products": total_products,
        "total_quantity": total_quantity,
        "low_stock_count": low_stock_count,
    }

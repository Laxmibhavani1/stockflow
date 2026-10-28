
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float,
    DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


def current_time():
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    default_low_stock_threshold = Column(
        Integer, default=5, nullable=False
    )

    users = relationship("User", back_populates="organization")
    products = relationship("Product", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )

    organization = relationship("Organization", back_populates="users")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False
    )
    name = Column(String, nullable=False)
    sku = Column(String, nullable=False)
    description = Column(String, nullable=True)
    quantity = Column(Integer, default=0, nullable=False)
    cost_price = Column(Float, nullable=True)
    selling_price = Column(Float, nullable=True)
    low_stock_threshold = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=current_time)
    updated_at = Column(
        DateTime, default=current_time, onupdate=current_time
    )

    organization = relationship(
        "Organization", back_populates="products"
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "sku",
            name="unique_org_sku"
        ),
    )

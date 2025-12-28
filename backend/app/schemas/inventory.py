from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# Inventory Category schemas
class InventoryCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class InventoryCategoryCreate(InventoryCategoryBase):
    pass


class InventoryCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class InventoryCategoryResponse(InventoryCategoryBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Inventory Transaction schemas
class InventoryTransactionBase(BaseModel):
    action: str
    quantity_change: int
    reason: Optional[str] = None


class InventoryTransactionCreate(InventoryTransactionBase):
    pass


class StockInRequest(BaseModel):
    quantity: int
    reason: Optional[str] = None


class StockOutRequest(BaseModel):
    quantity: int
    reason: Optional[str] = None


class InventoryTransactionResponse(InventoryTransactionBase):
    id: UUID
    item_id: UUID
    user_id: UUID
    quantity_before: int
    quantity_after: int
    created_at: datetime

    class Config:
        from_attributes = True


# Inventory Item schemas
class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    sku: Optional[str] = None
    unit: Optional[str] = "pcs"
    location: Optional[str] = None
    min_threshold: int = 0
    unit_price: Optional[Decimal] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None


class InventoryItemCreate(InventoryItemBase):
    quantity: int = 0


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    min_threshold: Optional[int] = None
    unit_price: Optional[Decimal] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None


class InventoryItemResponse(InventoryItemBase):
    id: UUID
    quantity: int
    created_at: datetime
    updated_at: datetime
    transactions: Optional[List[InventoryTransactionResponse]] = []

    class Config:
        from_attributes = True

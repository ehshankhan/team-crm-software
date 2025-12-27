from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.inventory import (
    InventoryCategoryCreate,
    InventoryCategoryUpdate,
    InventoryCategoryResponse,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
    StockInRequest,
    StockOutRequest,
    InventoryTransactionResponse
)
from app.models.inventory import InventoryCategory, InventoryItem, InventoryTransaction
from app.models.user import User
from app.core.permissions import require_role, Permission
from app.api.deps import get_current_user

router = APIRouter()


# ==================== CATEGORY ENDPOINTS ====================

@router.get("/categories", response_model=List[InventoryCategoryResponse])
def list_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all inventory categories.
    """
    categories = db.query(InventoryCategory).offset(skip).limit(limit).all()
    return categories


@router.post("/categories", response_model=InventoryCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: InventoryCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new inventory category (admin only).
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN])

    # Check if category name already exists
    existing_category = db.query(InventoryCategory).filter(
        InventoryCategory.name == category_data.name
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )

    category = InventoryCategory(
        name=category_data.name,
        description=category_data.description
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return category


@router.put("/categories/{category_id}", response_model=InventoryCategoryResponse)
def update_category(
    category_id: UUID,
    category_data: InventoryCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a category (admin only).
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN])

    category = db.query(InventoryCategory).filter(InventoryCategory.id == category_id).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Update fields
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a category (admin only).
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN])

    category = db.query(InventoryCategory).filter(InventoryCategory.id == category_id).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if category has items
    items_count = db.query(InventoryItem).filter(InventoryItem.category_id == category_id).count()
    if items_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {items_count} items. Reassign items first."
        )

    db.delete(category)
    db.commit()

    return {"message": "Category deleted successfully"}


# ==================== INVENTORY ITEM ENDPOINTS ====================

@router.get("/", response_model=List[InventoryItemResponse])
def list_inventory_items(
    skip: int = 0,
    limit: int = 100,
    category_id: UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all inventory items.

    Optionally filter by category.
    """
    query = db.query(InventoryItem)

    if category_id:
        query = query.filter(InventoryItem.category_id == category_id)

    items = query.offset(skip).limit(limit).all()
    return items


@router.get("/low-stock", response_model=List[InventoryItemResponse])
def get_low_stock_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get items with quantity below minimum threshold.

    Returns items where quantity < min_threshold.
    """
    items = db.query(InventoryItem).filter(
        InventoryItem.quantity < InventoryItem.min_threshold
    ).all()

    return items


@router.post("/", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_data: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new inventory item (admin and manager only).
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    # Check if SKU already exists
    if item_data.sku:
        existing_item = db.query(InventoryItem).filter(
            InventoryItem.sku == item_data.sku
        ).first()

        if existing_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item with this SKU already exists"
            )

    # Verify category exists if provided
    if item_data.category_id:
        category = db.query(InventoryCategory).filter(
            InventoryCategory.id == item_data.category_id
        ).first()

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

    item = InventoryItem(
        name=item_data.name,
        description=item_data.description,
        category_id=item_data.category_id,
        sku=item_data.sku,
        quantity=item_data.quantity,
        unit=item_data.unit,
        location=item_data.location,
        min_threshold=item_data.min_threshold,
        unit_price=item_data.unit_price,
        supplier=item_data.supplier,
        notes=item_data.notes
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.get("/{item_id}", response_model=InventoryItemResponse)
def get_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get inventory item details with transaction history.
    """
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    return item


@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_inventory_item(
    item_id: UUID,
    item_data: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update inventory item details (admin and manager only).

    Note: Use stock-in/stock-out endpoints to change quantity.
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    # Verify category exists if updating category
    if item_data.category_id:
        category = db.query(InventoryCategory).filter(
            InventoryCategory.id == item_data.category_id
        ).first()

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

    # Update fields
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an inventory item (admin only).
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN])

    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    db.delete(item)
    db.commit()

    return {"message": "Inventory item deleted successfully"}


# ==================== STOCK MANAGEMENT ENDPOINTS ====================

@router.post("/{item_id}/stock-in", response_model=InventoryTransactionResponse, status_code=status.HTTP_201_CREATED)
def stock_in(
    item_id: UUID,
    stock_data: StockInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add stock to an inventory item.

    Creates a transaction record and updates item quantity.
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    if stock_data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be greater than 0"
        )

    # Create transaction record
    quantity_before = item.quantity
    quantity_after = quantity_before + stock_data.quantity

    transaction = InventoryTransaction(
        item_id=item_id,
        user_id=current_user.id,
        action="stock_in",
        quantity_change=stock_data.quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=stock_data.reason
    )

    # Update item quantity
    item.quantity = quantity_after

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.post("/{item_id}/stock-out", response_model=InventoryTransactionResponse, status_code=status.HTTP_201_CREATED)
def stock_out(
    item_id: UUID,
    stock_data: StockOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove stock from an inventory item.

    Creates a transaction record and updates item quantity.
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    if stock_data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be greater than 0"
        )

    if item.quantity < stock_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Available: {item.quantity}, Requested: {stock_data.quantity}"
        )

    # Create transaction record
    quantity_before = item.quantity
    quantity_after = quantity_before - stock_data.quantity

    transaction = InventoryTransaction(
        item_id=item_id,
        user_id=current_user.id,
        action="stock_out",
        quantity_change=stock_data.quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=stock_data.reason
    )

    # Update item quantity
    item.quantity = quantity_after

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get("/{item_id}/transactions", response_model=List[InventoryTransactionResponse])
def get_item_transactions(
    item_id: UUID,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get transaction history for an inventory item.
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    transactions = db.query(InventoryTransaction).filter(
        InventoryTransaction.item_id == item_id
    ).order_by(InventoryTransaction.created_at.desc()).offset(skip).limit(limit).all()

    return transactions

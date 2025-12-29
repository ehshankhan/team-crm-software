from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.database import get_db
from app.schemas.procurement import (
    ProcurementItemCreate,
    ProcurementItemUpdate,
    ProcurementItemResponse
)
from app.models.procurement import ProcurementItem
from app.models.inventory import InventoryItem, InventoryCategory
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=ProcurementItemResponse, status_code=status.HTTP_201_CREATED)
def create_procurement_item(
    item_data: ProcurementItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new procurement item.

    Anyone can add procurement items.
    """
    procurement_item = ProcurementItem(
        name=item_data.name,
        link=item_data.link,
        vendor=item_data.vendor,
        quantity=item_data.quantity,
        priority=item_data.priority,
        notes=item_data.notes,
        requested_by=current_user.id,
        status="pending"
    )

    db.add(procurement_item)
    db.commit()
    db.refresh(procurement_item)

    # Load requester relationship
    procurement_item.requester

    return procurement_item


@router.get("/", response_model=List[ProcurementItemResponse])
def list_procurement_items(
    status_filter: Optional[str] = None,
    vendor_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all procurement items (pending only by default).

    Optional filters: status, vendor, priority
    """
    query = db.query(ProcurementItem).options(
        joinedload(ProcurementItem.requester)
    ).filter(ProcurementItem.status == "pending")

    if status_filter:
        query = query.filter(ProcurementItem.status == status_filter)
    if vendor_filter:
        query = query.filter(ProcurementItem.vendor == vendor_filter)
    if priority_filter:
        query = query.filter(ProcurementItem.priority == priority_filter)

    items = query.order_by(ProcurementItem.created_at.desc()).all()
    return items


@router.get("/non-gem", response_model=List[ProcurementItemResponse])
def list_non_gem_items(
    vendor_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get items flagged for Non-Gem procurement.

    Optional filter: vendor
    """
    query = db.query(ProcurementItem).options(
        joinedload(ProcurementItem.requester)
    ).filter(
        ProcurementItem.is_non_gem == True,
        ProcurementItem.status == "pending"
    )

    if vendor_filter:
        query = query.filter(ProcurementItem.vendor == vendor_filter)

    items = query.order_by(ProcurementItem.vendor, ProcurementItem.created_at.desc()).all()
    return items


@router.put("/{item_id}", response_model=ProcurementItemResponse)
def update_procurement_item(
    item_id: UUID,
    item_data: ProcurementItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a procurement item.
    """
    item = db.query(ProcurementItem).filter(ProcurementItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurement item not found"
        )

    # Update fields
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    # Load requester
    item.requester

    return item


@router.put("/{item_id}/mark-non-gem", response_model=ProcurementItemResponse)
def mark_as_non_gem(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Flag an item for Non-Gem procurement.
    """
    item = db.query(ProcurementItem).filter(ProcurementItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurement item not found"
        )

    item.is_non_gem = True
    db.commit()
    db.refresh(item)

    # Load requester
    item.requester

    return item


@router.put("/{item_id}/unmark-non-gem", response_model=ProcurementItemResponse)
def unmark_as_non_gem(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove Non-Gem flag from an item.
    """
    item = db.query(ProcurementItem).filter(ProcurementItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurement item not found"
        )

    item.is_non_gem = False
    db.commit()
    db.refresh(item)

    # Load requester
    item.requester

    return item


@router.post("/{item_id}/receive", status_code=status.HTTP_200_OK)
def mark_as_received(
    item_id: UUID,
    category_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark item as received and optionally move to inventory.

    If category_id is provided, creates inventory item.
    """
    item = db.query(ProcurementItem).filter(ProcurementItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurement item not found"
        )

    # Mark as received
    item.status = "received"
    item.received_at = datetime.utcnow()

    # Optionally create inventory item
    if category_id:
        # Verify category exists
        category = db.query(InventoryCategory).filter(InventoryCategory.id == category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory category not found"
            )

        # Create inventory item
        inventory_item = InventoryItem(
            name=item.name,
            category_id=category_id,
            quantity=item.quantity,
            unit="pcs",
            min_threshold=5,
            notes=f"Added from procurement. Vendor: {item.vendor}"
        )
        db.add(inventory_item)

    db.commit()

    return {"message": "Item marked as received", "moved_to_inventory": category_id is not None}


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_procurement_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a procurement item.
    """
    item = db.query(ProcurementItem).filter(ProcurementItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurement item not found"
        )

    db.delete(item)
    db.commit()

    return {"message": "Procurement item deleted successfully"}


@router.get("/vendors/list", response_model=List[str])
def list_unique_vendors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of unique vendors from procurement items.
    """
    vendors = db.query(ProcurementItem.vendor).distinct().all()
    return [v[0] for v in vendors]

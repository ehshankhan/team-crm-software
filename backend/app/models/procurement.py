from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class ProcurementItem(Base):
    __tablename__ = "procurement_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    link = Column(Text, nullable=True)
    vendor = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    status = Column(String(20), default="pending")  # pending, received
    is_non_gem = Column(Boolean, default=False)  # Flagged for Non-Gem export
    non_gem_completed_at = Column(DateTime(timezone=True), nullable=True)  # Date when Non-Gem procurement was completed
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    requester = relationship("User", back_populates="procurement_requests")

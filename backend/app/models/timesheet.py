from sqlalchemy import Column, String, DateTime, ForeignKey, Date, Numeric, Text, Computed
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Timesheet(Base):
    __tablename__ = "timesheets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    auto_hours = Column(Numeric(4, 2), default=0)
    manual_hours = Column(Numeric(4, 2), default=0)
    total_hours = Column(Numeric(4, 2), Computed("auto_hours + manual_hours"), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="timesheets", foreign_keys=[user_id])
    approver = relationship("User", back_populates="approved_timesheets", foreign_keys=[approved_by])

    # Unique constraint for user and date
    __table_args__ = (
        {"schema": None},
    )

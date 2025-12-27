from sqlalchemy import Column, String, DateTime, ForeignKey, Date, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    check_in = Column(DateTime(timezone=True), nullable=True)
    check_out = Column(DateTime(timezone=True), nullable=True)
    check_in_latitude = Column(Numeric(10, 8), nullable=True)
    check_in_longitude = Column(Numeric(11, 8), nullable=True)
    check_out_latitude = Column(Numeric(10, 8), nullable=True)
    check_out_longitude = Column(Numeric(11, 8), nullable=True)
    check_in_address = Column(Text, nullable=True)
    check_out_address = Column(Text, nullable=True)
    status = Column(String(20), default="present")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="attendances")

    # Unique constraint for user and date
    __table_args__ = (
        {"schema": None},
    )

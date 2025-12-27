from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.models.attendance import Attendance
from app.models.timesheet import Timesheet


def process_checkout(attendance: Attendance, db: Session) -> None:
    """
    Process checkout and auto-generate/update timesheet.

    When a user checks out, calculate the hours worked and create or update
    the corresponding timesheet entry.

    Args:
        attendance: The attendance record with check_in and check_out times
        db: Database session
    """
    if not attendance.check_in or not attendance.check_out:
        return

    # Calculate hours worked
    time_diff = attendance.check_out - attendance.check_in
    hours = Decimal(str(time_diff.total_seconds() / 3600))
    hours = round(hours, 2)

    # Find existing timesheet for this user and date
    timesheet = db.query(Timesheet).filter(
        Timesheet.user_id == attendance.user_id,
        Timesheet.date == attendance.date
    ).first()

    if timesheet:
        # Update existing timesheet
        timesheet.auto_hours = hours
        timesheet.updated_at = datetime.utcnow()
    else:
        # Create new timesheet
        timesheet = Timesheet(
            user_id=attendance.user_id,
            date=attendance.date,
            auto_hours=hours,
            manual_hours=Decimal("0.00"),
            status="pending"
        )
        db.add(timesheet)

    db.commit()

"""
Script to add 'student' role to existing database.
Run this once to add the student role with same permissions as employee.
"""

from app.database import SessionLocal
from app.models.user import Role


def add_student_role():
    """Add student role to the database."""
    db = SessionLocal()

    try:
        # Check if student role already exists
        existing_student = db.query(Role).filter(Role.name == "student").first()

        if existing_student:
            print("✓ Student role already exists!")
            print(f"  Role ID: {existing_student.id}")
            print(f"  Permissions: {existing_student.permissions}")
            return

        # Create student role with same permissions as employee
        student_role = Role(
            name="student",
            permissions={
                "view_own": True,
                "mark_attendance": True,
                "view_projects": True,
                "use_inventory": True
            }
        )

        db.add(student_role)
        db.commit()
        db.refresh(student_role)

        print("✓ Student role created successfully!")
        print(f"  Role ID: {student_role.id}")
        print(f"  Permissions: {student_role.permissions}")
        print("\nYou can now assign users to the 'student' role.")

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_student_role()

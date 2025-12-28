"""
Seed script to populate the database with initial data.

This script creates:
1. Three default roles (super_admin, manager, employee)
2. A default super admin user

Run this after running migrations.
"""

from app.database import SessionLocal
from app.models.user import User, Role
from app.core.security import get_password_hash


def seed_database():
    """Seed the database with initial data."""
    db = SessionLocal()

    try:
        # Check if roles already exist
        existing_roles = db.query(Role).count()
        if existing_roles > 0:
            print("Roles already exist, skipping role creation...")
        else:
            # Create roles
            roles_data = [
                {
                    "name": "super_admin",
                    "permissions": {"all": True}
                },
                {
                    "name": "manager",
                    "permissions": {
                        "view_team": True,
                        "approve_timesheet": True,
                        "manage_projects": True,
                        "manage_inventory": True
                    }
                },
                {
                    "name": "employee",
                    "permissions": {
                        "view_own": True,
                        "mark_attendance": True,
                        "view_projects": True,
                        "use_inventory": True
                    }
                },
                {
                    "name": "student",
                    "permissions": {
                        "view_own": True,
                        "mark_attendance": True,
                        "view_projects": True,
                        "use_inventory": True
                    }
                }
            ]

            for role_data in roles_data:
                role = Role(**role_data)
                db.add(role)

            db.commit()
            print("✓ Roles created successfully")

        # Check if admin user already exists
        admin_email = "admin@example.com"
        existing_admin = db.query(User).filter(User.email == admin_email).first()

        if existing_admin:
            print(f"Admin user already exists: {admin_email}")
        else:
            # Get super_admin role
            super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()

            if not super_admin_role:
                print("ERROR: super_admin role not found!")
                return

            # Create admin user
            admin = User(
                email=admin_email,
                password_hash=get_password_hash("admin123"),
                full_name="Admin User",
                role_id=super_admin_role.id,
                is_active=True
            )

            db.add(admin)
            db.commit()
            print(f"✓ Admin user created successfully")
            print(f"  Email: {admin_email}")
            print(f"  Password: admin123")
            print(f"  IMPORTANT: Change this password in production!")

        print("\n✓ Database seeded successfully!")

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

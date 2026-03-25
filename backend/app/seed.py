"""
Veritabani seed script: Roller ve varsayilan admin kullanicisi olusturur.
Kullanim: cd backend && python -m app.seed
"""
from app.database import SessionLocal
from app.models import Role, User, AccountStatus
from app.core.security import hash_password

ROLES = ["member", "content_manager", "admin"]


def seed_roles(db):
    for role_name in ROLES:
        if not db.query(Role).filter(Role.role_name == role_name).first():
            db.add(Role(role_name=role_name))
    db.commit()
    print(f"Roller olusturuldu: {ROLES}")


def seed_admin(db):
    admin_role = db.query(Role).filter(Role.role_name == "admin").first()
    if not admin_role:
        print("Admin rolu bulunamadi. Once rolleri olusturun.")
        return

    admin_email = "admin@animeplatform.com"
    if db.query(User).filter(User.email == admin_email).first():
        print("Admin kullanicisi zaten mevcut.")
        return

    admin = User(
        name="Admin",
        surname="User",
        email=admin_email,
        password_hash=hash_password("admin123456"),
        role_id=admin_role.role_id,
        account_status=AccountStatus.active,
    )
    db.add(admin)
    db.commit()
    print(f"Admin kullanicisi olusturuldu: {admin_email}")


def main():
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_admin(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()

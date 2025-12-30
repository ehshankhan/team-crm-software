#!/usr/bin/env python3
"""Generate password hash for admin user."""

import bcrypt

if __name__ == "__main__":
    password = "admin123"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    hashed_str = hashed.decode('utf-8')

    print(f"\nPassword: {password}")
    print(f"Hash: {hashed_str}\n")
    print("Copy the hash above and update it in Supabase users table (password_hash column)")

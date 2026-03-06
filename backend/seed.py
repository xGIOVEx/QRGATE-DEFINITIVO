import asyncio
import os
import sys
from server import get_db
import bcrypt

async def seed_db():
    db = get_db()
    
    # Check if already seeded
    user_count = await db.users.count_documents({})
    if user_count > 0:
        print("Database already seeded.")
        return

    print("Seeding database...")
    
    # 1. Create a User (Admin)
    password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    owner = {
        "email": "admin@qrgates.com",
        "password": password_hash,
        "first_name": "Admin",
        "last_name": "User",
        "role": "owner",
        "status": "active"
    }
    user_result = await db.users.insert_one(owner)
    user_id = user_result.inserted_id
    
    # 1b. Create Demo User
    demo_password_hash = bcrypt.hashpw("Demo1234!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    demo_user = {
        "email": "demo@qrgate.com",
        "password": demo_password_hash,
        "first_name": "Demo",
        "last_name": "User",
        "role": "admin",
        "status": "active"
    }
    await db.users.insert_one(demo_user)
    
    # 2. Create a Venue
    venue = {
        "name": "Museo Test",
        "slug": "museo-test",
        "owner_id": str(user_id),
        "status": "active",
        "settings": {
            "currency": "EUR",
            "timezone": "Europe/Rome"
        }
    }
    venue_result = await db.venues.insert_one(venue)
    venue_id = venue_result.inserted_id
    
    # 3. Create a Ticket Type
    ticket = {
        "venue_id": str(venue_id),
        "name": "Ingresso Intero",
        "description": "Biglietto di ingresso standard per il museo",
        "price": 1000, # 10.00 EUR in cents
        "type": "standard",
        "status": "active"
    }
    await db.tickets.insert_one(ticket)
    
    print(f"Seed complete!")
    print(f"Login with email: admin@qrgates.com")
    print(f"Password: admin123")

if __name__ == "__main__":
    if os.environ.get('MONGO_URL', 'mock') != 'mock':
        print("Warning: MONGO_URL is not 'mock'. This script is intended for the in-memory mock database.")
        response = input("Do you really want to seed? (y/N) ")
        if response.lower() != 'y':
            sys.exit(0)
            
    asyncio.run(seed_db())

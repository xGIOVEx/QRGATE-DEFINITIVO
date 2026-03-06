import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import random
import qrcode
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

VENUES_DATA = [
    {
        "slug": "museo-civico-brescia",
        "name": "Museo Civico di Brescia",
        "description": "Il principale museo storico della città di Brescia, custode di reperti romani, medievali e rinascimentali.",
        "description_en": "The main historical museum of Brescia, home to Roman, medieval and Renaissance artifacts.",
        "address": "Via dei Musei 81/b, 25121 Brescia BS",
        "opening_hours": "Mar-Dom 10:00-17:00, Lunedì chiuso",
        "opening_hours_en": "Tue-Sun 10:00-17:00, Monday closed",
        "admin_email": "demo@qrgate.com",
        "admin_password": "Demo1234!",
        "stripe_onboarded": True,
        "fee_mode": "included",
        "donation_enabled": True,
        "tickets": [
            {"name": "Biglietto Intero", "description": "Ingresso standard", "price": 800, "type": "standard"},
            {"name": "Biglietto Ridotto", "description": "Under 18, Over 65", "price": 500, "type": "reduced"},
        ]
    },
    {
        "slug": "duomo-milano",
        "name": "Duomo di Milano",
        "description": "Il simbolo di Milano. Visita la cattedrale gotica più grande d'Italia e sali sul tetto per una vista mozzafiato.",
        "description_en": "Milan's iconic cathedral. Visit Italy's largest Gothic cathedral and climb to the roof for breathtaking views.",
        "address": "Piazza del Duomo, 20122 Milano MI",
        "opening_hours": "Lun-Dom 8:00-19:00",
        "opening_hours_en": "Mon-Sun 8:00-19:00",
        "admin_email": "duomo@qrgate.com",
        "admin_password": "Demo1234!",
        "stripe_onboarded": True,
        "fee_mode": "included",
        "donation_enabled": True,
        "tickets": [
            {"name": "Accesso Cattedrale", "description": "Ingresso base alla cattedrale", "price": 600, "type": "standard"},
            {"name": "Terrazza + Cattedrale", "description": "Accesso alle terrazze panoramiche", "price": 1400, "type": "premium"},
            {"name": "Ridotto Under 14", "description": "Per bambini sotto i 14 anni", "price": 300, "type": "reduced"},
        ]
    },
    {
        "slug": "gallerie-uffizi",
        "name": "Gallerie degli Uffizi",
        "description": "Uno dei musei d'arte più importanti del mondo, con opere di Botticelli, Leonardo e Michelangelo.",
        "description_en": "One of the most important art museums in the world, with works by Botticelli, Leonardo and Michelangelo.",
        "address": "Piazzale degli Uffizi, 6, 50122 Firenze FI",
        "opening_hours": "Mar-Dom 8:15-18:50, Lunedì chiuso",
        "opening_hours_en": "Tue-Sun 8:15-18:50, Monday closed",
        "admin_email": "uffizi@qrgate.com",
        "admin_password": "Demo1234!",
        "stripe_onboarded": True,
        "fee_mode": "separate",
        "donation_enabled": False,
        "tickets": [
            {"name": "Biglietto Standard", "description": "Accesso completo alle gallerie", "price": 2500, "type": "standard"},
            {"name": "Ridotto 18-25 anni", "description": "Per cittadini UE 18-25 anni", "price": 1200, "type": "reduced"},
        ]
    },
    {
        "slug": "colosseo-roma",
        "name": "Colosseo",
        "description": "Il più grande anfiteatro del mondo antico. Visita l'arena, l'ipogeo e il Foro Romano.",
        "description_en": "The largest amphitheater of the ancient world. Visit the arena, hypogeum and Roman Forum.",
        "address": "Piazza del Colosseo, 1, 00184 Roma RM",
        "opening_hours": "Tutti i giorni 9:00-19:00",
        "opening_hours_en": "Every day 9:00-19:00",
        "admin_email": "colosseo@qrgate.com",
        "admin_password": "Demo1234!",
        "stripe_onboarded": False,
        "fee_mode": "included",
        "donation_enabled": False,
        "tickets": [
            {"name": "Ingresso Standard", "description": "Colosseo + Foro Romano + Palatino", "price": 1800, "type": "standard"},
        ]
    },
    {
        "slug": "terme-caracalla-roma",
        "name": "Terme di Caracalla",
        "description": "Uno dei più grandi e meglio conservati complessi termali dell'antichità romana. Ingresso a fascia oraria.",
        "description_en": "One of the largest and best preserved thermal complexes of Roman antiquity. Timed entry.",
        "address": "Viale delle Terme di Caracalla, 00153 Roma RM",
        "opening_hours": "Mar-Dom 9:00-18:00",
        "opening_hours_en": "Tue-Sun 9:00-18:00",
        "admin_email": "terme@qrgate.com",
        "admin_password": "Demo1234!",
        "stripe_onboarded": True,
        "fee_mode": "included",
        "donation_enabled": True,
        "timed_entry": True,
        "tickets": [
            {
                "name": "Ingresso Mattina", 
                "description": "Fasce 09:00-12:00", 
                "price": 1500, 
                "type": "standard",
                "timed_entry": True,
                "slot_duration_minutes": 60,
                "slots": [
                    {"time": "09:00", "capacity": 50, "days_available": ["all"]},
                    {"time": "10:00", "capacity": 50, "days_available": ["all"]},
                    {"time": "11:00", "capacity": 50, "days_available": ["all"]},
                ]
            },
            {
                "name": "Ingresso Pomeriggio", 
                "description": "Fasce 14:00-17:00", 
                "price": 1200, 
                "type": "standard",
                "timed_entry": True,
                "slot_duration_minutes": 60,
                "slots": [
                    {"time": "14:00", "capacity": 50, "days_available": ["all"]},
                    {"time": "15:00", "capacity": 50, "days_available": ["all"]},
                    {"time": "16:00", "capacity": 50, "days_available": ["all"]},
                ]
            },
            {"name": "Ridotto Under 18", "description": "Per minori di 18 anni", "price": 800, "type": "reduced"},
        ]
    },
]

async def seed_database():
    print("\n" + "="*60)
    print("QRGate Database Seeding")
    print("="*60)
    
    print("\n🗑️  Clearing existing data...")
    await db.users.delete_many({})
    await db.venues.delete_many({})
    await db.tickets.delete_many({})
    await db.orders.delete_many({})
    await db.scans.delete_many({})
    await db.staff.delete_many({})
    await db.slot_bookings.delete_many({})
    await db.waitlist.delete_many({})
    await db.promo_codes.delete_many({})
    print("   ✓ Cleared")
    
    # Create superadmin
    print("\n👑 Creating superadmin...")
    superadmin_id = str(uuid.uuid4())
    superadmin_doc = {
        "id": superadmin_id,
        "email": "admin@qrgate.com",
        "password_hash": hash_password("Admin1234!"),
        "venue_id": "platform",
        "role": "superadmin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(superadmin_doc)
    print(f"   ✓ Superadmin: admin@qrgate.com")
    
    all_order_ids = []
    
    for venue_data in VENUES_DATA:
        print(f"\n🏛️  Creating venue: {venue_data['name']}...")
        venue_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        user_doc = {
            "id": user_id, "email": venue_data["admin_email"],
            "password_hash": hash_password(venue_data["admin_password"]),
            "venue_id": venue_id, "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        
        venue_doc = {
            "id": venue_id, "name": venue_data["name"], "slug": venue_data["slug"],
            "description": venue_data["description"], "description_en": venue_data["description_en"],
            "address": venue_data["address"], "opening_hours": venue_data["opening_hours"],
            "opening_hours_en": venue_data["opening_hours_en"],
            "logo_url": None, "cover_url": None, "website_url": None,
            "stripe_account_id": f"acct_mock_{str(uuid.uuid4())[:8]}" if venue_data["stripe_onboarded"] else None,
            "stripe_onboarded": venue_data["stripe_onboarded"],
            "iban": "IT60X0542811101000000123456", "fee_mode": venue_data["fee_mode"],
            "donation_enabled": venue_data["donation_enabled"],
            "donation_amounts": [2, 5, 10], "donation_show_transaction_cost": True,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 180))).isoformat()
        }
        await db.venues.insert_one(venue_doc)
        print(f"   ✓ Venue created (/{venue_data['slug']})")
        
        # Create tickets
        ticket_ids = []
        ticket_objects = []
        for tdata in venue_data["tickets"]:
            ticket_id = str(uuid.uuid4())
            ticket_doc = {
                "id": ticket_id, "venue_id": venue_id, "name": tdata["name"],
                "description": tdata["description"], "price": tdata["price"],
                "type": tdata["type"], "active": True,
                "timed_entry": tdata.get("timed_entry", False),
                "slot_duration_minutes": tdata.get("slot_duration_minutes", 60),
                "slots": tdata.get("slots", []),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.tickets.insert_one(ticket_doc)
            ticket_ids.append(ticket_id)
            ticket_objects.append(ticket_doc)
        print(f"   ✓ {len(ticket_ids)} ticket types created")
        
        # Create staff
        staff_id = str(uuid.uuid4())
        staff_email = f"staff@{venue_data['slug'].replace('-', '')}.it"
        if venue_data["slug"] == "museo-civico-brescia":
            staff_email = "staff@qrgate.com"
        staff_doc = {
            "id": staff_id, "venue_id": venue_id, "email": staff_email,
            "password_hash": hash_password("Staff1234!"),
            "role": "scanner", "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.staff.insert_one(staff_doc)
        
        # Create orders only for active venues
        if not venue_data["stripe_onboarded"]:
            continue
        
        num_orders = random.randint(25, 50)
        countries = [("IT", 55), ("DE", 15), ("US", 10), ("FR", 8), ("GB", 7), ("ES", 3), ("NL", 2)]
        country_list = []
        for country, weight in countries:
            country_list.extend([country] * weight)
        
        channels = ["entrance"] * 60 + ["online"] * 40
        statuses = ["paid"] * 95 + ["refunded"] * 5
        emails = [f"visitor{i}@example.com" for i in range(50)]
        
        order_ids = []
        for i in range(num_orders):
            days_ago = random.randint(0, 60)
            hour = random.choice([9, 10, 10, 11, 11, 12, 14, 14, 15, 15, 16, 17])
            created_at = (datetime.now(timezone.utc) - timedelta(days=days_ago, hours=24 - hour)).isoformat()
            
            ticket_obj = random.choice(ticket_objects)
            quantity = random.choices([1, 2, 3], weights=[70, 25, 5])[0]
            ticket_amount = ticket_obj['price'] * quantity
            
            qr_token = str(uuid.uuid4())
            qr_base64 = generate_qr_code(qr_token)
            order_id = str(uuid.uuid4())
            order_ids.append(order_id)
            all_order_ids.append(order_id)
            
            order = {
                "id": order_id, "venue_id": venue_id, "ticket_id": ticket_obj['id'],
                "quantity": quantity, "ticket_amount": ticket_amount, "fee_amount": 0,
                "donation_amount": random.choice([0, 0, 0, 0, 200, 500, 1000]),
                "qr_token": qr_token, "qr_base64": qr_base64,
                "visitor_email": random.choice(emails),
                "stripe_payment_id": f"pi_{uuid.uuid4().hex[:24]}",
                "stripe_payment_status": random.choice(statuses),
                "country_estimate": random.choice(country_list),
                "channel": random.choice(channels), "created_at": created_at
            }
            await db.orders.insert_one(order)
        
        # Create scans for ~83% of orders
        scan_count = 0
        orders_to_scan = random.sample(order_ids, int(len(order_ids) * 0.83))
        for order_id in orders_to_scan:
            order = await db.orders.find_one({"id": order_id})
            if not order:
                continue
            created_dt = datetime.fromisoformat(order['created_at'])
            scan_dt = created_dt + timedelta(minutes=random.randint(5, 120))
            await db.scans.insert_one({
                "id": str(uuid.uuid4()), "order_id": order_id,
                "staff_id": staff_id, "scanned_at": scan_dt.isoformat(), "result": "valid"
            })
            scan_count += 1
        
        print(f"   ✓ {num_orders} orders, {scan_count} scans created")
    
    print("\n" + "="*60)
    print("✅ Database seeded successfully!")
    print("="*60)
    print("\n📝 Demo Credentials:")
    print("   🔑 Superadmin: admin@qrgate.com / Admin1234!")
    print("   🏛️  Demo Venue: demo@qrgate.com / Demo1234!")
    print("   👷 Demo Staff: staff@qrgate.com / Staff1234!")
    print("\n🔗 Demo Venues:")
    for v in VENUES_DATA:
        print(f"   /{v['slug']} — {v['name']}")
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(seed_database())

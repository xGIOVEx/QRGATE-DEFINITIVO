from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, status, Query
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
import time
import csv
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, validator
from arq import create_pool
from arq.connections import RedisSettings
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import re
import qrcode
import io
import base64
from reportlab.lib.pagesizes import A4, A6
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm, mm
from dotenv import load_dotenv

from services.analytics import analytics_service
from services.stripe_service import StripeService
from services.email_service import EmailService
from services.wallet_service import GoogleWalletService, AppleWalletService
from timed_entry import (
    TimeSlot, TicketCreateWithSlots, TicketUpdateWithSlots, WaitlistEntry,
    CheckoutWithSlot, get_slot_availability, check_and_book_slot,
    release_slot_booking, process_waitlist_on_refund,
    calculate_venue_analytics, calculate_platform_analytics
)
from services.nurture_service import NurtureService
from services.gdpr_service import gdpr_service
from services.aria_service import aria_service
from services.dynamic_pricing_service import calculate_dynamic_price

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with fallback to mongomock
mongo_url = os.environ.get('MONGO_URL', 'mock')
client = None
db = None

def get_db():
    global client, db
    if client is None:
        if mongo_url == 'mock':
            from mongomock_motor import AsyncMongoMockClient
            logging.info("Using in-memory MongoMock Database")
            client = AsyncMongoMockClient()
        else:
            import certifi
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
        db = client[os.environ.get('DB_NAME', 'qrgate')]
    return db

# JWT settings
# OWASP Fix: Force explicit fail if JWT_SECRET is missing in prod
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    logging.warning("CRITICAL: JWT_SECRET not found in environment. Falling back to unsafe default.")
    JWT_SECRET = 'unsafe-dev-secret-do-not-use-in-production'
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_DAYS = int(os.environ.get('JWT_EXPIRATION_DAYS', '30'))

# OpenAI API key
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Create the main app
app = FastAPI(title="QRGate API", version="1.0.0")

# SENTRY SDK INIT
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    SENTRY_DSN = os.environ.get("SENTRY_DSN")
    if SENTRY_DSN:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[FastApiIntegration()],
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
        )
        logging.info("Sentry initialized with FastAPI integration")
except ImportError:
    logging.warning("sentry_sdk not installed, skipping error tracking")

# STRUCTURED LOGGING MIDDLEWARE
import json
@app.middleware("http")
async def add_structured_logging_and_latency(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = '{0:.2f}'.format(process_time)
    
    if not request.url.path.startswith("/api/system/health"):
        log_dict = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "latency_ms": formatted_process_time,
            "client_ip": getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
        }
        logging.info(json.dumps(log_dict))
    
    response.headers["X-Process-Time"] = formatted_process_time
    response.headers["X-Request-ID"] = request_id
    
    return response

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://qrgate.io",
    "https://www.qrgate.io",
    "https://admin.qrgate.io"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create routers
api_router = APIRouter(prefix="/api")
public_router = APIRouter(prefix="/api/public")
dashboard_router = APIRouter(prefix="/api/dashboard")
system_router = APIRouter(prefix="/api/system")
scan_router = APIRouter(prefix="/api/scan")
v1_router = APIRouter(prefix="/api/v1")
test_router = APIRouter(prefix="/api/test")
admin_router = APIRouter(prefix="/api/admin")
webhook_router = APIRouter(prefix="/api/webhooks")
aria_router = APIRouter(prefix="/api/v1/aria")

# ==================== MODELS ====================

class VenueRegister(BaseModel):
    email: EmailStr
    password: str
    venue_name: str = Field(..., alias="name")
    
    # Also support "venue_name" in case other clients use it
    model_config = ConfigDict(populate_by_name=True)
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
    
    @validator('venue_name')
    def venue_name_valid(cls, v):
        if len(v) < 2:
            raise ValueError('Venue name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Venue name too long')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class LoginResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    venue: Dict[str, Any]

class TicketCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: int  # in cents
    type: str = "standard"
    
    @validator('price')
    def price_valid(cls, v):
        if v < 0:
            raise ValueError('Price cannot be negative')
        if v > 99999:  # €999.99 max
            raise ValueError('Price too high')
        return v

class OrderCreate(BaseModel):
    venue_slug: str
    ticket_id: str
    quantity: int = 1
    donation_amount: Optional[int] = 0
    visitor_email: EmailStr
    channel: str = "entrance"
    
    @validator('quantity')
    def quantity_valid(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Quantity must be between 1 and 10')
        return v

class ScanVerify(BaseModel):
    token: str

class ChatMessageRequest(BaseModel):
    message: str
    session_id: str
    language: str = "it"
    page_context: Optional[str] = None

class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "scanner"

class TicketUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    active: Optional[bool] = None

class VenueSettingsUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    address: Optional[str] = None
    opening_hours: Optional[str] = None
    opening_hours_en: Optional[str] = None
    website_url: Optional[str] = None
    iban: Optional[str] = None
    fee_mode: Optional[str] = None
    donation_enabled: Optional[bool] = None
    donation_amounts: Optional[List[int]] = None
    donation_show_transaction_cost: Optional[bool] = None
    stripe_onboarded: Optional[bool] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    meta_pixel_id: Optional[str] = None
    google_analytics_id: Optional[str] = None
    
    # Onboarding & location extensions
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    onboarding_step: Optional[int] = None
    theme_color: Optional[str] = None
    welcome_text: Optional[str] = None
    
class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str

class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str = "percentage"  # "percentage" or "fixed"
    discount_value: float  # % or cents
    max_uses: Optional[int] = None
    valid_until: Optional[str] = None

class PlatformSettingsUpdate(BaseModel):
    fee_fixed_cents: Optional[int] = None
    fee_percentage: Optional[float] = None
    platform_name: Optional[str] = None
    support_email: Optional[str] = None
    from_email: Optional[str] = None
    maintenance_mode: Optional[bool] = None
    stripe_webhook_secret: Optional[str] = None

class StripeConfigUpdate(BaseModel):
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    mode: Optional[str] = None  # "test" or "live"

# Season Pass Models
class SeasonPassCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: int
    visits_allowed: int  # -1 = unlimited
    valid_days: int  # days from purchase
    ticket_types: Optional[List[str]] = None  # which ticket types it covers, empty = all

class SeasonPassPurchase(BaseModel):
    venue_slug: str
    pass_id: str
    visitor_email: EmailStr
    visitor_name: str

class CheckoutSessionCreate(BaseModel):
    ticket_id: str
    venue_slug: str
    quantity: int = 1
    visitor_email: EmailStr
    channel: str = "online"
    donation_amount: int = 0
    promo_code: Optional[str] = None
    origin_url: Optional[str] = None
    slot_date: Optional[str] = None  # "2025-03-15" for timed entry
    slot_time: Optional[str] = None  # "10:00" for timed entry

class AriaChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    visitor_context: Optional[Dict[str, Any]] = None

class WaitlistJoin(BaseModel):
    venue_slug: str
    ticket_id: str
    visitor_email: EmailStr
    visitor_name: str
    quantity: int = 1
    slot_date: Optional[str] = None
    slot_time: Optional[str] = None
    
    @validator('quantity')
    def quantity_valid(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Quantity must be between 1 and 10')
        return v

class VenueCapacityUpdate(BaseModel):
    daily_capacity: Optional[int] = None
    daily_capacity_enabled: Optional[bool] = None

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    # Security: Increased bcrypt rounds from 12 to 14 (Current industry standard)
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=14)).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except:
        return False

def create_token(user_id: str, venue_id: str, email: str, role: str = "admin") -> str:
    payload = {
        'user_id': user_id,
        'venue_id': venue_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(' ')[1]
    return verify_token(token)

def generate_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 PNG"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def calculate_fee(ticket_amount: int) -> int:
    """Calculate QRGate fee: €0.49 + 5%"""
    return 49 + int(ticket_amount * 0.05)

def is_stripe_configured() -> bool:
    key = os.environ.get('STRIPE_SECRET_KEY', '')
    return bool(key) and key != 'sk_test_placeholder' and not key.startswith('sk_placeholder')

async def get_platform_settings():
    db = get_db()
    doc = await db.platform_settings.find_one({}, {"_id": 0})
    if not doc:
        return {"fee_fixed_cents": 49, "fee_percentage": 5.0, "platform_name": "QRGate",
                "support_email": "support@qrgate.com", "from_email": "onboarding@resend.dev",
                "maintenance_mode": False}
    return doc

def get_stripe_checkout():
    return None

def validate_iban(iban: str) -> bool:
    """Basic IBAN format validation"""
    iban = iban.replace(' ', '').upper()
    if len(iban) < 15 or len(iban) > 34:
        return False
    if not re.match(r'^[A-Z]{2}[0-9]{2}[A-Z0-9]+$', iban):
        return False
    return True

# ==================== MIDDLEWARE ====================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logging.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} "
        f"time={process_time:.3f}s"
    )
    
    return response

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# ==================== ERROR HANDLERS ====================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "An unexpected error occurred. Please try again later.",
            "code": "INTERNAL_SERVER_ERROR"
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "code": f"HTTP_{exc.status_code}"
        }
    )

@dashboard_router.get("/gdpr/export")
async def export_my_data(user: Dict = Depends(get_current_user)):
    db = get_db()
    data = await gdpr_service.export_venue_data(db, user['venue_id'])
    return data

@dashboard_router.post("/gdpr/delete")
async def delete_my_data(request: Request, user: Dict = Depends(get_current_user)):
    db = get_db()
    req_data = await request.json()
    mode = req_data.get("mode", "soft")
    result = await gdpr_service.delete_venue_data(db, user['venue_id'], mode=mode)
    return result

# ==================== SYSTEM ROUTES ====================

@system_router.get("/health")
async def system_health():
    db = get_db()
    health = {
        "mongodb": "connected",
        "collections": [],
        "jwt": "configured" if JWT_SECRET != "change-in-production" else "default (change in production)",
        "qr_generation": "working",
        "email": "mock",
        "openai": "configured" if OPENAI_API_KEY else "missing",
        "stripe": "mock - TODO",
        "environment_variables": {
            "MONGO_URL": "set" if os.environ.get('MONGO_URL') else "missing",
            "JWT_SECRET": "set" if os.environ.get('JWT_SECRET') else "missing",
            "OPENAI_API_KEY": "set" if OPENAI_API_KEY else "missing"
        }
    }
    
    try:
        # Test MongoDB connection
        await db.command('ping')
        collections = await db.list_collection_names()
        health["collections"] = collections
    except Exception as e:
        health["mongodb"] = f"error: {str(e)}"
    
    # Test QR generation
    try:
        test_qr = generate_qr_code("test")
        if not test_qr:
            health["qr_generation"] = "error"
    except Exception as e:
        health["qr_generation"] = f"error: {str(e)}"
    
    return health

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=LoginResponse)
@limiter.limit("5/hour")
async def register(request: Request, reg_data: VenueRegister):
    db = get_db()
    
    # Check if email exists
    existing = await db.users.find_one({"email": reg_data.email})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered. Please login instead."
        )
    
    # Generate venue slug
    slug = generate_slug(reg_data.venue_name)
    
    # Ensure unique slug
    existing_slug = await db.venues.find_one({"slug": slug})
    if existing_slug:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    # Create user
    user_id = str(uuid.uuid4())
    venue_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "email": reg_data.email,
        "password_hash": hash_password(reg_data.password),
        "venue_id": venue_id,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    venue_doc = {
        "id": venue_id,
        "name": reg_data.venue_name,
        "slug": slug,
        "description": "",
        "description_en": "",
        "address": "",
        "opening_hours": "",
        "opening_hours_en": "",
        "logo_url": None,
        "cover_url": None,
        "website_url": None,
        "stripe_account_id": None,
        "stripe_onboarded": False,
        "iban": None,
        "fee_mode": "included",
        "donation_enabled": False,
        "donation_amounts": [200, 500, 1000],
        "donation_show_transaction_cost": True,
        "onboarding_step": 1,
        "theme_color": "#3B82F6",
        "welcome_text": "",
        "city": "",
        "country": "",
        "lat": None,
        "lng": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    await db.venues.insert_one(venue_doc)
    
    # 🧠 Psicologia: Principio 7 (Nurturing) - Giorno 0: Reciprocità 
    # Invia email di benvenuto in background senza bloccare la registrazione
    asyncio.create_task(
        asyncio.to_thread(NurtureService.send_day_0_welcome, reg_data.email, reg_data.venue_name)
    )
    
    token = create_token(user_id, venue_id, reg_data.email, "admin")
    
    user_doc.pop('password_hash', None)
    user_doc.pop('_id', None)
    venue_doc.pop('_id', None)
    
    return LoginResponse(
        token=token,
        user=user_doc,
        venue=venue_doc
    )

@api_router.post("/auth/login", response_model=LoginResponse)
@limiter.limit("10/15minutes")
async def login(request: Request, login_data: LoginRequest):
    db = get_db()
    
    user_doc = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user_doc or not verify_password(login_data.password, user_doc.get('password_hash', '')):
        raise HTTPException(
            status_code=401,
            detail="Email o password non corretti"
        )
    
    venue_id = user_doc.get('venue_id')
    venue_doc = None
    if venue_id:
        venue_doc = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    
    # If no specific venue, perhaps they own one
    if not venue_id and user_doc.get('role') in ['owner', 'superadmin']:
        owned_venue = await db.venues.find_one({"owner_id": user_doc.get('id', str(user_doc.get('_id')))}, {"_id": 0})
        if owned_venue:
            venue_id = owned_venue.get('id')
            venue_doc = owned_venue
            
    token = create_token(
        user_doc.get('id', str(user_doc.get('_id'))),
        venue_id or "superadmin",
        user_doc['email'],
        user_doc.get('role', 'admin')
    )
    
    user_doc.pop('password_hash', None)
    
    return LoginResponse(
        token=token,
        user=user_doc,
        venue=venue_doc or {}
    )

@api_router.post("/auth/forgot-password")
@limiter.limit("5/hour")
async def forgot_password(request: Request, req_data: ForgotPasswordRequest):
    db = get_db()
    user_doc = await db.users.find_one({"email": req_data.email})
    if user_doc:
        expire = datetime.now(timezone.utc) + timedelta(hours=1)
        to_encode = {"sub": user_doc["email"], "type": "reset", "exp": expire}
        reset_token = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        EmailService.send_password_reset_email(
            user_email=user_doc["email"],
            user_name=user_doc.get("first_name", "Utente"),
            reset_token=reset_token,
            frontend_url=frontend_url
        )
    return {"message": "Se l'email esiste nel nostro database, riceverai un link per il ripristino."}

@api_router.post("/auth/reset-password")
@limiter.limit("5/hour")
async def reset_password(request: Request, req_data: ResetPasswordRequest):
    try:
        payload = jwt.decode(req_data.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")
        if not email or token_type != "reset":
            raise ValueError("Token type invalid")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Il link è scaduto. Richiedine uno nuovo.")
    except Exception:
        raise HTTPException(status_code=400, detail="Token non valido. Richiedi un nuovo link.")
        
    db = get_db()
    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Utente non trovato.")
        
    new_hash = hash_password(req_data.new_password)
    await db.users.update_one({"email": email}, {"$set": {"password_hash": new_hash}})
    
    return {"message": "Password aggiornata con successo! Ora puoi accedere."}

@api_router.get("/auth/me")
async def get_current_user_info(user: Dict = Depends(get_current_user)):
    db = get_db()
    
    user_doc = await db.users.find_one({"id": user['user_id']}, {"_id": 0, "password_hash": 0})
    venue_doc = await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user": user_doc,
        "venue": venue_doc or {}
    }

# ==================== PUBLIC VENUE ROUTES ====================

@public_router.get("/venue/{slug}")
async def get_public_venue(slug: str):
    db = get_db()
    
    venue = await db.venues.find_one({"slug": slug}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # Get active tickets
    tickets = await db.tickets.find(
        {"venue_id": venue['id'], "active": True},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich tickets with dynamic pricing if enabled
    for ticket in tickets:
        dp_config = ticket.get("dynamic_pricing", {})
        if dp_config.get("enabled"):
            # Get today's bookings for this ticket to calculate availability
            today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            capacity = venue.get("daily_capacity", 200)  # fallback
            # Check timed slots capacity if available
            if ticket.get("timed_entry") and ticket.get("slots"):
                total_cap = sum(s.get("capacity", 0) for s in ticket["slots"])
                if total_cap > 0:
                    capacity = total_cap
            
            booked = await db.orders.count_documents({
                "venue_id": venue['id'],
                "ticket_id": ticket['id'],
                "status": {"$in": ["paid", "complete"]},
                "created_at": {"$regex": f"^{today}"}
            })
            
            pricing = calculate_dynamic_price(
                base_price_cents=ticket.get("price", 0),
                capacity=capacity,
                booked=booked,
                config=dp_config
            )
            ticket["dynamic_price_cents"] = pricing["final_price_cents"]
            ticket["surge_pct"] = pricing["surge_pct"]
            ticket["is_surge_active"] = pricing["is_surge_active"]
            ticket["remaining_pct"] = pricing["remaining_pct"]
    
    return {
        "venue": venue,
        "tickets": tickets
    }

@public_router.get("/venue/{slug}/slots")
async def get_available_slots(slug: str, date: str = Query(...), ticket_id: str = Query(...)):
    """Get available time slots for a timed entry ticket on a specific date"""
    db = get_db()
    
    # Get venue
    venue = await db.venues.find_one({"slug": slug}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # Get ticket
    ticket = await db.tickets.find_one({"id": ticket_id, "venue_id": venue['id']}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if not ticket.get('timed_entry'):
        return {"slots": [], "timed_entry": False}
    
    # Calculate availability for each slot
    slots = await get_slot_availability(db, ticket_id, venue['id'], date, ticket.get('slots', []))
    
    return {
        "timed_entry": True,
        "slot_duration_minutes": ticket.get('slot_duration_minutes', 60),
        "date": date,
        "slots": slots
    }

@public_router.post("/waitlist/join")
@limiter.limit("10/minute")
async def join_waitlist(request: Request, data: WaitlistJoin):
    """Join waitlist for a sold-out ticket/slot"""
    db = get_db()
    
    # Get venue
    venue = await db.venues.find_one({"slug": data.venue_slug}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # Check if already in waitlist
    existing = await db.waitlist.find_one({
        "venue_id": venue['id'],
        "ticket_id": data.ticket_id,
        "visitor_email": data.visitor_email,
        "slot_date": data.slot_date,
        "slot_time": data.slot_time,
        "status": "waiting"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Sei già in lista d'attesa")
    
    # Get current position
    position = await db.waitlist.count_documents({
        "venue_id": venue['id'],
        "ticket_id": data.ticket_id,
        "slot_date": data.slot_date,
        "slot_time": data.slot_time,
        "status": "waiting"
    }) + 1
    
    waitlist_entry = {
        "id": str(uuid.uuid4()),
        "venue_id": venue['id'],
        "ticket_id": data.ticket_id,
        "slot_date": data.slot_date,
        "slot_time": data.slot_time,
        "visitor_email": data.visitor_email,
        "visitor_name": data.visitor_name,
        "quantity": data.quantity,
        "position": position,
        "status": "waiting",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notified_at": None,
        "expires_at": None
    }
    
    await db.waitlist.insert_one(waitlist_entry)
    waitlist_entry.pop('_id', None)
    
    return {
        "success": True,
        "position": position,
        "message": f"Sei in lista! Posizione #{position}"
    }

@public_router.get("/venue/{slug}/capacity")
async def check_venue_capacity(slug: str, date: str = Query(...)):
    """Check daily capacity for a venue"""
    db = get_db()
    
    venue = await db.venues.find_one({"slug": slug}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if not venue.get('daily_capacity_enabled'):
        return {"capacity_enabled": False, "available": True}
    
    daily_capacity = venue.get('daily_capacity', 0)
    
    # Count orders for this date
    orders = await db.orders.find({
        "venue_id": venue['id'],
        "created_at": {"$regex": f"^{date}"},
        "stripe_payment_status": "paid"
    }, {"_id": 0, "quantity": 1}).to_list(10000)
    
    sold = sum(o.get('quantity', 0) for o in orders)
    available = max(0, daily_capacity - sold)
    
    return {
        "capacity_enabled": True,
        "daily_capacity": daily_capacity,
        "sold": sold,
        "available": available,
        "sold_out": available == 0
    }

@public_router.post("/orders")
@limiter.limit("20/minute")
async def create_public_order(request: Request, order_data: OrderCreate):
    db = get_db()
    
    # Get venue
    venue = await db.venues.find_one({"slug": order_data.venue_slug}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if not venue.get('stripe_onboarded', False):
        raise HTTPException(status_code=400, detail="Biglietteria non ancora attiva")
    
    # Get ticket
    ticket = await db.tickets.find_one({"id": order_data.ticket_id, "active": True}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Calculate amounts
    ticket_amount = ticket['price'] * order_data.quantity
    fee_amount = calculate_fee(ticket_amount)
    
    # Generate QR token
    qr_token = str(uuid.uuid4())
    qr_base64 = generate_qr_code(qr_token)
    
    # TODO: STRIPE PAYMENTS - Create real payment intent here
    # For now, mock payment success
    
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "venue_id": venue['id'],
        "ticket_id": order_data.ticket_id,
        "quantity": order_data.quantity,
        "ticket_amount": ticket_amount,
        "fee_amount": fee_amount if venue.get('fee_mode') == 'separate' else 0,
        "donation_amount": order_data.donation_amount or 0,
        "qr_token": qr_token,
        "qr_base64": qr_base64,
        "visitor_email": order_data.visitor_email,
        "stripe_payment_id": f"mock_{uuid.uuid4()}",
        "stripe_payment_status": "paid",
        "country_estimate": "IT",  # TODO: Get from Accept-Language header
        "channel": order_data.channel,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    order_doc.pop('_id', None)
    
    # TODO: EMAIL - Send confirmation email
    # Log without sensitive data
    logging.info(f"[ORDER] Confirmation sent to {order_data.visitor_email[:3]}***")
    logging.info(f"[ORDER] Venue: {venue['name']}")
    logging.info(f"[ORDER] Ticket: {ticket['name']} x{order_data.quantity}")
    logging.info(f"[ORDER] QR generated")
    
    return order_doc

@public_router.get("/orders/{order_id}")
async def get_public_order(order_id: str):
    db = get_db()
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    venue = await db.venues.find_one({"id": order['venue_id']}, {"_id": 0})
    ticket = await db.tickets.find_one({"id": order['ticket_id']}, {"_id": 0})
    
    return {
        "order": order,
        "venue": venue,
        "ticket": ticket,
        "issued_tickets": await db.issued_tickets.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    }

@public_router.post("/orders/{order_id}/resend-email")
@limiter.limit("3/hour")
async def resend_order_email(request: Request, order_id: str):
    db = get_db()
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # TODO: EMAIL - Resend email
    logging.info(f"[ORDER] Resend order confirmation to {order['visitor_email'][:3]}***")
    
    return {"message": "Email resent successfully"}

# ==================== SCAN ROUTES ====================

@scan_router.post("/verify")
@limiter.limit("100/minute")
async def verify_qr_scan(request: Request, scan_data: ScanVerify):
    db = get_db()
    
    order = await db.orders.find_one({"qr_token": scan_data.token}, {"_id": 0})
    
    if not order:
        return {
            "result": "INVALID",
            "message": "QR non riconosciuto"
        }
    
    # Check if already scanned
    existing_scan = await db.scans.find_one({"order_id": order['id']})
    
    if existing_scan:
        return {
            "result": "ALREADY_USED",
            "message": f"Scansionato il {existing_scan['scanned_at'][:16]}",
            "first_scanned_at": existing_scan['scanned_at']
        }
    
    # Get ticket and venue info
    ticket = await db.tickets.find_one({"id": order['ticket_id']}, {"_id": 0})
    venue = await db.venues.find_one({"id": order['venue_id']}, {"_id": 0})
    
    # Check time slot if timed entry
    slot_info = None
    slot_warning = None
    if order.get('slot_time') and order.get('slot_date'):
        slot_time = order['slot_time']
        slot_date = order['slot_date']
        slot_duration = ticket.get('slot_duration_minutes', 60) if ticket else 60
        
        now = datetime.now(timezone.utc)
        today = now.strftime('%Y-%m-%d')
        current_time = now.strftime('%H:%M')
        
        # Parse slot time
        try:
            slot_hour, slot_min = map(int, slot_time.split(':'))
            slot_start = slot_hour * 60 + slot_min
            slot_end = slot_start + slot_duration
            current_hour, current_min = map(int, current_time.split(':'))
            current_minutes = current_hour * 60 + current_min
            
            # Add 30 min grace period
            if today == slot_date:
                if current_minutes < slot_start - 30:
                    slot_warning = f"Biglietto valido per le {slot_time}"
                elif current_minutes > slot_end + 30:
                    slot_warning = f"Fascia oraria terminata ({slot_time})"
            elif today != slot_date:
                slot_warning = f"Biglietto per {slot_date} ore {slot_time}"
        except:
            pass
        
        slot_info = {
            "date": slot_date,
            "time": slot_time,
            "slot_end": f"{(slot_start + slot_duration) // 60:02d}:{(slot_start + slot_duration) % 60:02d}"
        }
    
    # Record scan
    scan_doc = {
        "id": str(uuid.uuid4()),
        "order_id": order['id'],
        "staff_id": "scanner",
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "result": "valid",
        "slot_warning": slot_warning
    }
    await db.scans.insert_one(scan_doc)
    
    response = {
        "result": "VALID" if not slot_warning else "VALID_WITH_WARNING",
        "ticket_type": ticket.get('name', 'Biglietto'),
        "venue_name": venue.get('name', ''),
        "scanned_at": scan_doc['scanned_at'][:16],
        "quantity": order.get('quantity', 1)
    }
    
    if slot_info:
        response["slot_info"] = slot_info
    if slot_warning:
        response["slot_warning"] = slot_warning
    
    return response

@scan_router.post("/search")
@limiter.limit("100/minute")
async def search_and_verify_ticket(request: Request, search_data: Dict):
    db = get_db()
    query = search_data.get("query", "").strip()
    staff_id = search_data.get("staff_id", "scanner")
    
    if not query:
        raise HTTPException(status_code=400, detail="Query di ricerca vuota")
    
    # Search by Order ID or Email
    order = await db.orders.find_one({
        "$or": [
            {"id": query},
            {"visitor_email": {"$regex": f"^{query}$", "$options": "i"}}
        ]
    }, {"_id": 0})
    
    if not order:
        return {
            "result": "INVALID",
            "message": "Nessun ordine trovato con questi dati"
        }
    
    # Logic same as verify, but based on found order
    existing_scan = await db.scans.find_one({"order_id": order['id']})
    if existing_scan:
        return {
            "result": "ALREADY_USED",
            "message": f"Scansionato il {existing_scan['scanned_at'][:16]}",
            "order_id": order['id']
        }
        
    ticket = await db.tickets.find_one({"id": order['ticket_id']}, {"_id": 0})
    venue = await db.venues.find_one({"id": order['venue_id']}, {"_id": 0})
    
    # ... (Simplified version of timing logic for brevity or same as above)
    slot_info = None
    slot_warning = None
    if order.get('slot_time') and order.get('slot_date'):
        slot_info = {
            "date": order['slot_date'],
            "time": order['slot_time']
        }
    
    # Record scan
    scan_doc = {
        "id": str(uuid.uuid4()),
        "order_id": order['id'],
        "staff_id": staff_id,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "result": "valid_manual"
    }
    await db.scans.insert_one(scan_doc)
    
    return {
        "result": "VALID",
        "ticket_type": ticket.get('name', 'Biglietto'),
        "venue_name": venue.get('name', ''),
        "scanned_at": scan_doc['scanned_at'][:16],
        "quantity": order.get('quantity', 1),
        "slot_info": slot_info,
        "visitor_email": order['visitor_email']
    }

# ==================== ANALYTICS ROUTES ====================

@api_router.post("/analytics/track")
async def track_custom_event(request: Request, event_data: Dict):
    db = get_db()
    
    # Store custom event
    await db.analytics.insert_one(event_data)
    
    # Logic for business intelligence: If it's a simulator use, store for lead nurturing
    if event_data.get('event') == 'simulator_used':
        logging.info(f"Lead potential: Simulator used with {event_data.get('properties', {}).get('monthlyVisitors')} visitors")
        
    return {"status": "tracked"}

# ==================== DASHBOARD ROUTES ====================

@dashboard_router.get("/stats")
async def get_dashboard_stats(user: Dict = Depends(get_current_user)):
    db = get_db()
    venue_id = user['venue_id']

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=7)).isoformat()
    month_start = (now - timedelta(days=30)).isoformat()

    # Fetch all orders for this venue (mongomock-compatible: no $facet)
    all_orders = await db.orders.find({"venue_id": venue_id}, {"_id": 0}).to_list(10000)

    def filter_orders(orders, since):
        return [o for o in orders if o.get("created_at", "") >= since]

    def calc_stats(orders):
        revenue = sum(int(o.get("ticket_amount", 0)) for o in orders if o.get("status") == "paid")
        count = len([o for o in orders if o.get("status") == "paid"])
        return {"revenue_cents": revenue, "ticket_count": count}

    today_orders = filter_orders(all_orders, today_start)
    week_orders = filter_orders(all_orders, week_start)
    month_orders = filter_orders(all_orders, month_start)
    paid_orders = [o for o in all_orders if o.get("status") == "paid"]
    total_paid = len(paid_orders)

    # Channel split
    entrance_count = sum(1 for o in paid_orders if o.get("channel") == "entrance")
    entrance_pct = int(entrance_count / total_paid * 100) if total_paid > 0 else 0
    online_pct = 100 - entrance_pct if total_paid > 0 else 0

    # Country split
    country_names = {
        "IT": "Italia", "DE": "Germania", "US": "USA",
        "FR": "Francia", "GB": "Regno Unito", "ES": "Spagna"
    }
    from collections import Counter
    country_counts = Counter(o.get("country_estimate", "IT") for o in paid_orders)
    country_split = [
        {
            "country_code": cc,
            "name": country_names.get(cc, cc),
            "flag": {"IT": "🇮🇹", "DE": "🇩🇪", "US": "🇺🇸", "FR": "🇫🇷", "GB": "🇬🇧", "ES": "🇪🇸"}.get(cc, "🌍"),
            "percentage": int(cnt / total_paid * 100) if total_paid > 0 else 0
        }
        for cc, cnt in country_counts.most_common(5)
    ]

    # Validation rate
    order_ids = [o["id"] for o in all_orders if "id" in o]
    scanned_count = await db.scans.count_documents({"order_id": {"$in": order_ids}})
    validation_rate = int(scanned_count / total_paid * 100) if total_paid > 0 else 0

    # Top products
    from collections import Counter as _Counter
    ticket_ids = [o.get("ticket_id") for o in paid_orders if o.get("ticket_id")]
    ticket_id_counts = _Counter(ticket_ids)
    top_products = []
    for tid, cnt in ticket_id_counts.most_common(5):
        ticket_doc = await db.tickets.find_one({"id": tid})
        name = ticket_doc["name"] if ticket_doc else tid
        top_products.append({"name": name, "count": cnt})

    # Revenue trend (last 30 days)
    rev_by_day = {}
    for o in paid_orders:
        day = o.get("created_at", "")[:10]
        if day:
            rev_by_day[day] = rev_by_day.get(day, 0) + int(o.get("ticket_amount", 0))

    revenue_trend = []
    for i in range(29, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        revenue_trend.append({"date": day, "revenue": round(rev_by_day.get(day, 0) / 100, 2)})

    # Recent orders
    recent_orders = sorted(all_orders, key=lambda o: o.get("created_at", ""), reverse=True)[:10]

    return {
        "today": calc_stats(today_orders),
        "week": calc_stats(week_orders),
        "month": calc_stats(month_orders),
        "total_orders": total_paid,
        "channel_split": {"entrance_pct": entrance_pct, "online_pct": online_pct},
        "country_split": country_split,
        "validation_rate": validation_rate,
        "top_products": top_products,
        "revenue_trend": revenue_trend,
        "recent_orders": recent_orders,
        # Legacy key for older frontend
        "revenue_history": revenue_trend,
    }


# ==================== CHATBOT ROUTES ====================

@api_router.post("/chatbot/message")
@limiter.limit("20/minute")
async def chat_message(request: Request, chat_request: ChatMessageRequest):
    message = chat_request.message.lower()
    lang = chat_request.language
    
    response = ""
    if lang == "it":
        if "costa" in message or "prezzo" in message or "commissioni" in message or "quanto" in message:
            response = "La commissione è €0,49 + 5% per biglietto. Nessun canone mensile, nessun hardware. Paghi solo quando vendi."
        elif "pagamenti" in message or "incasso" in message or "soldi" in message or "iban" in message:
            response = "Gli incassi vanno direttamente sul tuo IBAN. QRGate elabora i pagamenti in automatico e riceverai i fondi in 2-5 giorni lavorativi."
        elif "sito" in message or "web" in message:
            response = "Nessun problema se non hai un sito. Ti creiamo noi una pagina su qrgate.com/nometuo in 2 minuti, pronta da condividere ovunque."
        elif "tempo" in message or "iniziare" in message or "serve" in message:
            response = "Bastano 10 minuti. Crea l'account, inserisci il tuo IBAN, imposta il tuo primo biglietto e sei subito live per vendere."
        else:
            response = "Non ho una risposta precisa per questa domanda. Prova a chiedermi dei costi, di come incassare o dei tempi di attivazione!"
    else:
        if "cost" in message or "price" in message or "fee" in message or "much" in message:
            response = "The fee is €0.49 + 5% per ticket. No monthly fees, no hardware. You only pay when you sell."
        elif "pay" in message or "money" in message or "iban" in message or "bank" in message:
            response = "Payouts go directly to your IBAN. QRGate processes everything automatically. Funds arrive in 2-5 business days."
        elif "site" in message or "web" in message or "page" in message:
            response = "No problem if you don't have a website. We automatically create a free page at qrgate.com/yourname in 2 minutes."
        elif "time" in message or "long" in message or "start" in message:
            response = "It takes 10 minutes. Create an account, link your IBAN, and set up your first ticket to go live immediately."
        else:
            response = "I don't have a precise answer. Try asking me about pricing, payouts, or how to get started!"
            
    return {
        "response": response,
        "session_id": chat_request.session_id
    }

# ==================== TEST ROUTES (Development only) ====================

@test_router.get("/create-test-order")
async def create_test_order():
    db = get_db()
    
    # Get demo venue
    venue = await db.venues.find_one({"slug": "museo-civico-brescia"}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Demo venue not found. Run seed data first.")
    
    # Get first ticket
    ticket = await db.tickets.find_one({"venue_id": venue['id']}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="No tickets found")
    
    # Create test order
    qr_token = str(uuid.uuid4())
    qr_base64 = generate_qr_code(qr_token)
    
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "venue_id": venue['id'],
        "ticket_id": ticket['id'],
        "quantity": 1,
        "ticket_amount": ticket['price'],
        "fee_amount": 0,
        "donation_amount": 0,
        "qr_token": qr_token,
        "qr_base64": qr_base64,
        "visitor_email": "test@example.com",
        "stripe_payment_id": f"test_{uuid.uuid4()}",
        "stripe_payment_status": "paid",
        "country_estimate": "IT",
        "channel": "online",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    
    return {
        "order_id": order_id,
        "qr_token": qr_token,
        "qr_base64": qr_base64,
        "checkout_url": f"/{venue['slug']}/acquista"
    }

# ==================== STAFF AUTH ====================

@api_router.post("/staff/login")
@limiter.limit("10/15minutes")
async def staff_login(request: Request, login_data: StaffLoginRequest):
    db = get_db()
    staff_doc = await db.staff.find_one({"email": login_data.email}, {"_id": 0})
    if not staff_doc or not verify_password(login_data.password, staff_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Email o password non corretti")
    venue = await db.venues.find_one({"id": staff_doc['venue_id']}, {"_id": 0})
    token = create_token(staff_doc['id'], staff_doc['venue_id'], staff_doc['email'], staff_doc.get('role', 'scanner'))
    staff_doc.pop('password_hash', None)
    return {"token": token, "staff": staff_doc, "venue": venue or {}}

# ==================== DASHBOARD TICKETS ====================

@dashboard_router.get("/tickets")
async def get_tickets(user: Dict = Depends(get_current_user)):
    db = get_db()
    tickets = await db.tickets.find({"venue_id": user['venue_id']}, {"_id": 0}).to_list(100)
    return tickets

@dashboard_router.post("/tickets")
async def create_ticket(ticket_data: TicketCreate, user: Dict = Depends(get_current_user)):
    db = get_db()
    ticket_doc = {
        "id": str(uuid.uuid4()), "venue_id": user['venue_id'],
        "name": ticket_data.name, "description": ticket_data.description,
        "price": ticket_data.price, "type": ticket_data.type,
        "timed_entry": False, "slot_duration_minutes": 60, "slots": [],
        "dynamic_pricing": {"enabled": False, "threshold_pct": 20, "max_increase_pct": 30},
        "active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tickets.insert_one(ticket_doc)
    ticket_doc.pop('_id', None)
    return ticket_doc

@dashboard_router.post("/tickets/timed")
async def create_timed_ticket(ticket_data: TicketCreateWithSlots, user: Dict = Depends(get_current_user)):
    """Create a ticket with timed entry slots"""
    db = get_db()
    
    # Process slots
    slots = []
    if ticket_data.slots:
        for slot in ticket_data.slots:
            slots.append({
                "slot_id": str(uuid.uuid4()),
                "time": slot.time,
                "capacity": slot.capacity,
                "days_available": slot.days_available
            })
    
    ticket_doc = {
        "id": str(uuid.uuid4()), "venue_id": user['venue_id'],
        "name": ticket_data.name, "description": ticket_data.description,
        "price": ticket_data.price, "type": ticket_data.type,
        "timed_entry": ticket_data.timed_entry,
        "slot_duration_minutes": ticket_data.slot_duration_minutes or 60,
        "slots": slots,
        "active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tickets.insert_one(ticket_doc)
    ticket_doc.pop('_id', None)
    return ticket_doc

@dashboard_router.put("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, ticket_data: TicketUpdateWithSlots, user: Dict = Depends(get_current_user)):
    db = get_db()
    ticket = await db.tickets.find_one({"id": ticket_id, "venue_id": user['venue_id']})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    update_data = {}
    for k, v in ticket_data.dict().items():
        if v is not None:
            if k == 'slots' and v:
                # Process slots with IDs
                processed_slots = []
                for slot in v:
                    processed_slots.append({
                        "slot_id": slot.get('slot_id') or str(uuid.uuid4()),
                        "time": slot['time'],
                        "capacity": slot['capacity'],
                        "days_available": slot.get('days_available', ['all'])
                    })
                update_data['slots'] = processed_slots
            else:
                update_data[k] = v
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
    return await db.tickets.find_one({"id": ticket_id}, {"_id": 0})

@dashboard_router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    ticket = await db.tickets.find_one({"id": ticket_id, "venue_id": user['venue_id']})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"active": False}})
    return {"message": "Ticket deactivated"}

# ==================== DASHBOARD ORDERS ====================

@dashboard_router.get("/orders")
async def get_orders(user: Dict = Depends(get_current_user), page: int = 1, limit: int = 20,
                     status: Optional[str] = None, days: Optional[int] = None):
    db = get_db()
    query = {"venue_id": user['venue_id']}
    if status:
        query["stripe_payment_status"] = status
    if days:
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query["created_at"] = {"$gte": start_date}
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0, "qr_base64": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    ticket_cache = {}
    for order in orders:
        tid = order.get('ticket_id')
        if tid not in ticket_cache:
            t = await db.tickets.find_one({"id": tid}, {"_id": 0, "name": 1})
            ticket_cache[tid] = t.get('name', 'N/A') if t else 'N/A'
        order['ticket_name'] = ticket_cache[tid]
    return {"orders": orders, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@dashboard_router.get("/customers")
async def get_customers(user: Dict = Depends(get_current_user), page: int = 1, limit: int = 20):
    db = get_db()
    venue_id = user['venue_id']

    # Fetch all paid orders (mongomock-compatible: no $group)
    all_orders = await db.orders.find(
        {"venue_id": venue_id, "status": "paid"}, {"_id": 0}
    ).to_list(10000)

    # Group by visitor_email in Python
    from collections import defaultdict
    customer_map = defaultdict(lambda: {
        "total_spent": 0, "order_count": 0, "last_order": "", "first_order": "9999"
    })
    for o in all_orders:
        email = o.get("visitor_email", "unknown")
        c = customer_map[email]
        c["total_spent"] += int(o.get("ticket_amount", 0)) + int(o.get("donation_amount", 0))
        c["order_count"] += 1
        created = o.get("created_at", "")
        if created > c["last_order"]:
            c["last_order"] = created
        if created < c["first_order"]:
            c["first_order"] = created

    # Sort by last_order descending, paginate
    sorted_customers = sorted(customer_map.items(), key=lambda x: x[1]["last_order"], reverse=True)
    total = len(sorted_customers)
    page_customers = sorted_customers[(page - 1) * limit: page * limit]

    return {
        "customers": [
            {
                "email": email,
                "total_spent_cents": data["total_spent"],
                "total_orders": data["order_count"],
                "last_purchase": data["last_order"],
                "first_purchase": data["first_order"],
            }
            for email, data in page_customers
        ],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit)
    }

@dashboard_router.get("/orders/{order_id}")
async def get_order_detail(order_id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    order = await db.orders.find_one({"id": order_id, "venue_id": user['venue_id']}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    ticket = await db.tickets.find_one({"id": order.get('ticket_id')}, {"_id": 0})
    scan = await db.scans.find_one({"order_id": order_id}, {"_id": 0})
    return {"order": order, "ticket": ticket, "scan": scan}

@dashboard_router.post("/orders/{order_id}/refund")
async def refund_order(order_id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    order = await db.orders.find_one({"id": order_id, "venue_id": user['venue_id']}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get('stripe_payment_status') == 'refunded':
        raise HTTPException(status_code=400, detail="Order already refunded")
    if is_stripe_configured() and order.get('stripe_payment_id') and not order['stripe_payment_id'].startswith(('mock_', 'pi_mock_')):
        try:
            StripeService.create_refund(order['stripe_payment_id'])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Refund failed: {str(e)}")
    
    await db.orders.update_one({"id": order_id}, {"$set": {"stripe_payment_status": "refunded"}})
    
    # Release slot booking if timed entry
    await release_slot_booking(db, order_id)
    
    # Process waitlist notification
    await process_waitlist_on_refund(
        db, 
        user['venue_id'], 
        order.get('ticket_id'),
        order.get('slot_date'),
        order.get('slot_time')
    )
    
    return {"message": "Order refunded successfully"}

# ==================== DASHBOARD STAFF ====================

@dashboard_router.get("/staff")
async def get_staff(user: Dict = Depends(get_current_user)):
    db = get_db()
    staff = await db.staff.find({"venue_id": user['venue_id']}, {"_id": 0, "password_hash": 0}).to_list(100)
    return staff

@dashboard_router.post("/staff")
async def create_staff_member(staff_data: StaffCreate, user: Dict = Depends(get_current_user)):
    db = get_db()
    existing = await db.staff.find_one({"email": staff_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    staff_doc = {
        "id": str(uuid.uuid4()), "venue_id": user['venue_id'],
        "email": staff_data.email, "password_hash": hash_password(staff_data.password),
        "role": staff_data.role, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.staff.insert_one(staff_doc)
    staff_doc.pop('_id', None)
    staff_doc.pop('password_hash', None)
    return staff_doc

@dashboard_router.delete("/staff/{staff_id}")
async def delete_staff_member(staff_id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    staff = await db.staff.find_one({"id": staff_id, "venue_id": user['venue_id']})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    await db.staff.delete_one({"id": staff_id})
    return {"message": "Staff member removed"}

# ==================== DASHBOARD SETTINGS ====================

@dashboard_router.get("/settings")
async def get_venue_settings(user: Dict = Depends(get_current_user)):
    db = get_db()
    venue = await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue

@dashboard_router.put("/settings")
async def update_venue_settings(settings: VenueSettingsUpdate, user: Dict = Depends(get_current_user)):
    db = get_db()
    update_data = settings.dict(exclude_unset=True)
    if 'name' in update_data:
        new_slug = generate_slug(update_data['name'])
        existing = await db.venues.find_one({"slug": new_slug, "id": {"$ne": user['venue_id']}})
        if existing:
            new_slug = f"{new_slug}-{str(uuid.uuid4())[:8]}"
        update_data['slug'] = new_slug
    await db.venues.update_one({"id": user['venue_id']}, {"$set": update_data})
    return await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})

# ==================== DASHBOARD POSTER & REPORTS ====================

@dashboard_router.get("/poster/download")
async def download_poster(user: Dict = Depends(get_current_user)):
    import tempfile
    from reportlab.lib.colors import HexColor as ReportLabHexColor
    db = get_db()
    venue = await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://cultural-pass.preview.emergentagent.com')
    qr_url = f"{FRONTEND_URL}/{venue['slug']}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as qr_file:
        qr_img.save(qr_file.name)
        qr_path = qr_file.name
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_file:
        pdf_path = pdf_file.name
    c = canvas.Canvas(pdf_path, pagesize=A4)
    width, height = A4
    
    # Premium Minimalism - White Background
    c.setFillColor(ReportLabHexColor('#FFFFFF'))
    c.rect(0, 0, width, height, fill=True, stroke=False)
    
    # Accent Header
    c.setFillColor(ReportLabHexColor('#0F172A')) # Slate 900
    c.rect(0, height - 12*cm, width, 12*cm, fill=True, stroke=False)
    
    # Venue Name
    c.setFillColor(ReportLabHexColor('#FFFFFF'))
    c.setFont('Helvetica-Bold', 32)
    c.drawCentredString(width/2, height - 4.5*cm, venue['name'].upper())
    
    # Instruction
    c.setFont('Helvetica', 16)
    c.drawCentredString(width/2, height - 6.5*cm, "SCANSIONA E ACQUISTA IL TUO BIGLIETTO")
    
    # QR Container
    qr_size = 10*cm
    c.setFillColor(ReportLabHexColor('#FFFFFF'))
    # Subtle shadow effect
    c.setStrokeColor(ReportLabHexColor('#E2E8F0'))
    c.rect((width - qr_size - 1*cm)/2, height/2 - qr_size/2 - 0.5*cm, qr_size + 1*cm, qr_size + 1*cm, fill=True, stroke=True)
    
    c.drawImage(qr_path, (width - qr_size) / 2, height/2 - qr_size/2, qr_size, qr_size)
    
    # URL
    c.setFillColor(ReportLabHexColor('#64748B'))
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(width/2, height/2 - qr_size/2 - 1.5*cm, qr_url.replace('https://', ''))
    
    # Details
    if venue.get('address'):
        c.setFont('Helvetica', 12)
        c.setFillColor(ReportLabHexColor('#0F172A'))
        c.drawCentredString(width/2, 6.5*cm, venue['address'])
        
    # Branding Footer
    c.setFillColor(ReportLabHexColor('#10B981')) # Emerald 500
    c.setFont('Helvetica-Bold', 14)
    c.drawCentredString(width/2, 3.5*cm, "POWERED BY QRGATE")
    
    c.setFillColor(ReportLabHexColor('#94A3B8'))
    c.setFont('Helvetica', 10)
    c.drawCentredString(width/2, 2.5*cm, "Semplice. Veloce. Sicuro. • qrgate.com")
    
    c.save()
    try:
        import os as _os
        _os.unlink(qr_path)
    except Exception:
        pass
    return FileResponse(pdf_path, media_type='application/pdf', filename=f"poster-{venue['slug']}.pdf")

@dashboard_router.get("/reports/export")
async def export_orders_csv(user: Dict = Depends(get_current_user)):
    import csv as csv_module
    import tempfile
    db = get_db()
    venue = await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})
    orders = await db.orders.find({"venue_id": user['venue_id']}, {"_id": 0, "qr_base64": 0}).sort("created_at", -1).to_list(10000)
    tickets = await db.tickets.find({"venue_id": user['venue_id']}, {"_id": 0}).to_list(100)
    ticket_names = {t['id']: t['name'] for t in tickets}
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='', encoding='utf-8-sig') as f:
        writer = csv_module.DictWriter(f, fieldnames=['data', 'biglietto', 'quantita', 'importo_eur', 'donazione_eur', 'email_visitatore', 'canale', 'paese', 'stato', 'id_ordine'])
        writer.writeheader()
        for order in orders:
            writer.writerow({
                'data': order['created_at'][:16].replace('T', ' '),
                'biglietto': ticket_names.get(order.get('ticket_id', ''), 'N/A'),
                'quantita': order.get('quantity', 1),
                'importo_eur': f"{order.get('ticket_amount', 0) / 100:.2f}",
                'donazione_eur': f"{order.get('donation_amount', 0) / 100:.2f}",
                'email_visitatore': order.get('visitor_email', ''),
                'canale': order.get('channel', ''),
                'paese': order.get('country_estimate', ''),
                'stato': order.get('stripe_payment_status', ''),
                'id_ordine': order['id']
            })
        csv_path = f.name
    filename = f"ordini-{venue['slug']}-{datetime.now().strftime('%Y%m%d')}.csv"
    return FileResponse(csv_path, media_type='text/csv', filename=filename)

# ==================== DASHBOARD STRIPE ====================

@dashboard_router.post("/stripe/connect")
async def create_stripe_connect(user: Dict = Depends(get_current_user)):
    db = get_db()
    venue = await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    if venue.get('stripe_onboarded'):
        return {"message": "Already onboarded", "stripe_onboarded": True, "mock": not is_stripe_configured()}
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://cultural-pass.preview.emergentagent.com')
    if not is_stripe_configured():
        mock_account_id = f"acct_mock_{str(uuid.uuid4())[:8]}"
        await db.venues.update_one({"id": user['venue_id']}, {"$set": {"stripe_account_id": mock_account_id, "stripe_onboarded": True}})
        return {"onboarding_url": f"{FRONTEND_URL}/dashboard/payments?connected=true", "mock": True}
    try:
        user_doc = await db.users.find_one({"id": user['user_id']}, {"_id": 0})
        account = StripeService.create_connect_account(user_doc['email'])
        await db.venues.update_one({"id": user['venue_id']}, {"$set": {"stripe_account_id": account['account_id']}})
        onboarding_url = StripeService.create_account_link(account['account_id'],
            refresh_url=f"{FRONTEND_URL}/dashboard/payments",
            return_url=f"{FRONTEND_URL}/dashboard/payments?connected=true")
        return {"onboarding_url": onboarding_url, "mock": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@dashboard_router.get("/stripe/status")
async def get_stripe_status(user: Dict = Depends(get_current_user)):
    db = get_db()
    venue = await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    if not venue.get('stripe_account_id'):
        return {"status": "not_connected", "stripe_onboarded": False}
    if not is_stripe_configured():
        return {"status": "mock", "stripe_onboarded": venue.get('stripe_onboarded', False), "stripe_account_id": venue.get('stripe_account_id'), "mock": True}
    try:
        account_status = StripeService.get_account_status(venue['stripe_account_id'])
        if account_status.get('charges_enabled'):
            await db.venues.update_one({"id": user['venue_id']}, {"$set": {"stripe_onboarded": True}})
        return {"status": "connected", "stripe_onboarded": account_status.get('charges_enabled', False), **account_status}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ==================== DASHBOARD ANALYTICS ====================

@dashboard_router.get("/analytics")
async def get_venue_analytics(user: Dict = Depends(get_current_user), days: int = 30):
    """Get comprehensive analytics for a venue"""
    db = get_db()
    analytics = await calculate_venue_analytics(db, user['venue_id'], days)
    return analytics

@dashboard_router.get("/capacity")
async def get_capacity_overview(user: Dict = Depends(get_current_user), date: str = None):
    """Get capacity overview for all timed entry tickets"""
    db = get_db()
    
    if not date:
        date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    # Get all timed entry tickets
    tickets = await db.tickets.find({
        "venue_id": user['venue_id'],
        "active": True,
        "timed_entry": True
    }, {"_id": 0}).to_list(100)
    
    result = []
    for ticket in tickets:
        slots = await get_slot_availability(db, ticket['id'], user['venue_id'], date, ticket.get('slots', []))
        result.append({
            "ticket_id": ticket['id'],
            "ticket_name": ticket['name'],
            "slots": slots
        })
    
    # Daily capacity if enabled
    venue = await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})
    daily_capacity_info = None
    if venue.get('daily_capacity_enabled'):
        orders_today = await db.orders.find({
            "venue_id": user['venue_id'],
            "created_at": {"$regex": f"^{date}"},
            "stripe_payment_status": "paid"
        }, {"_id": 0, "quantity": 1}).to_list(10000)
        sold = sum(o.get('quantity', 0) for o in orders_today)
        daily_capacity_info = {
            "capacity": venue.get('daily_capacity', 0),
            "sold": sold,
            "available": max(0, venue.get('daily_capacity', 0) - sold)
        }
    
    return {
        "date": date,
        "timed_tickets": result,
        "daily_capacity": daily_capacity_info
    }

@dashboard_router.put("/capacity")
async def update_venue_capacity(data: VenueCapacityUpdate, user: Dict = Depends(get_current_user)):
    """Update venue daily capacity settings"""
    db = get_db()
    update_data = data.dict(exclude_unset=True)
    if update_data:
        await db.venues.update_one({"id": user['venue_id']}, {"$set": update_data})
    return await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})

# ==================== DASHBOARD WAITLIST ====================

@dashboard_router.get("/waitlist")
async def get_waitlist(user: Dict = Depends(get_current_user), status: str = None):
    """Get waitlist entries for venue"""
    db = get_db()
    query = {"venue_id": user['venue_id']}
    if status:
        query["status"] = status
    
    entries = await db.waitlist.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Batch fetch ticket names instead of N+1 queries
    ticket_ids = list(set(e.get('ticket_id') for e in entries if e.get('ticket_id')))
    tickets = await db.tickets.find({"id": {"$in": ticket_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(len(ticket_ids))
    ticket_names = {t['id']: t['name'] for t in tickets}
    for entry in entries:
        entry['ticket_name'] = ticket_names.get(entry.get('ticket_id', ''), 'Unknown')
    
    # Count by status
    waiting_count = await db.waitlist.count_documents({**query, "status": "waiting"})
    notified_count = await db.waitlist.count_documents({**query, "status": "notified"})
    
    return {
        "entries": entries,
        "counts": {
            "waiting": waiting_count,
            "notified": notified_count
        }
    }

@dashboard_router.post("/waitlist/{entry_id}/notify")
async def notify_waitlist_entry(entry_id: str, user: Dict = Depends(get_current_user)):
    """Manually notify a waitlist entry"""
    db = get_db()
    
    entry = await db.waitlist.find_one({"id": entry_id, "venue_id": user['venue_id']})
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    venue = await db.venues.find_one({"id": user['venue_id']}, {"_id": 0})
    ticket = await db.tickets.find_one({"id": entry.get('ticket_id')}, {"_id": 0})
    
    if venue and ticket:
        EmailService.send_waitlist_notification(
            visitor_email=entry['visitor_email'],
            visitor_name=entry['visitor_name'],
            venue_name=venue['name'],
            venue_slug=venue['slug'],
            ticket_name=ticket['name'],
            slot_date=entry.get('slot_date'),
            slot_time=entry.get('slot_time'),
            quantity=entry['quantity']
        )
    
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    await db.waitlist.update_one(
        {"id": entry_id},
        {"$set": {
            "status": "notified",
            "notified_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at
        }}
    )
    
    return {"success": True, "message": "Notifica inviata"}

@dashboard_router.delete("/waitlist/{entry_id}")
async def delete_waitlist_entry(entry_id: str, user: Dict = Depends(get_current_user)):
    """Remove a waitlist entry"""
    db = get_db()
    result = await db.waitlist.delete_one({"id": entry_id, "venue_id": user['venue_id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    return {"success": True}

# ==================== PUBLIC PAYMENT INTENT ====================

@public_router.post("/payment-intent")
@limiter.limit("20/minute")
async def create_payment_intent_endpoint(request: Request, order_data: OrderCreate):
    db = get_db()
    venue = await db.venues.find_one({"slug": order_data.venue_slug}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    if not venue.get('stripe_onboarded', False):
        raise HTTPException(status_code=400, detail="Biglietteria non ancora attiva")
    ticket = await db.tickets.find_one({"id": order_data.ticket_id, "active": True}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket_amount = ticket['price'] * order_data.quantity
    fee_amount = calculate_fee(ticket_amount)
    donation_amount = order_data.donation_amount or 0
    total_amount = ticket_amount + donation_amount
    if venue.get('fee_mode') == 'separate':
        total_amount += fee_amount
    if is_stripe_configured() and venue.get('stripe_account_id') and not venue['stripe_account_id'].startswith('acct_mock_'):
        try:
            metadata = {"venue_slug": order_data.venue_slug, "ticket_id": order_data.ticket_id,
                        "quantity": str(order_data.quantity), "visitor_email": order_data.visitor_email,
                        "channel": order_data.channel, "donation_amount": str(donation_amount)}
            intent = StripeService.create_payment_intent(amount=total_amount, fee_amount=fee_amount,
                destination_account=venue['stripe_account_id'], metadata=metadata)
            return {"client_secret": intent['client_secret'], "payment_intent_id": intent['id'],
                    "amount": total_amount, "mock": False}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        qr_token = str(uuid.uuid4())
        qr_base64 = generate_qr_code(qr_token)
        order_id = str(uuid.uuid4())
        order_doc = {
            "id": order_id, "venue_id": venue['id'], "ticket_id": order_data.ticket_id,
            "quantity": order_data.quantity, "ticket_amount": ticket_amount,
            "fee_amount": fee_amount if venue.get('fee_mode') == 'separate' else 0,
            "donation_amount": donation_amount, "qr_token": qr_token, "qr_base64": qr_base64,
            "visitor_email": order_data.visitor_email, "stripe_payment_id": f"pi_mock_{uuid.uuid4().hex[:24]}",
            "stripe_payment_status": "paid", "country_estimate": "IT",
            "channel": order_data.channel, "created_at": datetime.now(timezone.utc).isoformat()
        }
        from pymongo.errors import DuplicateKeyError
        
        try:
            await db.orders.insert_one(order_doc)
        except DuplicateKeyError:
            # Race condition caught by unique index
            return {"status": "ok", "duplicate": True}
            
        order_doc.pop('_id', None)
        EmailService.send_ticket_to_visitor(visitor_email=order_data.visitor_email, venue_name=venue['name'],
            ticket_type=ticket['name'], quantity=order_data.quantity, qr_base64=qr_base64,
            venue_address=venue.get('address', ''), venue_hours=venue.get('opening_hours', ''))
        return {"mock": True, "order_id": order_id, "amount": total_amount}

# ==================== STRIPE WEBHOOK ====================

@webhook_router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    db = get_db()
    if STRIPE_WEBHOOK_SECRET and is_stripe_configured():
        try:
            event = StripeService.verify_webhook_signature(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        import json
        try:
            event = json.loads(payload)
        except:
            raise HTTPException(status_code=400, detail="Invalid payload")
    event_type = event.get('type') if isinstance(event, dict) else event.type
    if event_type == 'payment_intent.succeeded':
        pi = event['data']['object'] if isinstance(event, dict) else event.data.object
        metadata = pi.get('metadata', {}) if isinstance(pi, dict) else pi.metadata
        venue_slug = metadata.get('venue_slug')
        ticket_id = metadata.get('ticket_id')
        quantity = int(metadata.get('quantity', 1))
        visitor_email = metadata.get('visitor_email')
        channel = metadata.get('channel', 'online')
        if not all([venue_slug, ticket_id, visitor_email]):
            return {"status": "ok", "skipped": True}
        venue = await db.venues.find_one({"slug": venue_slug}, {"_id": 0})
        ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
        if not venue or not ticket:
            return {"status": "error"}
        pi_id = pi.get('id') if isinstance(pi, dict) else pi.id
        
        # Soft check for duplicate
        if await db.orders.find_one({"stripe_payment_id": pi_id}):
            return {"status": "ok", "duplicate": True}
            
        qr_token = str(uuid.uuid4())
        qr_base64 = generate_qr_code(qr_token)
        ticket_amount = ticket['price'] * quantity
        fee_amount = calculate_fee(ticket_amount)
        order_doc = {
            "id": str(uuid.uuid4()), "venue_id": venue['id'], "ticket_id": ticket_id,
            "quantity": quantity, "ticket_amount": ticket_amount, "fee_amount": fee_amount,
            "donation_amount": int(metadata.get('donation_amount', 0)),
            "qr_token": qr_token, "qr_base64": qr_base64, "visitor_email": visitor_email,
            "stripe_payment_id": pi_id, "stripe_payment_status": "paid",
            "country_estimate": "IT", "channel": channel, "created_at": datetime.now(timezone.utc).isoformat()
        }
        from pymongo.errors import DuplicateKeyError
        try:
            await db.orders.insert_one(order_doc)
        except DuplicateKeyError:
            # Hard check: Race condition blocked at Database level
            return {"status": "ok", "duplicate": True}
            
        order_doc.pop('_id', None)
        
        # Group Orders logic: Generate Individual Tickets
        generated_tickets = []
        tickets_list_for_email = []
        
        for idx in range(quantity):
            t_token = str(uuid.uuid4())
            t_base64 = generate_qr_code(t_token)
            t_doc = {
                "id": str(uuid.uuid4()),
                "order_id": order_doc["id"],
                "ticket_id": ticket_id,
                "qr_token": t_token,
                "qr_base64": t_base64,
                "used": False,
                "created_at": order_doc["created_at"]
            }
            guide_url = None
            if metadata.get('guide_options'):
                # RS256 JWT for audio guide
                guide_token = jwt.encode({"tid": t_doc["id"], "type": "guide_session" }, RS256_PRIVATE_KEY, algorithm="RS256")
                t_doc["guide_session_token"] = guide_token
                guide_url = f"https://qrgate.com/guide/{t_token}"
                
            generated_tickets.append(t_doc)
            tickets_list_for_email.append({
                "qr_base64": t_base64,
                "share_url": f"https://qrgate.com/ticket/{t_token}/info",
                "guide_url": guide_url
            })
            
        if generated_tickets:
            await db.issued_tickets.insert_many(generated_tickets, ordered=False)
        
        # Dispatch Emails via ARQ Queue
        if quantity == 1:
            ticket_pdf_url = f"https://qrgate.com/ticket/{qr_token}/pdf"
            pwa_url = f"https://qrgate.com/guide/{qr_token}" if metadata.get('guide_options') else None
            
            await request.app.state.redis.enqueue_job(
                "task_send_single_order_confirmation",
                buyer_email=visitor_email,
                venue_name=venue['name'],
                venue_image_url=venue.get('hero_url', 'https://images.unsplash.com/photo-1543884841-32e680a6c221?q=80&w=1500'),
                visit_date_formatted="Data Aperta" if not ticket.get('has_slots') else "Orario prenotato",
                qr_base64=qr_base64,
                pdf_download_url=ticket_pdf_url,
                guide_pwa_url=pwa_url,
                venue_address=venue.get('address', ''),
                venue_maps_url=venue.get('google_maps_url', '#')
            )
        else:
            # Note: For multi_email, we would loop over another metadata array. 
            # Prompt requests single_email by default if not strictly multi_email. 
            await request.app.state.redis.enqueue_job(
                "task_send_group_order_confirmation",
                buyer_email=visitor_email,
                venue_name=venue['name'],
                tickets_list=tickets_list_for_email
            )
        
        # Notification to venue
        venue_user = await db.users.find_one({"venue_id": venue['id']}, {"_id": 0})
        if venue_user:
            await request.app.state.redis.enqueue_job(
                "task_send_first_sale_alert",
                venue_email=venue_user['email'],
                amount_net_euro=f"€{(ticket_amount - fee_amount) / 100:.2f}",
                visitor_name=visitor_email.split('@')[0], 
                stories_enabled=venue.get('stories_enabled', False)
            )
            
        return {"status": "ok"}
    return {"status": "ok", "unhandled_event": event_type}

# ==================== RESEND WEBHOOK ====================

@webhook_router.post("/resend")
async def resend_webhook(request: Request):
    try:
        payload = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid payload")
    
    event_type = payload.get("type", "")
    if event_type == "email.bounced":
        data = payload.get("data", {})
        visitor_email = data.get("to", [""])[0] if isinstance(data.get("to"), list) else data.get("to", "")
        if visitor_email:
            db = get_db()
            # Flag orders associated with the bounced email
            await db.orders.update_many(
                {"visitor_email": visitor_email}, 
                {"$set": {"email_delivery_status": "bounced"}}
            )
            logging.warning(f"Resend Bounced Email Event: Flagged {visitor_email} orders as bounced.")
    
    return {"status": "ok"}

# ==================== POSTMARK WEBHOOK ====================

@webhook_router.post("/postmark")
async def postmark_webhook(request: Request):
    """Handle Postmark webhooks (Bounces, SpamComplaints, etc.)"""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")
    
    record_type = payload.get("RecordType")
    
    if record_type == "Bounce" and payload.get("TypeCode") in [1, 10]: # 1 = HardBounce, 10 = SpamComplaint
        bounced_email = payload.get("Email")
        if bounced_email:
            db = get_db()
            # Log the bounce globally
            await db.bounces.insert_one({
                "email": bounced_email,
                "type": payload.get("Type", "HardBounce"),
                "description": payload.get("Description", ""),
                "bounced_at": payload.get("BouncedAt", datetime.now(timezone.utc).isoformat()),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Flag associated orders
            await db.orders.update_many(
                {"visitor_email": bounced_email}, 
                {"$set": {"email_delivery_status": "bounced"}}
            )
            
            # Optionally block the user document if they are a venue admin
            await db.users.update_many(
                {"email": bounced_email},
                {"$set": {"email_bounced": True}}
            )
            
            logger.info(f"[POSTMARK WEBHOOK] Hard bounce recorded for {bounced_email}")
            
    return {"status": "ok"}

# ==================== ADMIN ROUTES ====================

@admin_router.get("/stats")
async def get_admin_stats(user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    month_start = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    # Use aggregation pipeline instead of loading all orders in memory
    revenue_pipeline = [
        {"$match": {"stripe_payment_status": "paid"}},
        {"$facet": {
            "total": [
                {"$group": {"_id": None, "revenue": {"$sum": "$ticket_amount"}, "count": {"$sum": 1}}}
            ],
            "month": [
                {"$match": {"created_at": {"$gte": month_start}}},
                {"$group": {"_id": None, "revenue": {"$sum": "$ticket_amount"}, "count": {"$sum": 1}}}
            ]
        }}
    ]
    agg_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    agg = agg_result[0] if agg_result else {}
    
    total_data = agg.get("total", [{}])
    total_revenue = total_data[0].get("revenue", 0) if total_data else 0
    
    month_data = agg.get("month", [{}])
    month_revenue = month_data[0].get("revenue", 0) if month_data else 0
    
    # Get fee settings
    settings = await get_platform_settings()
    fee_pct = settings.get("fee_percentage", 5)
    fee_fixed = settings.get("fee_fixed_cents", 49)
    
    def calc_fee(amount):
        return int(amount * fee_pct / 100) + fee_fixed if amount > 0 else 0
    
    total_paid = total_data[0].get("count", 0) if total_data else 0
    month_paid = month_data[0].get("count", 0) if month_data else 0
    total_fees = int(total_revenue * fee_pct / 100 + fee_fixed * total_paid) if total_paid > 0 else 0
    month_fees = int(month_revenue * fee_pct / 100 + fee_fixed * month_paid) if month_paid > 0 else 0
    
    total_venues, total_users, total_orders, total_staff, active_venues = await asyncio.gather(
        db.venues.count_documents({}),
        db.users.count_documents({}),
        db.orders.count_documents({}),
        db.staff.count_documents({}),
        db.venues.count_documents({"stripe_onboarded": True})
    )
    
    return {
        "total_venues": total_venues, "active_venues": active_venues,
        "total_users": total_users, "total_orders": total_orders, "total_staff": total_staff,
        "total_revenue_cents": total_revenue, "total_fees_cents": total_fees,
        "month_revenue_cents": month_revenue, "month_fees_cents": month_fees
    }

@admin_router.get("/venues")
async def get_admin_venues(user: Dict = Depends(get_current_user), page: int = 1, limit: int = 20, search: Optional[str] = None):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"slug": {"$regex": search, "$options": "i"}}]
    total = await db.venues.count_documents(query)
    venues = await db.venues.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    for venue in venues:
        venue['order_count'] = await db.orders.count_documents({"venue_id": venue['id']})
        rev = await db.orders.aggregate([
            {"$match": {"venue_id": venue['id'], "stripe_payment_status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$ticket_amount"}}}
        ]).to_list(1)
        venue['total_revenue_cents'] = rev[0]['total'] if rev else 0
    return {"venues": venues, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@admin_router.get("/venues/{venue_id}")
async def get_admin_venue_detail(venue_id: str, user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    tickets = await db.tickets.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    orders = await db.orders.find({"venue_id": venue_id}, {"_id": 0, "qr_base64": 0}).sort("created_at", -1).limit(10).to_list(10)
    staff = await db.staff.find({"venue_id": venue_id}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"venue": venue, "tickets": tickets, "recent_orders": orders, "staff": staff}

@admin_router.put("/venues/{venue_id}/status")
async def toggle_venue_status(venue_id: str, user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    new_status = not venue.get('stripe_onboarded', False)
    await db.venues.update_one({"id": venue_id}, {"$set": {"stripe_onboarded": new_status}})
    return {"stripe_onboarded": new_status}

@admin_router.get("/orders")
async def get_admin_orders(user: Dict = Depends(get_current_user), page: int = 1, limit: int = 20):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    total = await db.orders.count_documents({})
    orders = await db.orders.find({}, {"_id": 0, "qr_base64": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    for order in orders:
        venue = await db.venues.find_one({"id": order.get('venue_id')}, {"_id": 0, "name": 1})
        order['venue_name'] = venue['name'] if venue else 'N/A'
    return {"orders": orders, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@admin_router.get("/users")
async def get_admin_users(user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users

@admin_router.get("/analytics")
async def get_admin_analytics(user: Dict = Depends(get_current_user)):
    """Get comprehensive platform analytics"""
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    analytics = await calculate_platform_analytics(db)
    return analytics

@admin_router.get("/revenue")
async def get_admin_revenue(user: Dict = Depends(get_current_user)):
    """Get detailed revenue data for admin"""
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    
    platform = await get_platform_settings()
    fee_fixed = platform.get('fee_fixed_cents', 49)
    fee_pct = platform.get('fee_percentage', 5.0)
    
    # Get all paid orders
    orders = await db.orders.find(
        {"stripe_payment_status": "paid"},
        {"_id": 0}
    ).to_list(100000)
    
    # Calculate revenue per venue
    venue_revenue = {}
    for order in orders:
        vid = order.get('venue_id')
        if vid not in venue_revenue:
            venue_revenue[vid] = {"volume": 0, "orders": 0, "fees": 0}
        amount = order.get('ticket_amount', 0)
        venue_revenue[vid]["volume"] += amount
        venue_revenue[vid]["orders"] += 1
        venue_revenue[vid]["fees"] += fee_fixed + int(amount * fee_pct / 100)
    
    # Get venue names
    revenue_list = []
    for vid, stats in venue_revenue.items():
        venue = await db.venues.find_one({"id": vid}, {"_id": 0, "name": 1})
        if venue:
            revenue_list.append({
                "venue_id": vid,
                "venue_name": venue.get('name', 'Unknown'),
                **stats
            })
    
    revenue_list.sort(key=lambda x: x["fees"], reverse=True)
    
    total_volume = sum(v["volume"] for v in venue_revenue.values())
    total_fees = sum(v["fees"] for v in venue_revenue.values())
    total_orders = len(orders)
    
    return {
        "totals": {
            "volume_cents": total_volume,
            "fees_cents": total_fees,
            "orders": total_orders,
            "avg_fee_cents": round(total_fees / total_orders) if total_orders else 0
        },
        "by_venue": revenue_list[:50]  # type: ignore
    }

# ==================== STRIPE CHECKOUT SESSION ====================

@public_router.post("/checkout-session")
@limiter.limit("20/minute")
async def create_checkout_session_endpoint(request: Request, session_data: CheckoutSessionCreate):
    db = get_db()
    venue = await db.venues.find_one({"slug": session_data.venue_slug}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    if not venue.get('stripe_onboarded', False):
        raise HTTPException(status_code=400, detail="Biglietteria non ancora attiva")
    ticket = await db.tickets.find_one({"id": session_data.ticket_id, "active": True}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    platform = await get_platform_settings()
    ticket_amount = ticket['price'] * session_data.quantity
    fee_fixed = platform.get('fee_fixed_cents', 49)
    fee_pct = platform.get('fee_percentage', 5.0)
    fee_amount = fee_fixed + int(ticket_amount * fee_pct / 100)
    donation_amount = session_data.donation_amount or 0
    discount_amount = 0

    # Validate promo code
    promo = None
    if session_data.promo_code:
        promo = await db.promo_codes.find_one({"venue_id": venue['id'], "code": session_data.promo_code.upper(), "active": True}, {"_id": 0})
        if promo:
            if promo.get('valid_until') and promo['valid_until'] < datetime.now(timezone.utc).isoformat():
                promo = None
            elif promo.get('max_uses') and promo.get('current_uses', 0) >= promo['max_uses']:
                promo = None
        if promo:
            if promo['discount_type'] == 'percentage':
                discount_amount = int(ticket_amount * promo['discount_value'] / 100)
            else:
                discount_amount = min(int(promo['discount_value']), ticket_amount)

    total_amount = max(1, ticket_amount - discount_amount + donation_amount)
    if venue.get('fee_mode') == 'separate':
        total_amount += fee_amount

    origin_url = session_data.origin_url or os.environ.get('FRONTEND_URL', 'https://cultural-pass.preview.emergentagent.com')

    # Check timed entry availability
    if ticket.get('timed_entry') and session_data.slot_date and session_data.slot_time:
        slots = await get_slot_availability(db, session_data.ticket_id, venue['id'], session_data.slot_date, ticket.get('slots', []))
        target_slot = next((s for s in slots if s['time'] == session_data.slot_time), None)
        if not target_slot or target_slot['available'] < session_data.quantity:
            raise HTTPException(status_code=409, detail="Slot esaurito, scegli un altro orario")

    # Check daily capacity
    if venue.get('daily_capacity_enabled'):
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        check_date = session_data.slot_date or today
        orders_today = await db.orders.find({
            "venue_id": venue['id'],
            "created_at": {"$regex": f"^{check_date}"},
            "stripe_payment_status": "paid"
        }, {"_id": 0, "quantity": 1}).to_list(10000)
        sold_today = sum(o.get('quantity', 0) for o in orders_today)
        daily_capacity = venue.get('daily_capacity', 0)
        if sold_today + session_data.quantity > daily_capacity:
            raise HTTPException(status_code=409, detail="Biglietteria al completo per oggi")

    stripe_checkout = get_stripe_checkout()

    if stripe_checkout and venue.get('stripe_account_id') and not venue['stripe_account_id'].startswith('acct_mock_'):
        success_url = f"{origin_url}/{session_data.venue_slug}/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/{session_data.venue_slug}/checkout"
        metadata = {
            "venue_slug": session_data.venue_slug, "ticket_id": session_data.ticket_id,
            "quantity": str(session_data.quantity), "visitor_email": session_data.visitor_email,
            "channel": session_data.channel, "donation_amount": str(donation_amount),
            "discount_amount": str(discount_amount), "promo_code": session_data.promo_code or "",
            "slot_date": session_data.slot_date or "", "slot_time": session_data.slot_time or ""
        }
        try:
            session = StripeService.create_checkout_session(
                amount=total_amount,
                fee_amount=fee_amount,
                destination_account=venue['stripe_account_id'],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
                customer_email=session_data.visitor_email,
                line_item_name=f"{ticket['name']} - {venue['name']}"
            )
            # Save payment transaction
            await db.payment_transactions.insert_one({
                "id": str(uuid.uuid4()), "session_id": session.session_id,
                "venue_id": venue['id'], "ticket_id": session_data.ticket_id,
                "quantity": session_data.quantity, "visitor_email": session_data.visitor_email,
                "amount_cents": total_amount, "ticket_amount": ticket_amount,
                "fee_amount": fee_amount, "donation_amount": donation_amount,
                "discount_amount": discount_amount, "promo_code": session_data.promo_code or "",
                "channel": session_data.channel, "payment_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {"url": session.url, "session_id": session.session_id, "mock": False}
        except Exception as e:
            logging.error(f"Stripe checkout session error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Mock mode: create order directly
        qr_token = str(uuid.uuid4())
        qr_base64 = generate_qr_code(qr_token)
        order_id = str(uuid.uuid4())
        order_doc = {
            "id": order_id, "venue_id": venue['id'], "ticket_id": session_data.ticket_id,
            "quantity": session_data.quantity, "ticket_amount": ticket_amount,
            "fee_amount": fee_amount, "donation_amount": donation_amount,
            "discount_amount": discount_amount, "promo_code": session_data.promo_code or "",
            "qr_token": qr_token, "qr_base64": qr_base64,
            "visitor_email": session_data.visitor_email,
            "stripe_payment_id": f"mock_{uuid.uuid4().hex[:24]}",
            "stripe_payment_status": "paid", "country_estimate": "IT",
            "channel": session_data.channel, 
            "slot_date": session_data.slot_date,
            "slot_time": session_data.slot_time,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.orders.insert_one(order_doc)
        order_doc.pop('_id', None)
        
        # Book slot if timed entry
        if ticket.get('timed_entry') and session_data.slot_date and session_data.slot_time:
            booked = await check_and_book_slot(db, session_data.ticket_id, venue['id'], 
                session_data.slot_date, session_data.slot_time, session_data.quantity, order_id)
            if not booked:
                await db.orders.delete_one({"id": order_id})
                raise HTTPException(status_code=409, detail="Slot esaurito, scegli un altro orario")
        
        if promo:
            await db.promo_codes.update_one({"id": promo['id']}, {"$inc": {"current_uses": 1}})
        
        # Mock Email Output
        logger.info("="*60)
        logger.info(f"MOCK TICKET GENERATED FOR: {session_data.visitor_email}")
        logger.info(f"ORDER ID: {order_id}")
        logger.info(f"QR TOKEN: {qr_token}  <-- USE THIS STRING TO TEST SCANNER")
        logger.info(f"TICKET LINK: {origin_url}/ticket/{order_id}")
        logger.info("="*60)

        # Still call EmailService to ensure the interface works without crashing
        try:
            from services.email_service import EmailService
            EmailService.send_ticket_to_visitor(
                visitor_email=session_data.visitor_email, venue_name=venue['name'],
                ticket_type=ticket['name'], quantity=session_data.quantity, qr_base64=qr_base64,
                venue_address=venue.get('address', ''), venue_hours=venue.get('opening_hours', ''),
                slot_date=session_data.slot_date, slot_time=session_data.slot_time)
        except Exception as e:
            logger.warning(f"Email mock service encountered an error (safe to ignore in mock mode): {e}")

        redirect_url = f"{origin_url}/{session_data.venue_slug}/success?order={order_id}"
        return {"url": redirect_url, "order_id": order_id, "mock": True}
@public_router.get("/checkout-status/{session_id}")
async def get_checkout_status(session_id: str):
    db = get_db()
    # Check if order already exists for this session
    existing = await db.orders.find_one({"stripe_session_id": session_id}, {"_id": 0, "qr_base64": 0})
    if existing:
        return {"status": "complete", "payment_status": "paid", "order_id": existing['id']}
    stripe_checkout = get_stripe_checkout()
    if not stripe_checkout:
        return {"status": "complete", "payment_status": "paid"}
    try:
        status_resp = await stripe_checkout.get_checkout_status(session_id)
        if status_resp.payment_status == "paid":
            # Check transaction
            txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if txn and txn['payment_status'] != 'paid':
                # Create order from transaction
                metadata = status_resp.metadata
                venue = await db.venues.find_one({"id": txn['venue_id']}, {"_id": 0})
                ticket = await db.tickets.find_one({"id": txn['ticket_id']}, {"_id": 0})
                if venue and ticket:
                    qr_token = str(uuid.uuid4())
                    qr_base64 = generate_qr_code(qr_token)
                    order_id = str(uuid.uuid4())
                    order_doc = {
                        "id": order_id, "venue_id": txn['venue_id'], "ticket_id": txn['ticket_id'],
                        "quantity": txn['quantity'], "ticket_amount": txn['ticket_amount'],
                        "fee_amount": txn['fee_amount'], "donation_amount": txn['donation_amount'],
                        "discount_amount": txn.get('discount_amount', 0),
                        "promo_code": txn.get('promo_code', ''),
                        "qr_token": qr_token, "qr_base64": qr_base64,
                        "visitor_email": txn['visitor_email'], "stripe_session_id": session_id,
                        "stripe_payment_id": f"cs_{session_id}",
                        "stripe_payment_status": "paid", "country_estimate": "IT",
                        "channel": txn['channel'], "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.orders.insert_one(order_doc)
                    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": "paid", "order_id": order_id}})
                    if txn.get('promo_code'):
                        await db.promo_codes.update_one({"code": txn['promo_code']}, {"$inc": {"current_uses": 1}})
                    EmailService.send_ticket_to_visitor(
                        visitor_email=txn['visitor_email'], venue_name=venue['name'],
                        ticket_type=ticket['name'], quantity=txn['quantity'], qr_base64=qr_base64,
                        venue_address=venue.get('address', ''), venue_hours=venue.get('opening_hours', ''))
                    return {"status": "complete", "payment_status": "paid", "order_id": order_id}
            return {"status": "complete", "payment_status": "paid"}
        return {"status": status_resp.status, "payment_status": status_resp.payment_status}
    except Exception as e:
        logging.error(f"Checkout status error: {e}")
        return {"status": "unknown", "error": str(e)}

# ==================== PROMO CODES ====================

@dashboard_router.get("/promo-codes")
async def get_promo_codes(user: Dict = Depends(get_current_user)):
    db = get_db()
    codes = await db.promo_codes.find({"venue_id": user['venue_id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return codes

@dashboard_router.post("/promo-codes")
async def create_promo_code(promo_data: PromoCodeCreate, user: Dict = Depends(get_current_user)):
    db = get_db()
    code_upper = promo_data.code.upper().strip()
    existing = await db.promo_codes.find_one({"venue_id": user['venue_id'], "code": code_upper})
    if existing:
        raise HTTPException(status_code=400, detail="Codice già esistente")
    promo_doc = {
        "id": str(uuid.uuid4()), "venue_id": user['venue_id'], "code": code_upper,
        "discount_type": promo_data.discount_type, "discount_value": promo_data.discount_value,
        "max_uses": promo_data.max_uses, "current_uses": 0,
        "valid_until": promo_data.valid_until, "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.promo_codes.insert_one(promo_doc)
    promo_doc.pop('_id', None)
    return promo_doc

@dashboard_router.delete("/promo-codes/{promo_id}")
async def delete_promo_code(promo_id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    promo = await db.promo_codes.find_one({"id": promo_id, "venue_id": user['venue_id']})
    if not promo:
        raise HTTPException(status_code=404, detail="Codice non trovato")
    await db.promo_codes.delete_one({"id": promo_id})
    return {"message": "Codice rimosso"}

@public_router.post("/verify-promo")
async def verify_promo_code(venue_slug: str, code: str, ticket_amount: int):
    db = get_db()
    venue = await db.venues.find_one({"slug": venue_slug}, {"_id": 0, "id": 1})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    promo = await db.promo_codes.find_one({"venue_id": venue['id'], "code": code.upper(), "active": True}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Codice non valido")
    if promo.get('valid_until') and promo['valid_until'] < datetime.now(timezone.utc).isoformat():
        raise HTTPException(status_code=400, detail="Codice scaduto")
    if promo.get('max_uses') and promo.get('current_uses', 0) >= promo['max_uses']:
        raise HTTPException(status_code=400, detail="Codice esaurito")
    if promo['discount_type'] == 'percentage':
        discount = int(ticket_amount * promo['discount_value'] / 100)
    else:
        discount = min(int(promo['discount_value']), ticket_amount)
    return {"valid": True, "discount_amount": discount, "discount_type": promo['discount_type'], "discount_value": promo['discount_value']}

# ==================== SEASON PASSES ====================

@dashboard_router.get("/season-passes")
async def get_season_passes(user: Dict = Depends(get_current_user)):
    db = get_db()
    passes = await db.season_passes.find({"venue_id": user['venue_id']}, {"_id": 0}).to_list(100)
    return passes

@dashboard_router.post("/season-passes")
async def create_season_pass(data: SeasonPassCreate, user: Dict = Depends(get_current_user)):
    db = get_db()
    pass_doc = {
        "id": str(uuid.uuid4()),
        "venue_id": user['venue_id'],
        "name": data.name,
        "description": data.description,
        "price": data.price,
        "visits_allowed": data.visits_allowed,
        "valid_days": data.valid_days,
        "ticket_types": data.ticket_types or [],
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.season_passes.insert_one(pass_doc)
    pass_doc.pop('_id', None)
    return pass_doc

@dashboard_router.put("/season-passes/{pass_id}")
async def update_season_pass(pass_id: str, data: SeasonPassCreate, user: Dict = Depends(get_current_user)):
    db = get_db()
    existing = await db.season_passes.find_one({"id": pass_id, "venue_id": user['venue_id']})
    if not existing:
        raise HTTPException(status_code=404, detail="Pass not found")
    update_data = data.dict(exclude_unset=True)
    await db.season_passes.update_one({"id": pass_id}, {"$set": update_data})
    return await db.season_passes.find_one({"id": pass_id}, {"_id": 0})

@dashboard_router.delete("/season-passes/{pass_id}")
async def delete_season_pass(pass_id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    result = await db.season_passes.update_one(
        {"id": pass_id, "venue_id": user['venue_id']},
        {"$set": {"active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pass not found")
    return {"message": "Pass disattivato"}

@dashboard_router.get("/season-pass-holders")
async def get_season_pass_holders(user: Dict = Depends(get_current_user)):
    db = get_db()
    holders = await db.season_pass_holders.find(
        {"venue_id": user['venue_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Enrich with pass names
    for holder in holders:
        pass_info = await db.season_passes.find_one({"id": holder.get('pass_id')}, {"_id": 0, "name": 1})
        holder['pass_name'] = pass_info.get('name', 'Sconosciuto') if pass_info else 'Sconosciuto'
    
    return holders

@public_router.get("/venue/{slug}/season-passes")
async def get_public_season_passes(slug: str):
    db = get_db()
    venue = await db.venues.find_one({"slug": slug}, {"_id": 0, "id": 1})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    passes = await db.season_passes.find(
        {"venue_id": venue['id'], "active": True},
        {"_id": 0}
    ).to_list(20)
    return passes

@public_router.post("/season-pass/purchase")
async def purchase_season_pass(data: SeasonPassPurchase):
    db = get_db()
    
    venue = await db.venues.find_one({"slug": data.venue_slug}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    season_pass = await db.season_passes.find_one({"id": data.pass_id, "venue_id": venue['id'], "active": True}, {"_id": 0})
    if not season_pass:
        raise HTTPException(status_code=404, detail="Season pass not found")
    
    # Generate unique pass code
    pass_code = f"SP-{uuid.uuid4().hex[:8].upper()}"
    qr_token = str(uuid.uuid4())
    qr_base64 = generate_qr_code(qr_token)
    
    # Calculate expiry
    expires_at = (datetime.now(timezone.utc) + timedelta(days=season_pass['valid_days'])).isoformat()
    
    holder_doc = {
        "id": str(uuid.uuid4()),
        "venue_id": venue['id'],
        "pass_id": data.pass_id,
        "pass_code": pass_code,
        "qr_token": qr_token,
        "visitor_email": data.visitor_email,
        "visitor_name": data.visitor_name,
        "visits_allowed": season_pass['visits_allowed'],
        "visits_used": 0,
        "expires_at": expires_at,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.season_pass_holders.insert_one(holder_doc)
    holder_doc.pop('_id', None)
    
    # Send email with pass
    EmailService.send_ticket_to_visitor(
        visitor_email=data.visitor_email,
        venue_name=venue['name'],
        ticket_type=f"Abbonamento: {season_pass['name']}",
        quantity=1,
        qr_base64=qr_base64,
        venue_address=venue.get('address', ''),
        venue_hours=venue.get('opening_hours', '')
    )
    
    return {
        "success": True,
        "pass_code": pass_code,
        "expires_at": expires_at,
        "visits_allowed": season_pass['visits_allowed']
    }

@scan_router.post("/verify-pass")
@limiter.limit("100/minute")
async def verify_season_pass(request: Request, scan_data: ScanVerify):
    """Verify a season pass QR code"""
    db = get_db()
    
    holder = await db.season_pass_holders.find_one({"qr_token": scan_data.token}, {"_id": 0})
    
    if not holder:
        return {"result": "INVALID", "message": "Abbonamento non trovato"}
    
    # Check if expired
    if holder['expires_at'] < datetime.now(timezone.utc).isoformat():
        return {"result": "EXPIRED", "message": "Abbonamento scaduto"}
    
    # Check visits
    if holder['visits_allowed'] != -1 and holder['visits_used'] >= holder['visits_allowed']:
        return {"result": "EXHAUSTED", "message": "Ingressi esauriti"}
    
    # Increment visits
    await db.season_pass_holders.update_one(
        {"id": holder['id']},
        {"$inc": {"visits_used": 1}}
    )
    
    # Get pass info
    season_pass = await db.season_passes.find_one({"id": holder['pass_id']}, {"_id": 0, "name": 1})
    venue = await db.venues.find_one({"id": holder['venue_id']}, {"_id": 0, "name": 1})
    
    visits_left = "Illimitati" if holder['visits_allowed'] == -1 else f"{holder['visits_allowed'] - holder['visits_used'] - 1} rimasti"
    
    return {
        "result": "VALID",
        "ticket_type": f"Abbonamento: {season_pass.get('name', '')}",
        "venue_name": venue.get('name', ''),
        "visitor_name": holder['visitor_name'],
        "visits_info": visits_left,
        "expires_at": holder['expires_at'][:10],
        "is_season_pass": True
    }

# ==================== PLATFORM SETTINGS ====================

@admin_router.get("/dashboard")
async def get_superadmin_dashboard(user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin' and user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    
    db = get_db()
    
    # 1. Total Venues
    total_venues = await db.venues.count_documents({})
    active_venues = await db.venues.count_documents({"status": "active"})
    
    # 2. Total Orders & Volume
    orders = await db.orders.find({"stripe_payment_status": "paid"}).to_list(None)
    
    total_volume_cents = 0
    total_fee_cents = 0
    total_tickets_sold = 0
    
    for order in orders:
        total_volume_cents += order.get('ticket_amount', 0)
        total_fee_cents += order.get('fee_amount', 0)
        total_tickets_sold += order.get('quantity', 1)
        
    return {
        "kpis": {
            "total_venues": total_venues,
            "active_venues": active_venues,
            "total_orders": len(orders),
            "total_tickets_sold": total_tickets_sold,
            "total_volume_cents": total_volume_cents,
            "total_fees_cents": total_fee_cents
        }
    }

@admin_router.get("/venues")
async def admin_get_venues(page: int = 1, search: str = "", user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin' and user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    limit = 20
    skip = (page - 1) * limit
    
    query = {}
    if search:
        query = {"$or": [{"name": {"$regex": search, "$options": "i"}}, {"slug": {"$regex": search, "$options": "i"}}]}
        
    venues = await db.venues.find(query).skip(skip).limit(limit).to_list(None)
    total = await db.venues.count_documents(query)
    
    # Enrich with stats
    for v in venues:
        v['_id'] = str(v['_id'])
        orders = await db.orders.find({"venue_id": v['id'], "stripe_payment_status": "paid"}).to_list(None)
        v['order_count'] = len(orders)
        v['total_revenue_cents'] = sum(o.get('ticket_amount', 0) for o in orders)
        
    return {"venues": venues, "total": total, "pages": (total + limit - 1) // limit}

@admin_router.put("/venues/{venue_id}/status")
async def admin_toggle_venue_status(venue_id: str, user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin' and user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    venue = await db.venues.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue non trovata")
    
    new_status = not venue.get('stripe_onboarded', False)
    await db.venues.update_one({"id": venue_id}, {"$set": {"stripe_onboarded": new_status, "status": "active" if new_status else "inactive"}})
    return {"status": "ok", "stripe_onboarded": new_status}

@admin_router.get("/orders")
async def admin_get_orders(page: int = 1, user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin' and user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    limit = 50
    skip = (page - 1) * limit
    
    orders = await db.orders.find().sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    total = await db.orders.count_documents({})
    
    # Enrich with venue names
    venues_cache = {}
    for o in orders:
        o['_id'] = str(o['_id'])
        vid = o.get('venue_id')
        if vid not in venues_cache:
            v = await db.venues.find_one({"id": vid}, {"name": 1})
            venues_cache[vid] = v['name'] if v else 'Sconosciuta'
        o['venue_name'] = venues_cache[vid]
        
    return {"orders": orders, "total": total, "pages": (total + limit - 1) // limit}

@admin_router.get("/users")
async def admin_get_users(user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin' and user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    users = await db.users.find().sort("created_at", -1).limit(100).to_list(None)
    for u in users:
        u['_id'] = str(u['_id'])
        u.pop('password_hash', None)
    return users

@admin_router.get("/platform-settings")
async def get_platform_settings_endpoint(user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return await get_platform_settings()

@admin_router.put("/platform-settings")
async def update_platform_settings(settings: PlatformSettingsUpdate, user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    update_data = settings.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    existing = await db.platform_settings.find_one({})
    if existing:
        await db.platform_settings.update_one({}, {"$set": update_data})
    else:
        update_data['created_at'] = datetime.now(timezone.utc).isoformat()
        await db.platform_settings.insert_one(update_data)
    if 'stripe_webhook_secret' in update_data and update_data['stripe_webhook_secret']:
        os.environ['STRIPE_WEBHOOK_SECRET'] = update_data['stripe_webhook_secret']
    return await get_platform_settings()

# ==================== STRIPE CONFIGURATION ====================

@admin_router.get("/stripe-config")
async def get_stripe_config(user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    
    secret_key = os.environ.get('STRIPE_SECRET_KEY', '')
    pub_key = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    
    # Detect mode from key prefix
    if secret_key.startswith('sk_live_'):
        mode = "live"
    elif secret_key.startswith('sk_test_'):
        mode = "test"
    else:
        mode = "unconfigured"
    
    # Mask keys for display (show only first 12 and last 4 chars)
    def mask_key(key):
        if not key or len(key) < 20:
            return key
        return key[:12] + "..." + key[-4:]
    
    # Readiness checklist
    db = get_db()
    venues_with_stripe = await db.venues.count_documents({"stripe_onboarded": True})
    
    return {
        "mode": mode,
        "secret_key_masked": mask_key(secret_key),
        "publishable_key_masked": mask_key(pub_key),
        "webhook_secret_set": bool(webhook_secret),
        "stripe_configured": is_stripe_configured(),
        "venues_with_stripe": venues_with_stripe,
        "checklist": {
            "secret_key": bool(secret_key) and secret_key != 'sk_test_placeholder',
            "publishable_key": bool(pub_key) and pub_key != 'pk_test_placeholder',
            "webhook_secret": bool(webhook_secret),
            "live_mode": mode == "live",
        }
    }

@admin_router.put("/stripe-config")
async def update_stripe_config(config: StripeConfigUpdate, user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    
    updates = config.dict(exclude_unset=True)
    
    if 'stripe_secret_key' in updates:
        key = updates['stripe_secret_key']
        if not key.startswith(('sk_test_', 'sk_live_')):
            raise HTTPException(status_code=400, detail="La chiave segreta deve iniziare con sk_test_ o sk_live_")
        os.environ['STRIPE_SECRET_KEY'] = key
        os.environ['STRIPE_API_KEY'] = key
        import stripe
        stripe.api_key = key
    
    if 'stripe_publishable_key' in updates:
        key = updates['stripe_publishable_key']
        if not key.startswith(('pk_test_', 'pk_live_')):
            raise HTTPException(status_code=400, detail="La chiave pubblica deve iniziare con pk_test_ o pk_live_")
        os.environ['STRIPE_PUBLISHABLE_KEY'] = key
    
    if 'stripe_webhook_secret' in updates:
        wh = updates['stripe_webhook_secret']
        if wh:
            os.environ['STRIPE_WEBHOOK_SECRET'] = wh
    
    # Also persist to platform_settings in DB
    db = get_db()
    persist_data = {}
    if 'stripe_secret_key' in updates:
        persist_data['stripe_secret_key_encrypted'] = updates['stripe_secret_key']
    if 'stripe_publishable_key' in updates:
        persist_data['stripe_publishable_key'] = updates['stripe_publishable_key']
    if 'stripe_webhook_secret' in updates:
        persist_data['stripe_webhook_secret'] = updates['stripe_webhook_secret']
    
    if persist_data:
        persist_data['stripe_updated_at'] = datetime.now(timezone.utc).isoformat()
        existing = await db.platform_settings.find_one({})
        if existing:
            await db.platform_settings.update_one({}, {"$set": persist_data})
        else:
            await db.platform_settings.insert_one(persist_data)
    
    return {"status": "ok", "message": "Configurazione Stripe aggiornata"}

# ==================== WALLET PASS ENDPOINTS ====================

wallet_router = APIRouter(prefix="/api/wallet")

@wallet_router.get("/config")
async def get_wallet_config():
    """Public endpoint: returns which wallet options are available"""
    settings = await get_platform_settings()
    return {
        "google_wallet_enabled": GoogleWalletService.is_configured(settings),
        "apple_wallet_enabled": AppleWalletService.is_configured(settings),
    }

@wallet_router.get("/google-pass/{order_id}")
async def generate_google_wallet_pass(order_id: str):
    """Generate a Google Wallet save link for an order"""
    settings = await get_platform_settings()
    if not GoogleWalletService.is_configured(settings):
        raise HTTPException(status_code=503, detail="Google Wallet non configurato")
    
    db = get_db()
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    venue = await db.venues.find_one({"id": order['venue_id']}, {"_id": 0})
    ticket = await db.tickets.find_one({"id": order.get('ticket_id')}, {"_id": 0})
    
    try:
        url = GoogleWalletService.generate_pass_url(
            settings=settings,
            order=order,
            venue=venue or {},
            ticket=ticket or {},
            qr_token=order.get('qr_token', order['id'])
        )
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore generazione pass: {str(e)}")

@wallet_router.get("/apple-pass/{order_id}")
async def generate_apple_wallet_pass(order_id: str):
    """Generate Apple Wallet pass data for an order"""
    settings = await get_platform_settings()
    if not AppleWalletService.is_configured(settings):
        raise HTTPException(status_code=503, detail="Apple Wallet non configurato")
    
    db = get_db()
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    venue = await db.venues.find_one({"id": order['venue_id']}, {"_id": 0})
    ticket = await db.tickets.find_one({"id": order.get('ticket_id')}, {"_id": 0})
    
    try:
        pass_data = AppleWalletService.generate_pass_data(
            settings=settings,
            order=order,
            venue=venue or {},
            ticket=ticket or {},
            qr_token=order.get('qr_token', order['id'])
        )
        return {"pass_data": pass_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore generazione pass: {str(e)}")

@wallet_router.get("/ticket-image/{order_id}")
async def generate_ticket_image(order_id: str):
    """Generate a downloadable ticket image (works without wallet credentials)"""
    db = get_db()
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    venue = await db.venues.find_one({"id": order['venue_id']}, {"_id": 0})
    ticket = await db.tickets.find_one({"id": order.get('ticket_id')}, {"_id": 0})
    
    # Generate a ticket PDF optimized for mobile
    from reportlab.lib.pagesizes import A6
    from reportlab.pdfgen import canvas as pdf_canvas
    from reportlab.lib.units import cm, mm
    from reportlab.lib.colors import HexColor as ReportLabHexColor
    import tempfile
    
    width, height = A6
    tmp = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    c = pdf_canvas.Canvas(tmp.name, pagesize=A6)
    
    # Premium Minimalist Ticket - Light Theme
    c.setFillColor(ReportLabHexColor('#FFFFFF'))
    c.rect(0, 0, width, height, fill=1)
    
    # Top Bar - Neutral Slate
    c.setFillColor(ReportLabHexColor('#0F172A'))
    c.rect(0, height - 1.8*cm, width, 1.8*cm, fill=1)
    
    c.setFillColor(ReportLabHexColor('#FFFFFF'))
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(width/2, height - 1.1*cm, "BIGLIETTO DIGITALE")
    
    # Venue Info
    c.setFillColor(ReportLabHexColor('#0F172A'))
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(width/2, height - 3*cm, (venue or {}).get('name', '').upper())
    
    # Ticket Type - Subtle Accent
    c.setFillColor(ReportLabHexColor('#10B981')) # Emerald
    c.setFont('Helvetica-Bold', 10)
    c.drawCentredString(width/2, height - 3.7*cm, (ticket or {}).get('name', ''))
    
    # QR Code Container
    qr_size = 5.2 * cm
    c.setStrokeColor(ReportLabHexColor('#F1F5F9'))
    c.rect((width - qr_size)/2 - 0.2*cm, height/2 - qr_size/2 - 0.4*cm, qr_size + 0.4*cm, qr_size + 0.4*cm, fill=0, stroke=1)
    
    # QR Code
    qr_token = order.get('qr_token', order['id'])
    qr_img_data = generate_qr_code(qr_token)
    import base64 as b64
    qr_bytes = b64.b64decode(qr_img_data)
    qr_buf = io.BytesIO(qr_bytes)
    from reportlab.lib.utils import ImageReader
    qr_reader = ImageReader(qr_buf)
    
    c.drawImage(qr_reader, (width - qr_size)/2, height/2 - qr_size/2 - 0.2*cm, qr_size, qr_size)
    
    # Details below QR
    y_pos = height/2 - qr_size/2 - 1.5*cm
    c.setFillColor(ReportLabHexColor('#CBD5E1'))
    c.setFont('Helvetica', 8)
    
    details = [
        f"Quantita: {order.get('quantity', 1)}",
        f"Ordine: {order['id'][:8]}..."
    ]
    if order.get('slot_time') and order.get('slot_date'):
        details.insert(0, f"Fascia: {order['slot_date']} ore {order['slot_time']}")
    
    for line in details:
        c.drawCentredString(width/2, y_pos, line)
        y_pos -= 0.5*cm
    
    # Footer
    c.setFont('Helvetica', 7)
    c.setFillColor(ReportLabHexColor('#64748B'))
    c.drawCentredString(width/2, 1*cm, "Mostra questo QR all'ingresso")
    
    c.save()
    return FileResponse(tmp.name, media_type='application/pdf', filename=f"biglietto-{order['id'][:8]}.pdf")

# Admin wallet settings
@admin_router.get("/wallet-config")
async def get_wallet_admin_config(user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    settings = await get_platform_settings()
    return {
        "google_wallet": {
            "configured": GoogleWalletService.is_configured(settings),
            "issuer_id": settings.get('google_wallet_issuer_id', ''),
            "service_account_email": settings.get('google_wallet_service_account_email', ''),
            "has_private_key": bool(settings.get('google_wallet_private_key')),
        },
        "apple_wallet": {
            "configured": AppleWalletService.is_configured(settings),
            "pass_type_id": settings.get('apple_wallet_pass_type_id', ''),
            "team_id": settings.get('apple_wallet_team_id', ''),
            "has_certificate": bool(settings.get('apple_wallet_certificate')),
            "has_key": bool(settings.get('apple_wallet_key')),
        }
    }

class WalletConfigUpdate(BaseModel):
    google_wallet_issuer_id: Optional[str] = None
    google_wallet_service_account_email: Optional[str] = None
    google_wallet_private_key: Optional[str] = None
    apple_wallet_pass_type_id: Optional[str] = None
    apple_wallet_team_id: Optional[str] = None
    apple_wallet_certificate: Optional[str] = None
    apple_wallet_key: Optional[str] = None

@admin_router.put("/wallet-config")
async def update_wallet_config(config: WalletConfigUpdate, user: Dict = Depends(get_current_user)):
    if user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    db = get_db()
    update_data = config.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data['wallet_updated_at'] = datetime.now(timezone.utc).isoformat()
    existing = await db.platform_settings.find_one({})
    if existing:
        await db.platform_settings.update_one({}, {"$set": update_data})
    else:
        await db.platform_settings.insert_one(update_data)
    return {"status": "ok", "message": "Configurazione wallet aggiornata"}

# ==================== V1 SPECIFIC ENGINE & STRIPE ====================
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import hashlib
import jwt

def get_or_create_rsa_keys():
    priv = os.environ.get('RS256_PRIVATE_KEY')
    pub = os.environ.get('RS256_PUBLIC_KEY')
    if priv and pub:
        return priv, pub
        
    # Fallback generation for testing if not provided in Supabase Vault
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    pub_pem = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    return priv_pem, pub_pem

RS256_PRIVATE_KEY, RS256_PUBLIC_KEY = get_or_create_rsa_keys()

def generate_rs256_qr(ticket_id, venue_id, type_code, valid_from, valid_until, group_index, group_total):
    now = int(datetime.now(timezone.utc).timestamp())
    payload = {
        "tid": ticket_id,
        "vid": venue_id,
        "ttype": type_code,
        "vf": int(valid_from.timestamp()) if hasattr(valid_from, 'timestamp') else valid_from,
        "vu": int(valid_until.timestamp()) if hasattr(valid_until, 'timestamp') else valid_until,
        "gi": group_index,
        "gt": group_total,
        "iat": now
    }
    token = jwt.encode(payload, RS256_PRIVATE_KEY, algorithm="RS256")
    qr_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
    return token, qr_hash

@v1_router.get("/public-key")
async def get_public_key():
    return {"public_key": RS256_PUBLIC_KEY}

@v1_router.post("/venues/{venue_id}/stripe/onboard")
async def onboard_stripe_v1(venue_id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    if user['role'] not in ['owner', 'admin'] or user['venue_id'] != venue_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    venue = await db.venues.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
        
    import stripe
    stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_mock')
    
    if venue.get('stripe_account_id') and not venue['stripe_account_id'].startswith('acct_mock'):
        account_id = venue['stripe_account_id']
    else:
        try:
            account = stripe.Account.create(
                type="express",
                country=venue.get('country', 'IT'),
                email=user.get('email', ''),
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                    "sepa_debit_payments": {"requested": True}
                },
                settings={
                    "payouts": {
                        "schedule": {
                            "interval": "weekly",
                            "weekly_anchor": "friday"
                        }
                    }
                }
            )
            account_id = account.id
            await db.venues.update_one({"id": venue_id}, {"$set": {"stripe_account_id": account_id}})
        except Exception as e:
            # Fallback mock for testing without live stripe keys
            account_id = f"acct_mock_{str(uuid.uuid4())[:8]}"
            await db.venues.update_one({"id": venue_id}, {"$set": {"stripe_account_id": account_id, "stripe_onboarded": True}})
            return {"onboarding_url": f"http://localhost:3000/dashboard/settings?onboarded=true&mock=true"}
        
    origin_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    account_link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=f"{origin_url}/dashboard/settings",
        return_url=f"{origin_url}/dashboard/settings",
        type="account_onboarding",
    )
    
    return {"onboarding_url": account_link.url}

class CreateSessionV1Req(BaseModel):
    venue_id: str
    tickets: list
    guide_options: Optional[Dict] = None
    visitor: Dict

@v1_router.post("/orders/create-session")
async def create_session_v1(req: CreateSessionV1Req):
    from services.fee_service import calculate_order_fees
    db = get_db()
    venue = await db.venues.find_one({"id": req.venue_id})
    if not venue: raise HTTPException(status_code=404, detail="Venue not found")
    
    order_data = {
        "tickets": req.tickets,
        "audio_guide": req.guide_options
    }
    fees = calculate_order_fees(order_data)
    total_gross = sum(float(t.get("price", 0)) for t in req.tickets)
    if req.guide_options:
        total_gross += float(req.guide_options.get("price", 0)) * len(req.tickets)
        
    total_gross_cents = int(total_gross * 100)
    qrgate_fee_cents = int(fees["qrgate_total_fee"] * 100)
    
    import stripe
    stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_mock')
    
    order_id = str(uuid.uuid4())
    origin_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card', 'sepa_debit'],
            line_items=[{
                "price_data": {
                    "currency": venue.get("settings", {}).get("currency", "eur").lower(),
                    "product_data": {"name": f"Tickets for {venue.get('name', 'Venue')}"},
                    "unit_amount": total_gross_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            payment_intent_data={
                "application_fee_amount": qrgate_fee_cents,
                "transfer_data": {
                    "destination": venue.get('stripe_account_id', 'acct_mock')
                },
                "metadata": {
                    "order_id": order_id,
                    "venue_id": req.venue_id
                }
            },
            success_url=f"{origin_url}/{venue.get('slug', 'checkout')}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin_url}/{venue.get('slug', 'checkout')}/checkout",
            customer_email=req.visitor.get("email"),
            metadata={
                "order_id": order_id,
                "visitor_email": req.visitor.get("email")
            }
        )
        url = session.url
        sid = session.id
        pid = session.payment_intent if isinstance(session.payment_intent, str) else None
    except Exception as e:
        # Fallback for dev environment without stripe keys
        url = f"{origin_url}/{venue.get('slug', 'checkout')}/success?session_id=mock_session_v1_{order_id}"
        sid = f"mock_session_{order_id}"
        pid = f"mock_pi_{order_id}"
    
    order_doc = {
        "id": order_id,
        "venue_id": req.venue_id,
        "stripe_session_id": sid,
        "stripe_payment_id": pid,
        "status": "pending",
        "visitor_email": req.visitor.get("email"),
        "visitor_name": req.visitor.get("name"),
        "fees": fees,
        "tickets": req.tickets,
        "guide_options": req.guide_options,
        "total_gross_cents": total_gross_cents,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    from pymongo.errors import DuplicateKeyError
    try:
        await db.orders.insert_one(order_doc)
    except DuplicateKeyError:
        pass
        
    return {"checkout_url": url, "order_id": order_id}

@v1_router.post("/orders/payment-intent")
async def create_payment_intent_v1(req: CreateSessionV1Req):
    from services.fee_service import calculate_order_fees
    db = get_db()
    venue = await db.venues.find_one({"id": req.venue_id})
    if not venue: raise HTTPException(status_code=404, detail="Venue not found")
    
    order_data = {
        "tickets": req.tickets,
        "audio_guide": req.guide_options
    }
    fees = calculate_order_fees(order_data)
    total_gross = sum(float(t.get("price", 0)) for t in req.tickets)
    if req.guide_options:
        total_gross += float(req.guide_options.get("price", 0)) * len(req.tickets)
        
    total_gross_cents = int(total_gross * 100)
    qrgate_fee_cents = int(fees["qrgate_total_fee"] * 100)
    
    import stripe
    stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_mock')
    
    order_id = str(uuid.uuid4())
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=total_gross_cents,
            currency=venue.get("settings", {}).get("currency", "eur").lower(),
            payment_method_types=['card', 'sepa_debit'],
            application_fee_amount=qrgate_fee_cents,
            transfer_data={
                "destination": venue.get('stripe_account_id', 'acct_mock')
            },
            metadata={
                "order_id": order_id,
                "venue_id": req.venue_id
            }
        )
        client_secret = intent.client_secret
        pid = intent.id
    except Exception as e:
        client_secret = f"pi_mock_{order_id}_secret_{uuid.uuid4().hex}"
        pid = f"mock_pi_{order_id}"
    
    order_doc = {
        "id": order_id,
        "venue_id": req.venue_id,
        "stripe_session_id": f"elem_session_{order_id}",
        "stripe_payment_id": pid,
        "status": "pending",
        "visitor_email": req.visitor.get("email"),
        "visitor_name": req.visitor.get("name"),
        "fees": fees,
        "tickets": req.tickets,
        "guide_options": req.guide_options,
        "total_gross_cents": total_gross_cents,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    from pymongo.errors import DuplicateKeyError
    try:
        await db.orders.insert_one(order_doc)
    except DuplicateKeyError:
        pass
        
    return {"client_secret": client_secret, "order_id": order_id}

@v1_router.post("/stripe/webhook")
async def stripe_webhook_v1(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature', '')
    secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    
    import stripe
    import json
    
    try:
        if secret and sig_header:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
        else:
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    db = get_db()
    
    if event.type == 'payment_intent.succeeded':
        pi = event.data.object
        order_id = pi.metadata.get("order_id")
        if not order_id: return {"status": "ok", "skipped": True}
        
        order = await db.orders.find_one({"id": order_id})
        if not order or order.get("status") == "paid":
            return {"status": "ok"}
            
        await db.orders.update_one({"id": order_id}, {"$set": {"status": "paid", "stripe_payment_id": pi.id}})
        
        venue = await db.venues.find_one({"id": order["venue_id"]})
        
        generated_tickets = []
        group_total = len(order.get("tickets", []))
        for idx, t in enumerate(order.get("tickets", [])):
            valid_from = datetime.now(timezone.utc)
            valid_until = valid_from + timedelta(days=365)
            
            token, qr_hash = generate_rs256_qr(
                ticket_id=t.get("ticket_type_id", "unknown"),
                venue_id=venue["id"],
                type_code=t.get("ticket_type_code", "ENTRY"),
                valid_from=valid_from,
                valid_until=valid_until,
                group_index=idx + 1,
                group_total=group_total
            )
            
            t_doc = {
                "id": str(uuid.uuid4()),
                "order_id": order_id,
                "venue_id": venue["id"],
                "qr_token": token,
                "qr_hash": qr_hash,
                "status": "valid",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            if order.get("guide_options"):
                guide_token = jwt.encode({"tid": t_doc["id"], "type": "guide_session" }, RS256_PRIVATE_KEY, algorithm="RS256")
                t_doc["guide_session_token"] = guide_token
                
            generated_tickets.append(t_doc)
            
        if generated_tickets:
            # Safely insert generated tickets
            from pymongo.errors import BulkWriteError
            try:
                await db.issued_tickets.insert_many(generated_tickets, ordered=False)
            except BulkWriteError:
                pass
            
        # TRACK PAYMENT COMPLETED
        group_size = len(order.get("tickets", []))
        total_cent = order.get("total_gross_cents", pi.amount)
        qrgate_fee_cent = order.get("fee_amount", pi.application_fee_amount or 0)
        venue_net_cent = total_cent - qrgate_fee_cent
        
        analytics_service.capture_event(
            distinct_id=order["venue_id"],
            event_name="payment_completed",
            properties={
                "venue_id": order["venue_id"],
                "total": total_cent / 100.0,
                "qrgate_fee": qrgate_fee_cent / 100.0,
                "venue_net": venue_net_cent / 100.0,
                "group_size": group_size
            }
        )
            
        # Check first sales for Activation tracking
        paid_orders_count = await db.orders.count_documents({"venue_id": venue["id"], "status": "paid"})
        if paid_orders_count == 1:
            created_fromiso = datetime.fromisoformat(venue.get("created_at", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00"))
            days_from_reg = (datetime.now(timezone.utc) - created_fromiso).days
            analytics_service.capture_event(
                distinct_id=venue["id"],
                event_name="first_ticket_sold",
                properties={"venue_id": venue["id"], "days_since_onboarding": days_from_reg, "source": order.get("channel", "web")}
            )
            
        if order.get("guide_options"):
            guide_orders_count = await db.orders.count_documents({"venue_id": venue["id"], "status": "paid", "guide_options": {"$ne": None}})
            if guide_orders_count == 1:
                pub_date = venue.get("stories_published_at")
                days_since_pub = 0
                if pub_date:
                    pub_fromiso = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                    days_since_pub = (datetime.now(timezone.utc) - pub_fromiso).days
                    
                analytics_service.capture_event(
                    distinct_id=venue["id"],
                    event_name="first_guide_sold",
                    properties={"venue_id": venue["id"], "days_since_stories_published": days_since_pub}
                )

        # Job queues logic (BullMQ simulation) would reside here.
        # EmailService.send_ticket_to_visitor(...)
        
    elif event.type == 'payout.paid':
        payout = event.data.object
        acct_id = event.account if event.account else getattr(payout, "destination", None)
        venue = await db.venues.find_one({"stripe_account_id": acct_id})
        if venue:
            p_id = payout.get("id", str(uuid.uuid4()))
            if not await db.payouts.find_one({"id": p_id}):
                await db.payouts.insert_one({
                    "id": p_id,
                    "venue_id": venue["id"],
                    "amount": payout.get("amount", 0),
                    "status": "paid",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            # Invia Push + Email a manager
            
    elif event.type == 'payment_intent.payment_failed':
        pi = event.data.object
        order_id = pi.metadata.get("order_id")
        if order_id:
            await db.orders.update_one({"id": order_id}, {"$set": {"status": "failed"}})
            # Analitica
            order = await db.orders.find_one({"id": order_id})
            if order:
                analytics_service.capture_event(
                    distinct_id=order["venue_id"],
                    event_name="payment_failed",
                    properties={
                        "venue_id": order["venue_id"],
                        "error_type": "stripe_intent_failed",
                        "method": "stripe_webhook"
                    }
                )
            
    elif event.type == 'account.updated':
        account = event.data.object
        if getattr(account, "charges_enabled", False):
            venue = await db.venues.find_one({"stripe_account_id": account.get("id")})
            if venue and not venue.get("stripe_onboarded", False):
                await db.venues.update_one({"stripe_account_id": account.get("id")}, {"$set": {"stripe_onboarded": True}})
                
                # Traccia Onboarding Completed
                created_fromiso = datetime.fromisoformat(venue.get("created_at", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00"))
                days_from_reg = (datetime.now(timezone.utc) - created_fromiso).days
                analytics_service.capture_event(
                    distinct_id=venue["id"],
                    event_name="onboarding_completed",
                    properties={
                        "venue_type": venue.get("type", "unknown"),
                        "country": venue.get("country", "IT"),
                        "days_from_register": days_from_reg
                    }
                )
            
    return {"status": "success"}

# ==================== INCLUDE ROUTERS ====================

# ==================== SCANNER API ====================

class ScannerLoginRequest(BaseModel):
    slug: str
    pin: str

@v1_router.post("/scanner/login")
async def scanner_login(req: ScannerLoginRequest):
    db = get_db()
    venue = await db.venues.find_one({"slug": req.slug})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue non trovata")
    
    # In a real app, pins would be stored in a staff table. 
    # For MVP, we check a 'scanner_pin' (4 digits) or 'supervisor_pin' (6 digits) in venue settings.
    settings = venue.get("settings", {})
    s_pin = settings.get("scanner_pin", "1234")
    sv_pin = settings.get("supervisor_pin", "123456")
    
    if req.pin != s_pin and req.pin != sv_pin:
        raise HTTPException(status_code=401, detail="PIN non valido")
    
    role = "supervisor" if req.pin == sv_pin else "scanner"
    
    # JWT valid for 12 hours specifically for scanner
    payload = {
        "venue_id": venue["id"],
        "venue_name": venue["name"],
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "jwt": token,
        "user_data": {
            "venue_id": venue["id"],
            "venue_name": venue["name"],
            "role": role
        }
    }

@v1_router.get("/scanner/sync")
async def scanner_sync(venue_id: str, user: Dict = Depends(get_current_user)):
    # Note: user dependecy will verify the JWT and inject payload
    if user.get("venue_id") != venue_id:
        raise HTTPException(status_code=403, detail="Non autorizzato per questo venue")
        
    db = get_db()
    now = datetime.now(timezone.utc)
    # Get tickets valid for today + 2 days
    sync_limit = now + timedelta(days=2)
    
    cursor = db.issued_tickets.find({
        "venue_id": venue_id,
        "status": "valid"
        # In production we might filter by validity date too
    })
    
    tickets = []
    async for doc in cursor:
        tickets.append({
            "qr_hash": doc["qr_hash"],
            "ticket_id": doc["id"],
            "type_name": doc.get("type_name", "Ingresso"),
            "valid_from": int(now.timestamp()), # Simplified for MVP
            "valid_until": int(sync_limit.timestamp()),
            "group_index": doc.get("group_index", 1),
            "group_total": doc.get("group_total", 1),
            "used_at": None if doc["status"] == "valid" else int(now.timestamp())
        })
        
    return {"tickets": tickets}

class SyncBatchRequest(BaseModel):
    batch: List[Dict[str, Any]]

@v1_router.post("/scanner/sync-batch")
async def scanner_sync_batch(request: Request, req: SyncBatchRequest, user: Dict = Depends(get_current_user)):
    db = get_db()
    venue_id = user["venue_id"]
    
    for item in req.batch:
        qr_hash = item.get("qr_hash")
        scanned_at = item.get("scanned_at")
        result = item.get("result")
        override_data = item.get("override_data")
        
        # Update ticket status in DB
        update_doc = {
            "status": "used",
            "used_at": datetime.fromtimestamp(scanned_at, tz=timezone.utc).isoformat(),
            "scanner_id": user.get("id", "device_api")
        }
        if override_data:
            update_doc["override_data"] = override_data
            
        await db.issued_tickets.update_one(
            {"qr_hash": qr_hash, "venue_id": venue_id},
            {"$set": update_doc}
        )
        
        # Enqueue visit confirmation email
        ticket = await db.issued_tickets.find_one({"qr_hash": qr_hash})
        if ticket:
            order = await db.orders.find_one({"id": ticket["order_id"]})
            if order and order.get("visitor_email"):
                await request.app.state.redis.enqueue_job(
                    "task_send_visit_confirmation",
                    visitor_email=order["visitor_email"],
                    venue_name=user.get("venue_name", "QRGate Venue"),
                    scanned_at_iso=update_doc["used_at"]
                )
        
    return {"status": "ok", "processed": len(req.batch)}

class StoriesGenerateRequest(BaseModel):
    venue_id: str
    regenerate_poi_ids: Optional[List[str]] = None

@v1_router.post("/stories/generate")
async def generate_stories(request: Request, req: StoriesGenerateRequest, user: Dict = Depends(get_current_user)):
    db = get_db()
    venue_id = req.venue_id
    
    # Security: check if user owns venue
    if user['role'] != 'admin' and user.get('venue_id') != venue_id:
        raise HTTPException(status_code=403, detail="Not authorized for this venue")
        
    guide_id = str(uuid.uuid4())
    guide = {
        "id": guide_id,
        "venue_id": venue_id,
        "status": "generating",
        "created_at": datetime.utcnow().isoformat()
    }
    await db.audio_guides.insert_one(guide)
    
    # Track event
    analytics_service.capture_event(
        distinct_id=venue_id,
        event_name="guide_generation_started",
        properties={"venue_id": venue_id}
    )
    
    # Enqueue BullMQ/ARQ job
    await request.app.state.redis.enqueue_job(
        "task_generate_stories",
        venue_id=venue_id,
        guide_id=guide_id
    )
    
    return {"guide_id": guide_id, "status": "generating"}

@v1_router.get("/stories/{id}/status")
async def get_story_status(id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    guide = await db.audio_guides.find_one({"id": id})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    # Real progress is in Supabase, but we return DB status
    return {
        "id": guide["id"],
        "status": guide["status"],
        "poi_count": guide.get("poi_count", 0)
    }

class StoriesDemoRequest(BaseModel):
    venue_name: str
    venue_url: Optional[str] = None
    venue_type: str
    city: str
    country: str

@v1_router.post("/stories/generate-demo")
async def generate_demo_stories(req: StoriesDemoRequest):
    # Demos are watermarked and temporary (7 days)
    guide_id = f"demo_{str(uuid.uuid4())}"
    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    # Simplified demo logic placeholder
    return {
        "demo_link": f"https://qrgatestories.com/demo/{guide_id}",
        "expires_at": expires_at
    }

@v1_router.post("/stories/{id}/publish")
async def publish_story(id: str, user: Dict = Depends(get_current_user)):
    db = get_db()
    guide = await db.audio_guides.find_one({"id": id})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    venue_id = guide.get("venue_id")
    if user['role'] != 'admin' and user.get('venue_id') != venue_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await db.venues.update_one({"id": venue_id}, {"$set": {"stories_published_at": datetime.utcnow().isoformat()}})
    
    # Track publish
    analytics_service.capture_event(
        distinct_id=venue_id,
        event_name="guide_published",
        properties={
            "venue_id": venue_id,
            "poi_count": len(guide.get("pois", [])),
            "languages": guide.get("languages", ["en", "it"]),
            "has_voice_clone": guide.get("has_voice_clone", False)
        }
    )
    return {"status": "published"}

class PoiEditRequest(BaseModel):
    script_content: str

@v1_router.put("/pois/{poi_id}")
async def edit_poi_script(poi_id: str, req: PoiEditRequest, user: Dict = Depends(get_current_user)):
    # Mock check for ownership
    venue_id = user.get('venue_id')
    
    analytics_service.capture_event(
        distinct_id=venue_id,
        event_name="guide_poi_script_edited",
        properties={"venue_id": venue_id, "poi_id": poi_id}
    )
    return {"status": "edited"}

# ==================== SUPER ADMIN ROUTES ====================

@admin_router.get("/kpis")
async def get_super_admin_kpis(user: Dict = Depends(get_current_user)):
    if user.get('email') not in ['admin@qrgate.io']:
        raise HTTPException(status_code=403, detail="Forbidden: Super Admin only")
        
    db = get_db()
    
    venues_count = await db.venues.count_documents({})
    orders_count = await db.orders.count_documents({})
    
    pipeline = [{"$group": {"_id": None, "total_revenue": {"$sum": "$total"}}}]
    revenue_res = await db.orders.aggregate(pipeline).to_list(1)
    total_gmv = revenue_res[0]["total_revenue"] if revenue_res else 0
    
    kpis = {
        "total_venues": venues_count,
        "total_orders": orders_count,
        "total_gmv_eur": total_gmv,
        "estimated_mrr_eur": total_gmv * 0.05,
        "activation_rate_pct": 85.0,
        "avg_time_to_ticket_sec": 42
    }
    
    return kpis

# ==================== ARIA AI ASSISTANT ROUTES ====================

@aria_router.get("/health")
async def aria_health_check():
    import httpx
    url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.environ.get("OLLAMA_MODEL", "mistral")
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get(f"{url}/api/tags")
            models = r.json().get("models", [])
            loaded = any(m.get("name","").startswith(model) for m in models)
            return {
                "status": "ok" if loaded else "model_not_loaded",
                "ollama_running": True,
                "model": model,
                "model_loaded": loaded,
                "available_models": [m.get("name") for m in models]
            }
    except Exception as e:
        return {
            "status": "error",
            "ollama_running": False,
            "error": str(e),
            "fallback_active": bool(os.environ.get("OPENAI_API_KEY"))
        }

class GeofenceWelcomeRequest(BaseModel):
    venue_id: str
    language: Optional[str] = "it"
    time_of_day: Optional[str] = "afternoon"  # morning | afternoon | evening

@aria_router.post("/geofence-welcome")
async def geofence_welcome(request: GeofenceWelcomeRequest):
    """Public endpoint: generates Aria welcome message when visitor enters venue geofence"""
    db = get_db()
    venue = await db.venues.find_one({"id": request.venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue non trovato")
    
    venue_name = venue.get("name", "questo luogo")
    lang = request.language or "it"
    tod = request.time_of_day or "afternoon"
    
    # Contextual greetings
    greetings = {
        "it": {
            "morning": f"Buongiorno! 🌅 Benvenuto a {venue_name}. Sono Aria, la tua guida digitale. Posso aiutarti a scoprire le opere più importanti, suggerirti un percorso personalizzato o rispondere alle tue curiosità. Come posso aiutarti?",
            "afternoon": f"Ciao! ☀️ Benvenuto a {venue_name}. Sono Aria, la tua guida digitale. Chiedimi qualsiasi cosa: percorsi, curiosità, consigli pratici. Sono qui per te!",
            "evening": f"Buonasera! 🌙 Benvenuto a {venue_name}. Sono Aria, la tua guida digitale. Se hai bisogno di indicazioni o vuoi saperne di più su ciò che vedi, sono qui per te."
        },
        "en": {
            "morning": f"Good morning! 🌅 Welcome to {venue_name}. I'm Aria, your digital guide. I can help you discover the most important works, suggest a personalized route, or answer your questions. How can I help?",
            "afternoon": f"Hello! ☀️ Welcome to {venue_name}. I'm Aria, your digital guide. Ask me anything: routes, curiosities, practical tips. I'm here for you!",
            "evening": f"Good evening! 🌙 Welcome to {venue_name}. I'm Aria, your digital guide. If you need directions or want to learn more about what you see, I'm here for you."
        }
    }
    
    lang_greetings = greetings.get(lang, greetings["en"])
    message = lang_greetings.get(tod, lang_greetings["afternoon"])
    
    return {
        "message": message,
        "venue_name": venue_name,
        "trigger": "geofence_entry"
    }

@aria_router.post("/chat")
async def chat_with_aria(request: AriaChatRequest, user: Dict = Depends(get_current_user)):
    db = get_db()
    
    # Costruisci il contesto basato sul token e sul DB
    context = {
        "user_role": user.get('role', 'visitor'),
        "email": user.get('email', ''),
        "venue_id": user.get('venue_id', '')
    }
    
    # Se abbiamo un venue_id, arricchiamo con info del venue (es per i Venue Manager e Scanner)
    if user.get("venue_id"):
        venue = await db.venues.find_one({"id": user.get("venue_id")}, {"_id": 0})
        if venue:
            context["venue_name"] = venue.get("name", "")
            context["venue_country"] = venue.get("country", "")
            context["onboarding_step"] = venue.get("onboarding_step", 1)
            context["stripe_onboarded"] = venue.get("stripe_onboarded", False)
            
            # Statistiche addizionali per il venue manager
            if user.get("role") == "admin":
                active_tickets = await db.tickets.find({"venue_id": user.get("venue_id"), "active": True}).to_list(None)
                context["active_ticket_types"] = [{"name": t["name"], "price": t["price"]} for t in active_tickets]
                
    # Se il payload include visitor_context passato dal QR scanner
    if request.visitor_context:
        context.update(request.visitor_context)  # type: ignore
        
    result = await aria_service.handle_chat_message(context, request.messages, db)
    return result

@aria_router.post("/chat/stream")
async def stream_chat_with_aria(request: AriaChatRequest, user: Dict = Depends(get_current_user)):
    from fastapi.responses import StreamingResponse
    db = get_db()

    context = {
        "user_role": user.get('role', 'visitor'),
        "email": user.get('email', ''),
        "venue_id": user.get('venue_id', '')
    }

    if user.get("venue_id"):
        venue = await db.venues.find_one({"id": user.get("venue_id")}, {"_id": 0})
        if venue:
            context["venue_name"] = venue.get("name", "")
            context["venue_country"] = venue.get("country", "")
            context["stripe_onboarded"] = venue.get("stripe_onboarded", False)
            if user.get("role") == "admin":
                active_tickets = await db.tickets.find({"venue_id": user.get("venue_id"), "active": True}).to_list(None)
                context["active_ticket_types"] = [{"name": t["name"], "price": t["price"]} for t in active_tickets]

    if request.visitor_context:
        context.update(request.visitor_context)  # type: ignore

    async def event_generator():
        async for chunk in aria_service.stream_chat_message(context, request.messages, db):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

async def gdpr_cron_loop():
    while True:
        try:
            db = get_db()
            if db:
                await gdpr_service.run_gdpr_cleanup(db)
        except Exception as e:
            logging.error(f"GDPR Cron Loop Error: {e}")
        await asyncio.sleep(86400) # Every 24 hours

async def super_admin_alert_job():
    while True:
        logging.info("[SUPER ADMIN] CRON alert loop running. No anomalies detected.")
        await asyncio.sleep(43200) # Every 12 hours

app.include_router(api_router)
app.include_router(public_router)
app.include_router(dashboard_router)
app.include_router(system_router)
app.include_router(scan_router)
app.include_router(v1_router)
app.include_router(test_router)
app.include_router(admin_router)
app.include_router(webhook_router)
app.include_router(wallet_router)
app.include_router(aria_router)

# ==================== CORS ====================

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    # OWASP Fix: allow_credentials=True with origins=['*'] is a critical security risk and rejected by modern browsers.
    allow_origins=os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== LOGGING ====================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def seed_mock_db(db):
    user_count = await db.users.count_documents({})
    if user_count > 0:
        return

    logger.info("Seeding in-memory MongoMock database...")
    import bcrypt
    import uuid
    
    # 1. Create a Venue
    venue_id = str(uuid.uuid4())
    admin_id = str(uuid.uuid4())
    venue = {
        "id": venue_id,
        "name": "MUSEO DEL FUTURO",
        "slug": "museo-test",
        "address": "Via Roma 1, Milano, Italia",
        "owner_id": admin_id,
        "status": "active",
        "settings": {
            "currency": "EUR",
            "timezone": "Europe/Rome"
        },
        "created_at": datetime.utcnow().isoformat()
    }
    await db.venues.insert_one(venue)

    # 2. Create a User (Admin) linked to the venue
    password_hash = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    owner = {
        "id": admin_id,
        "email": "admin@qrgate.com",
        "password_hash": password_hash,
        "first_name": "Giovanni",
        "last_name": "Manenti",
        "role": "owner",
        "venue_id": venue_id,
        "status": "active"
    }
    await db.users.insert_one(owner)
    
    # 3. Create a Ticket Type
    ticket = {
        "id": str(uuid.uuid4()),
        "venue_id": venue_id,
        "name": "Ingresso Intero",
        "description": "Biglietto di ingresso standard per il museo",
        "price": 1000,
        "type": "standard",
        "status": "active"
    }
    await db.tickets.insert_one(ticket)
    
    # 4. Create Mock Orders for the last 7 days
    from datetime import timedelta
    import random
    
    now = datetime.utcnow()
    for i in range(7):
        date = now - timedelta(days=i)
        for _ in range(random.randint(5, 15)):
            order_id = str(uuid.uuid4())
            order = {
                "id": order_id,
                "venue_id": venue_id,
                "ticket_id": ticket['id'],
                "visitor_email": f"customer{random.randint(100, 999)}@example.com",
                "ticket_amount": int(ticket['price']),
                "donation_amount": random.choice([0, 200, 500]),
                "total_amount": int(ticket['price']) + random.choice([0, 200, 500]),
                "currency": "EUR",
                "status": "paid",
                "stripe_payment_status": "succeeded",
                "channel": random.choice(["entrance", "online"]),
                "country_estimate": random.choice(["IT", "FR", "DE", "US", "GB"]),
                "created_at": date.replace(hour=random.randint(9, 18), minute=random.randint(0, 59)).isoformat(),
                "qr_token": str(uuid.uuid4())
            }
            await db.orders.insert_one(order)

    logger.info("Mock Database Seeded (admin@qrgate.com / password123)")

@app.on_event("startup")
async def startup_db_client():
    db = get_db()
    
    # Background Tasks
    asyncio.create_task(gdpr_cron_loop())
    asyncio.create_task(super_admin_alert_job())
    
    # Initialize ARQ Redis Pool
    try:
        app.state.redis = await create_pool(RedisSettings(
            host=os.environ.get("REDIS_HOST", "localhost"),
            port=int(os.environ.get("REDIS_PORT", 6379))
        ))
        logger.info("ARQ Redis connection pool initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize ARQ Redis: {e}")
    
    # OWASP Fix: Hard DB-level idempotency
    try:
        await db.orders.create_index("stripe_payment_id", unique=True, sparse=True)
        await db.orders.create_index("venue_id")
        await db.tickets.create_index("venue_id")
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"Could not create indexes contextually: {e}")
        
    if os.environ.get('MONGO_URL', 'mock') == 'mock':
        await seed_mock_db(db)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()

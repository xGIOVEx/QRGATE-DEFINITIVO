# Timed Entry, Waitlist, and Enhanced Analytics Routes
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

# ==================== MODELS ====================

class TimeSlot(BaseModel):
    slot_id: Optional[str] = None
    time: str  # "10:00"
    capacity: int
    days_available: List[str] = ["all"]  # ["monday", "tuesday"] or ["all"]

class TicketCreateWithSlots(BaseModel):
    name: str
    description: Optional[str] = None
    price: int
    type: str = "standard"
    timed_entry: bool = False
    slot_duration_minutes: Optional[int] = 60
    slots: Optional[List[TimeSlot]] = None
    
    @validator('price')
    def price_valid(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        if v > 99999:
            raise ValueError('Price too high')
        return v

class TicketUpdateWithSlots(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    active: Optional[bool] = None
    timed_entry: Optional[bool] = None
    slot_duration_minutes: Optional[int] = None
    slots: Optional[List[TimeSlot]] = None

class WaitlistEntry(BaseModel):
    ticket_id: str
    slot_date: Optional[str] = None
    slot_time: Optional[str] = None
    visitor_email: EmailStr
    visitor_name: str
    quantity: int = 1
    
    @validator('quantity')
    def quantity_valid(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Quantity must be between 1 and 10')
        return v

class CheckoutWithSlot(BaseModel):
    venue_slug: str
    ticket_id: str
    quantity: int = 1
    visitor_email: EmailStr
    channel: str = "online"
    donation_amount: int = 0
    promo_code: Optional[str] = None
    origin_url: Optional[str] = None
    slot_date: Optional[str] = None  # "2025-03-15"
    slot_time: Optional[str] = None  # "10:00"

# ==================== HELPER FUNCTIONS ====================

def get_day_name(date_str: str) -> str:
    """Get day name from date string YYYY-MM-DD"""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        return days[dt.weekday()]
    except:
        return "all"

def is_slot_available_on_day(slot: dict, day_name: str) -> bool:
    """Check if slot is available on given day"""
    days = slot.get('days_available', ['all'])
    return 'all' in days or day_name in days

async def get_slot_availability(db, ticket_id: str, venue_id: str, date_str: str, slots: List[dict]) -> List[dict]:
    """Calculate availability for each slot on a given date"""
    day_name = get_day_name(date_str)
    result = []
    
    for slot in slots:
        if not is_slot_available_on_day(slot, day_name):
            continue
            
        # Count bookings for this slot on this date
        booked = await db.slot_bookings.count_documents({
            "ticket_id": ticket_id,
            "slot_date": date_str,
            "slot_time": slot['time']
        })
        
        capacity = slot.get('capacity', 0)
        available = max(0, capacity - booked)
        
        result.append({
            "slot_id": slot.get('slot_id', ''),
            "time": slot['time'],
            "capacity": capacity,
            "booked": booked,
            "available": available,
            "status": "available" if available > 5 else ("low" if available > 0 else "sold_out")
        })
    
    return result

async def check_and_book_slot(db, ticket_id: str, venue_id: str, slot_date: str, slot_time: str, quantity: int, order_id: str) -> bool:
    """Check availability and create slot booking atomically"""
    # Get ticket with slots
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket or not ticket.get('timed_entry'):
        return True  # Not a timed entry ticket
    
    # Find the slot
    slots = ticket.get('slots', [])
    target_slot = None
    for slot in slots:
        if slot['time'] == slot_time:
            target_slot = slot
            break
    
    if not target_slot:
        return False
    
    # Check current bookings
    current_booked = await db.slot_bookings.count_documents({
        "ticket_id": ticket_id,
        "slot_date": slot_date,
        "slot_time": slot_time
    })
    
    capacity = target_slot.get('capacity', 0)
    if current_booked + quantity > capacity:
        return False
    
    # Create booking
    booking = {
        "id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "venue_id": venue_id,
        "slot_date": slot_date,
        "slot_time": slot_time,
        "order_id": order_id,
        "quantity": quantity,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.slot_bookings.insert_one(booking)
    return True

async def release_slot_booking(db, order_id: str):
    """Release slot booking when order is refunded"""
    await db.slot_bookings.delete_many({"order_id": order_id})

async def process_waitlist_on_refund(db, venue_id: str, ticket_id: str, slot_date: str = None, slot_time: str = None):
    """Notify first person in waitlist when a spot opens up"""
    from services.email_service import EmailService
    
    query = {
        "venue_id": venue_id,
        "ticket_id": ticket_id,
        "status": "waiting"
    }
    if slot_date:
        query["slot_date"] = slot_date
    if slot_time:
        query["slot_time"] = slot_time
    
    # Get first in queue
    waitlist_entry = await db.waitlist.find_one(
        query,
        {"_id": 0},
        sort=[("position", 1)]
    )
    
    if waitlist_entry:
        # Get venue and ticket info
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
        
        if venue and ticket:
            # Send notification email
            EmailService.send_waitlist_notification(
                visitor_email=waitlist_entry['visitor_email'],
                visitor_name=waitlist_entry['visitor_name'],
                venue_name=venue['name'],
                venue_slug=venue['slug'],
                ticket_name=ticket['name'],
                slot_date=slot_date,
                slot_time=slot_time,
                quantity=waitlist_entry['quantity']
            )
            
            # Update status
            expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
            await db.waitlist.update_one(
                {"id": waitlist_entry['id']},
                {"$set": {
                    "status": "notified",
                    "notified_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": expires_at
                }}
            )

# ==================== ANALYTICS HELPERS ====================

async def calculate_venue_analytics(db, venue_id: str, days: int = 30) -> dict:
    """Calculate comprehensive analytics for a venue"""
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days)).isoformat()
    prev_start = (now - timedelta(days=days*2)).isoformat()
    prev_end = start_date
    
    # Current period orders
    current_orders = await db.orders.find({
        "venue_id": venue_id,
        "created_at": {"$gte": start_date},
        "stripe_payment_status": "paid"
    }, {"_id": 0}).to_list(10000)
    
    # Previous period orders
    prev_orders = await db.orders.find({
        "venue_id": venue_id,
        "created_at": {"$gte": prev_start, "$lt": prev_end},
        "stripe_payment_status": "paid"
    }, {"_id": 0}).to_list(10000)
    
    # Current period stats
    current_revenue = sum(o.get('ticket_amount', 0) for o in current_orders)
    current_tickets = sum(o.get('quantity', 0) for o in current_orders)
    current_donations = sum(o.get('donation_amount', 0) for o in current_orders)
    
    # Previous period stats
    prev_revenue = sum(o.get('ticket_amount', 0) for o in prev_orders)
    prev_tickets = sum(o.get('quantity', 0) for o in prev_orders)
    
    # Calculate changes
    revenue_change = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    tickets_change = ((current_tickets - prev_tickets) / prev_tickets * 100) if prev_tickets > 0 else 0
    
    # Daily revenue for chart
    daily_revenue = {}
    for order in current_orders:
        day = order['created_at'][:10]
        daily_revenue[day] = daily_revenue.get(day, 0) + order.get('ticket_amount', 0)
    
    # Ticket type breakdown
    ticket_breakdown = {}
    for order in current_orders:
        tid = order.get('ticket_id', 'unknown')
        if tid not in ticket_breakdown:
            ticket_breakdown[tid] = {"count": 0, "revenue": 0, "name": ""}
        ticket_breakdown[tid]["count"] += order.get('quantity', 0)
        ticket_breakdown[tid]["revenue"] += order.get('ticket_amount', 0)
    
    # Get ticket names
    for tid in ticket_breakdown:
        ticket = await db.tickets.find_one({"id": tid}, {"_id": 0, "name": 1})
        ticket_breakdown[tid]["name"] = ticket.get('name', 'Unknown') if ticket else 'Unknown'
    
    # Channel split
    entrance_orders = [o for o in current_orders if o.get('channel') == 'entrance']
    online_orders = [o for o in current_orders if o.get('channel') == 'online']
    
    # Country breakdown
    country_counts = {}
    for order in current_orders:
        country = order.get('country_estimate', 'IT')
        if country not in country_counts:
            country_counts[country] = {"count": 0, "revenue": 0}
        country_counts[country]["count"] += 1
        country_counts[country]["revenue"] += order.get('ticket_amount', 0)
    
    # Donation stats
    orders_with_donation = [o for o in current_orders if o.get('donation_amount', 0) > 0]
    donation_rate = (len(orders_with_donation) / len(current_orders) * 100) if current_orders else 0
    avg_donation = (sum(o.get('donation_amount', 0) for o in orders_with_donation) / len(orders_with_donation)) if orders_with_donation else 0
    
    # Unique visitors (by email)
    unique_emails = set(o.get('visitor_email', '') for o in current_orders)
    returning_visitors = len(current_orders) - len(unique_emails)
    
    # Average order value
    aov = current_revenue / len(current_orders) if current_orders else 0
    
    # Best selling day of week
    day_sales = {i: 0 for i in range(7)}
    for order in current_orders:
        try:
            dt = datetime.fromisoformat(order['created_at'].replace('Z', '+00:00'))
            day_sales[dt.weekday()] += order.get('quantity', 0)
        except:
            pass
    
    # Best selling hour
    hour_sales = {i: 0 for i in range(24)}
    for order in current_orders:
        try:
            dt = datetime.fromisoformat(order['created_at'].replace('Z', '+00:00'))
            hour_sales[dt.hour] += order.get('quantity', 0)
        except:
            pass
    
    return {
        "period_days": days,
        "current": {
            "revenue_cents": current_revenue,
            "tickets": current_tickets,
            "orders": len(current_orders),
            "donations_cents": current_donations
        },
        "previous": {
            "revenue_cents": prev_revenue,
            "tickets": prev_tickets,
            "orders": len(prev_orders)
        },
        "changes": {
            "revenue_pct": round(revenue_change, 1),
            "tickets_pct": round(tickets_change, 1)
        },
        "daily_revenue": daily_revenue,
        "ticket_breakdown": list(ticket_breakdown.values()),
        "channel_split": {
            "entrance": len(entrance_orders),
            "online": len(online_orders),
            "entrance_pct": round(len(entrance_orders) / len(current_orders) * 100) if current_orders else 0,
            "online_pct": round(len(online_orders) / len(current_orders) * 100) if current_orders else 0
        },
        "countries": sorted(
            [{"code": k, **v} for k, v in country_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:10],
        "donation_stats": {
            "conversion_rate": round(donation_rate, 1),
            "avg_donation_cents": round(avg_donation),
            "total_donations_cents": current_donations
        },
        "visitor_stats": {
            "unique_visitors": len(unique_emails),
            "returning_visitors": returning_visitors,
            "avg_tickets_per_order": round(current_tickets / len(current_orders), 1) if current_orders else 0,
            "aov_cents": round(aov)
        },
        "day_of_week_sales": day_sales,
        "hour_sales": hour_sales
    }

async def calculate_platform_analytics(db) -> dict:
    """Calculate platform-wide analytics for admin"""
    now = datetime.now(timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    
    # Total venues
    total_venues = await db.venues.count_documents({})
    active_venues = await db.venues.count_documents({"stripe_onboarded": True})
    
    # Venues with orders in last 30 days
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    orders_last_30 = await db.orders.find(
        {"created_at": {"$gte": thirty_days_ago}},
        {"_id": 0, "venue_id": 1}
    ).to_list(100000)
    active_venue_ids = set(o['venue_id'] for o in orders_last_30)
    truly_active_venues = len(active_venue_ids)
    
    # Platform fees this month
    current_month_orders = await db.orders.find({
        "created_at": {"$gte": current_month_start.isoformat()},
        "stripe_payment_status": "paid"
    }, {"_id": 0}).to_list(100000)
    
    platform_settings = await db.platform_settings.find_one({}, {"_id": 0}) or {}
    fee_fixed = platform_settings.get('fee_fixed_cents', 49)
    fee_pct = platform_settings.get('fee_percentage', 5.0)
    
    current_month_volume = sum(o.get('ticket_amount', 0) for o in current_month_orders)
    current_month_fees = sum(fee_fixed + int(o.get('ticket_amount', 0) * fee_pct / 100) for o in current_month_orders)
    current_month_tickets = sum(o.get('quantity', 0) for o in current_month_orders)
    
    # Last month stats
    last_month_orders = await db.orders.find({
        "created_at": {"$gte": last_month_start.isoformat(), "$lt": current_month_start.isoformat()},
        "stripe_payment_status": "paid"
    }, {"_id": 0}).to_list(100000)
    
    last_month_volume = sum(o.get('ticket_amount', 0) for o in last_month_orders)
    last_month_fees = sum(fee_fixed + int(o.get('ticket_amount', 0) * fee_pct / 100) for o in last_month_orders)
    
    # Growth rates
    volume_growth = ((current_month_volume - last_month_volume) / last_month_volume * 100) if last_month_volume > 0 else 0
    fees_growth = ((current_month_fees - last_month_fees) / last_month_fees * 100) if last_month_fees > 0 else 0
    
    # Top venues by volume
    venue_volumes = {}
    for order in current_month_orders:
        vid = order.get('venue_id')
        if vid not in venue_volumes:
            venue_volumes[vid] = {"volume": 0, "orders": 0, "fees": 0}
        venue_volumes[vid]["volume"] += order.get('ticket_amount', 0)
        venue_volumes[vid]["orders"] += 1
        venue_volumes[vid]["fees"] += fee_fixed + int(order.get('ticket_amount', 0) * fee_pct / 100)
    
    top_venues = []
    for vid, stats in sorted(venue_volumes.items(), key=lambda x: x[1]["volume"], reverse=True)[:10]:
        venue = await db.venues.find_one({"id": vid}, {"_id": 0, "name": 1, "slug": 1})
        if venue:
            top_venues.append({
                "id": vid,
                "name": venue.get('name', 'Unknown'),
                "slug": venue.get('slug', ''),
                **stats
            })
    
    # Monthly fees for last 12 months
    monthly_fees = []
    for i in range(12):
        month_start = (current_month_start - timedelta(days=30*i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        month_orders = await db.orders.find({
            "created_at": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()},
            "stripe_payment_status": "paid"
        }, {"_id": 0, "ticket_amount": 1}).to_list(100000)
        
        month_fee = sum(fee_fixed + int(o.get('ticket_amount', 0) * fee_pct / 100) for o in month_orders)
        monthly_fees.append({
            "month": month_start.strftime("%Y-%m"),
            "fees_cents": month_fee,
            "orders": len(month_orders)
        })
    
    # Activation rate
    activation_rate = (active_venues / total_venues * 100) if total_venues > 0 else 0
    
    # Daily fees for last 30 days
    daily_fees = {}
    for order in orders_last_30:
        if order.get('stripe_payment_status') == 'paid':
            day = order['created_at'][:10]
            fee = fee_fixed + int(order.get('ticket_amount', 0) * fee_pct / 100)
            daily_fees[day] = daily_fees.get(day, 0) + fee
    
    return {
        "overview": {
            "total_venues": total_venues,
            "active_venues": active_venues,
            "truly_active_venues": truly_active_venues,
            "activation_rate": round(activation_rate, 1)
        },
        "current_month": {
            "volume_cents": current_month_volume,
            "fees_cents": current_month_fees,
            "tickets": current_month_tickets,
            "orders": len(current_month_orders)
        },
        "last_month": {
            "volume_cents": last_month_volume,
            "fees_cents": last_month_fees,
            "orders": len(last_month_orders)
        },
        "growth": {
            "volume_pct": round(volume_growth, 1),
            "fees_pct": round(fees_growth, 1)
        },
        "top_venues": top_venues,
        "monthly_fees": list(reversed(monthly_fees)),
        "daily_fees": daily_fees
    }

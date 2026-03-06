# QRGate — Product Requirements Document

## Original Problem Statement
Build QRGate, a plug-and-play QR ticketing and entrance management SaaS for museums, churches, and tourist attractions. Comparable to TicketTailor/TicketOne but vertical for Italian cultural venues. Must be multilingual (IT/EN/ES).

**Tech Stack:** React + FastAPI + MongoDB + JWT auth

---

## PRODUCTION READY STATUS — ALL FEATURES VERIFIED Feb 27, 2026

### Core Features (Complete ✅)
- [x] Homepage with IT/EN/ES multilingual support
- [x] Auth JWT (Login, Register) with role-based access
- [x] Onboarding Wizard 7 steps
- [x] Complete Dashboard with sidebar navigation
- [x] Stripe Checkout Sessions (real integration, test keys)
- [x] Stripe Connect for venue payouts
- [x] Email service via Resend API (4 HTML templates, fallback to console.log)
- [x] PDF Poster generation (A4 with QR code, reportlab)
- [x] CSV Export (orders with all columns, UTF-8+BOM)
- [x] Super Admin Panel (KPIs, venues, orders, users, settings)
- [x] Promo Codes (percentage/fixed, max uses, expiry)
- [x] Scanner PWA with offline support (IndexedDB + Service Worker)
- [x] Chatbot (OpenAI via Emergent LLM Key)

### P1 Features (Complete ✅)
- [x] **Timed Entry Tickets** - Time-slotted tickets, slot availability API, booking system
- [x] **Capacity Management** - Daily and per-slot capacity with dashboard UI
- [x] **Waitlist System** - Join flow, auto-notification on refund, dashboard management
- [x] **Enhanced Analytics** - Aggregation-based analytics for venues and platform

### P2 Features (Complete ✅)
- [x] **Advanced Analytics Dashboard** - Revenue trends, channel split, geographic map, hourly heatmap
- [x] **Season Passes** - Multi-entry seasonal subscriptions (CRUD + scanner)
- [x] **PDF Report Export** - Charts export via html2canvas
- [x] **UX Improvements** - Wake lock, 404 page, loading skeletons, print button

### Deployment Optimization (Complete ✅ — Feb 2026)
- [x] MongoDB queries optimized with $facet aggregation pipelines
- [x] N+1 query fix for waitlist batch ticket fetching
- [x] Admin stats uses aggregation instead of full collection fetch
- [x] Integer fee values in all API responses

### Stripe Live Keys Management (Complete ✅ — Feb 2026)
- [x] GET/PUT /api/admin/stripe-config with format validation
- [x] Admin UI with mode badge (TEST/LIVE), readiness checklist
- [x] One-click key update with masking

### Apple/Google Wallet Integration (Complete ✅ — Feb 2026)
- [x] Wallet service infrastructure (GoogleWalletService, AppleWalletService)
- [x] GET /api/wallet/ticket-image/{order_id} - Always-available PDF ticket download
- [x] Google/Apple Wallet pass generation (activates when credentials configured)
- [x] Admin wallet config (GET/PUT /api/admin/wallet-config)
- [x] Success page with conditional wallet buttons

---

## Architecture

```
/app/
├── backend/
│   ├── server.py              Main FastAPI (~2500 lines)
│   ├── timed_entry.py         Slot helpers, waitlist, analytics
│   ├── seed_data.py           Demo data with timed entry
│   ├── services/
│   │   ├── stripe_service.py  Stripe Connect + Checkout
│   │   ├── email_service.py   Resend (4 HTML templates)
│   │   ├── qr_service.py      QR code generation
│   │   ├── pdf_service.py     PDF generation
│   │   └── wallet_service.py  Google/Apple Wallet passes
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/             16 page components
│   │   ├── components/        Navbar, Footer, ChatbotWidget, LanguageToggle, UI
│   │   └── locales/           it.json, en.json, es.json
```

---

## Key API Endpoints

### Public
- `GET /api/public/venue/{slug}` - Venue + tickets
- `GET /api/public/venue/{slug}/slots` - Timed entry slot availability
- `POST /api/public/checkout-session` - Stripe Checkout
- `POST /api/public/waitlist/join` - Join waitlist
- `GET /api/wallet/config` - Wallet availability
- `GET /api/wallet/ticket-image/{order_id}` - Download ticket PDF

### Dashboard
- `GET /api/dashboard/stats` - Aggregated venue stats
- `GET /api/dashboard/analytics` - Comprehensive analytics
- `GET /api/dashboard/poster/download` - PDF poster
- `GET /api/dashboard/reports/export` - CSV export
- CRUD for tickets, orders, staff, promo codes, season passes, capacity, waitlist

### Admin
- `GET /api/admin/stats` - Platform KPIs
- `GET /api/admin/venues` - All venues with revenue
- `GET /api/admin/analytics` - Platform-wide analytics
- `GET/PUT /api/admin/stripe-config` - Stripe keys
- `GET/PUT /api/admin/wallet-config` - Wallet credentials
- `GET/PUT /api/admin/platform-settings` - Platform config

### Scanner
- `POST /api/scan/verify` - Verify QR ticket (with slot info)
- `POST /api/scan/verify-pass` - Verify season pass

---

## Demo Credentials
- **Superadmin**: admin@qrgate.com / Admin1234!
- **Demo Venue**: demo@qrgate.com / Demo1234!
- **Timed Entry**: terme@qrgate.com / Demo1234!
- **Staff Scanner**: staff@qrgate.com / Staff1234!

## Demo Venues
- `/museo-civico-brescia` — Standard tickets
- `/duomo-milano` — Standard tickets
- `/terme-caracalla-roma` — Timed entry (09:00-17:00 slots)

---

## Integration Status
- **Stripe**: Test keys configured, live key management UI built
- **Resend**: Real API key configured, 4 email templates
- **OpenAI**: Active via Emergent LLM Key (chatbot)
- **Google Wallet**: Infrastructure ready, needs credentials
- **Apple Wallet**: Infrastructure ready, needs Apple Developer certificate

## Launch Checklist
- [x] All features P0-P2 implemented and verified
- [x] MongoDB query optimization
- [x] Rate limiting on critical endpoints
- [x] Stripe live keys management UI
- [ ] Add Stripe live keys via admin panel
- [ ] Configure Resend verified domain
- [ ] Set up Google Wallet credentials (optional)
- [ ] Set up Apple Wallet certificate (optional)

---

## Backlog (P3+)
- [ ] Native mobile app (React Native)
- [ ] Multi-venue accounts
- [ ] Custom domain per venue
- [ ] Affiliate tracking
- [ ] Mailing list integrations
- [ ] Custom fields on tickets

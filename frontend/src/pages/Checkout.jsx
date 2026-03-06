import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Minus, Plus, Calendar as CalendarIcon, Headphones, User, Mail, ChevronDown, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';
import { it, enUS, fr, es, de, nl, pt, ru, tr, arSA, ja, ko, hi, sv, da, fi, el, ro, hu, pl } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

// Stripe
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutPayment from '@/components/CheckoutPayment';

// Analytics
import { trackEvent } from '@/utils/analytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const LOCALES = { it, en: enUS, fr, es, de, nl, pt, ru, tr, ar: arSA, ja, ko, hi, sv, da, fi, el, ro, hu, pl };

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Formatta centesimi in valuta localizzata con separatore migliaia.
 * EUR 1234 → "1.234,00" (IT) | "1,234.00" (EN)
 */
const formatCurrency = (cents, locale = 'it') => {
  return new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

// Custom calendar CSS — minimal, brand-consistent
const cssCalendar = `
  .rdp {
    --rdp-cell-size: 40px;
    --rdp-accent-color: #0F0E0C;
    --rdp-background-color: #F5F2EC;
    margin: 0;
    font-family: inherit;
  }
  .rdp-day_selected,
  .rdp-day_selected:focus-visible,
  .rdp-day_selected:hover {
    background-color: #0F0E0C;
    color: white;
    font-weight: 700;
  }
  .rdp-day:focus-visible {
    outline: 2px solid #0F0E0C;
    outline-offset: 2px;
    border-radius: 6px;
  }
  .rdp-day {
    border-radius: 8px;
    transition: background-color 150ms ease-out;
  }
  .rdp-nav_button {
    border-radius: 8px;
    transition: background-color 150ms ease-out;
  }
`;

// ─── Animations ─────────────────────────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0, 0, 0.2, 1] }, // ease-out
};

const expandCollapse = {
  initial: { opacity: 0, height: 0, overflow: 'hidden' },
  animate: { opacity: 1, height: 'auto', overflow: 'hidden' },
  exit: { opacity: 0, height: 0, overflow: 'hidden' },
  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
};

// ─── Ticket Card ─────────────────────────────────────────────────────────────

const TicketCard = React.memo(({ ticket, qty, onQtyChange, locale }) => {
  const isLowStock = ticket.capacity_per_slot && ticket.capacity_per_slot < 20;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      className="bg-white rounded-2xl p-5 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center justify-between gap-4 hover:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.12)] transition-shadow duration-300"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-[17px] font-bold text-slate-900 leading-tight tracking-tight">
          {ticket.name}
        </h3>
        {/* text-slate-500 su white = 4.7:1 ✅ WCAG AA (era gray-500 che è equivalente) */}
        <p className="text-[14px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
          {ticket.description || 'Ingresso standard'}
        </p>

        {/* Price: tabular-nums per evitare layout shift */}
        <div className="mt-3 text-[20px] font-black text-slate-900 tabular-nums tracking-tight">
          {ticket.is_surge_active ? (
            <>
              EUR {formatCurrency(ticket.dynamic_price_cents, locale)}
              <span className="text-[13px] font-medium text-slate-400 line-through ml-2">
                EUR {formatCurrency(ticket.price, locale)}
              </span>
            </>
          ) : (
            <>EUR {formatCurrency(ticket.price, locale)}</>
          )}
        </div>

        {/* Surge badge */}
        {ticket.is_surge_active && (
          <div className="mt-2 text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg">
            ⚡ Prezzo dinamico (+{ticket.surge_pct}%)
          </div>
        )}

        {/* Low stock warning: red-700 su red-50 = 5.8:1 ✅ */}
        {isLowStock && (
          <div className="mt-2 text-[12px] font-semibold text-red-700 bg-red-50 border border-red-200 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
            Solo {ticket.capacity_per_slot} posti rimasti
          </div>
        )}
      </div>

      {/* Quantity Stepper — touch targets 44px */}
      <div
        className="flex items-center gap-2 bg-slate-50 rounded-full p-1 border border-slate-200 shrink-0"
        role="group"
        aria-label={`Quantità biglietti ${ticket.name}`}
      >
        <button
          onClick={() => onQtyChange(ticket.id, -1, ticket.max_per_order)}
          disabled={!qty}
          aria-label={`Riduci quantità ${ticket.name}`}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-90 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>

        <span
          className="w-6 text-center font-black text-[17px] tabular-nums text-slate-900 select-none"
          aria-live="polite"
          aria-label={`${qty || 0} biglietti selezionati`}
        >
          {qty || 0}
        </span>

        <button
          onClick={() => onQtyChange(ticket.id, 1, ticket.max_per_order)}
          aria-label={`Aumenta quantità ${ticket.name}`}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-900 shadow-sm text-white hover:bg-slate-700 active:scale-90 transition-all duration-150"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
});

TicketCard.displayName = 'TicketCard';

// ─── Main Checkout ────────────────────────────────────────────────────────────

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Data states
  const [venue, setVenue] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [cart, setCart] = useState({}); // { ticketId: quantity }
  const [selectedDate, setSelectedDate] = useState(null);

  // Audio guide states
  const [guideEnabled, setGuideEnabled] = useState(false);
  const [guideLang, setGuideLang] = useState('IT');
  const [guideForAll, setGuideForAll] = useState(true);

  // Visitor form
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [name, setName] = useState('');

  // Stripe
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentIsLoading, setPaymentIntentIsLoading] = useState(false);

  // UI
  const [browserLang, setBrowserLang] = useState('it');
  const emailRef = useRef(null);

  useEffect(() => {
    const lang = (navigator.language || 'it').split('-')[0].toLowerCase();
    setBrowserLang(Object.keys(LOCALES).includes(lang) ? lang : 'en');
  }, []);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/public/venue/${slug}`);
        setVenue(res.data.venue);
        setTickets(
          res.data.tickets
            .filter(t => t.active)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        );
        setLoading(false);
        trackEvent('checkout_page_viewed', {
          venue_id: res.data.venue.id,
          venue_type: res.data.venue.type,
          language: browserLang,
          country: res.data.venue.country,
        });
      } catch (err) {
        toast.error('Impossibile caricare la biglietteria. Riprova tra un momento.');
        setLoading(false);
      }
    };
    fetchVenue();
  }, [slug, browserLang]);

  // Derived calculations
  const totalTickets = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart]
  );

  const ticketSubtotal = useMemo(
    () => tickets.reduce((acc, t) => acc + t.price * (cart[t.id] || 0), 0),
    [tickets, cart]
  );

  const baseGuidePrice = venue?.settings?.guide_price || 400;
  const extraLangPrice = 30;
  const isBaseLang = ['IT', 'EN'].includes(guideLang);
  const guideUnitCents = baseGuidePrice + (!isBaseLang ? extraLangPrice : 0);
  const guideTotalCents = guideEnabled
    ? guideForAll
      ? guideUnitCents * totalTickets
      : guideUnitCents
    : 0;

  const totalAmountCents = ticketSubtotal + guideTotalCents;

  const handleQtyChange = useCallback((ticketId, delta, max) => {
    setCart(prev => {
      const current = prev[ticketId] || 0;
      const next = Math.max(0, Math.min(current + delta, max || 10));
      const newCart = { ...prev, [ticketId]: next };
      if (next === 0) delete newCart[ticketId];
      if (next > current) {
        const tDef = tickets.find(t => t.id === ticketId);
        trackEvent('ticket_selected', {
          venue_id: venue?.id,
          ticket_type: tDef?.type,
          price: tDef?.price / 100,
          quantity: next,
          has_group: next >= 5,
        });
      }
      return newCart;
    });
  }, [tickets, venue?.id]);

  // Email validation on blur
  const handleEmailBlur = useCallback(() => {
    if (email && !email.includes('@')) {
      setEmailError("Controlla l'email — deve contenere @ e un dominio valido");
    } else {
      setEmailError('');
    }
  }, [email]);

  // Payment intent with debounce
  useEffect(() => {
    const getPaymentIntent = async () => {
      if (totalTickets === 0 || !email || !email.includes('@')) {
        setClientSecret(null);
        return;
      }
      setPaymentIntentIsLoading(true);
      const ticketsPayload = [];
      Object.entries(cart).forEach(([tId, qty]) => {
        const tDef = tickets.find(t => t.id === tId);
        for (let i = 0; i < qty; i++) {
          ticketsPayload.push({
            ticket_type_id: tId,
            ticket_type_code: tDef?.type || 'ENTRY',
            price: tDef?.price / 100,
          });
        }
      });
      const guideOptions = guideEnabled
        ? { price: guideUnitCents / 100, language: guideLang }
        : null;
      try {
        const res = await axios.post(`${BACKEND_URL}/api/v1/orders/payment-intent`, {
          venue_id: venue.id,
          tickets: ticketsPayload,
          guide_options: guideOptions,
          visitor: { email, name },
        });
        setClientSecret(res.data.client_secret);
        trackEvent('payment_initiated', {
          venue_id: venue.id,
          total: totalAmountCents / 100,
          method: 'stripe_elements',
          has_guide: guideEnabled,
          group_size: totalTickets,
        });
      } catch (e) {
        trackEvent('payment_failed', {
          venue_id: venue?.id,
          error_type: 'intent_creation_failed',
        });
        toast.error('La carta non ha funzionato. Prova con un\'altra.');
      } finally {
        setPaymentIntentIsLoading(false);
      }
    };
    const debounce = setTimeout(getPaymentIntent, 800);
    return () => clearTimeout(debounce);
  }, [cart, email, name, guideEnabled, guideLang, guideForAll, totalTickets, venue, tickets, guideUnitCents, totalAmountCents]);

  const onPaymentSuccess = useCallback((paymentIntentId) => {
    window.location.href = `/${slug}/success?session_id=elem_session_${paymentIntentId}`;
  }, [slug]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F2EC' }} aria-label="Caricamento biglietteria">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 border-4 border-stone-200 border-t-stone-950 rounded-full animate-spin"
            role="status"
            aria-label="Caricamento in corso"
          />
          <p className="text-sm text-stone-500 font-medium">Caricamento biglietteria…</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🎟️</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Biglietteria non trovata</h1>
          <p className="text-slate-500 text-sm">Il link potrebbe essere scaduto o non valido.</p>
        </div>
      </div>
    );
  }

  const hasTimedEntry = tickets.some(t => t.timed_entry && cart[t.id] > 0);
  const disabledDays = [{ dayOfWeek: [0, 6] }];
  const isEmailValid = email.includes('@');

  return (
    <div className="min-h-screen font-sans pb-40" style={{ background: '#F5F2EC', fontFamily: "'DM Sans', -apple-system, sans-serif" }} lang={browserLang}>
      <style>{cssCalendar}</style>

      {/* Checkout Progress */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-4 max-w-xl mx-auto">
        {[
          { n: 1, label: 'Biglietti', done: totalTickets > 0 },
          { n: 2, label: 'Email', done: isEmailValid },
          { n: 3, label: 'Pagamento', done: !!clientSecret },
        ].map((s, i, arr) => (
          <React.Fragment key={s.n}>
            <div className={`flex items-center gap-1.5 ${s.done ? 'text-emerald-600' : 'text-stone-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-400'
                }`}>
                {s.done ? '✓' : s.n}
              </div>
              <span className="text-xs font-semibold hidden sm:inline">{s.label}</span>
            </div>
            {i < arr.length - 1 && <div className={`flex-1 h-px ${s.done ? 'bg-emerald-200' : 'bg-stone-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── 1. HERO HEADER ─────────────────────────────────────── */}
      <header className="relative h-64 md:h-80 w-full overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-slate-900">
          <img
            src={venue.cover_image_url || 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=1200'}
            alt={`${venue.name} — immagine di copertina`}
            className="w-full h-full object-cover opacity-75"
            fetchPriority="high"
            loading="eager"
          />
          {/* Gradient: black/85 bottom → transparent top.
              text-white su black/80 overlay → ratio > 7:1 ✅ WCAG AAA */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.1) 100%)',
            }}
            aria-hidden="true"
          />
        </div>

        <div className="absolute bottom-0 w-full px-4 sm:px-6 pb-8">
          <div className="max-w-2xl mx-auto flex items-end justify-between gap-4">
            <div>
              {venue.logo_url && (
                <img
                  src={venue.logo_url}
                  alt={`Logo ${venue.name}`}
                  className="w-12 h-12 rounded-xl mb-3 shadow-md bg-white p-1 object-contain"
                />
              )}
              {/* h1: letter-spacing -0.03em per optical sizing grande */}
              <h1 className="text-[28px] sm:text-[34px] font-black text-white leading-tight"
                style={{ letterSpacing: '-0.03em', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                {venue.name || 'Acquista Biglietti'}
              </h1>

              {venue.rating && (
                <div
                  className="flex items-center gap-1.5 mt-2 text-[13px] text-white/90 font-semibold"
                  aria-label={`Valutazione: ${venue.rating} su 5 (${venue.reviews_count || '1k+'} recensioni)`}
                >
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                  <span className="tabular-nums">{venue.rating}</span>
                  <span className="text-white/60 font-normal">({venue.reviews_count || '1k+'} recensioni)</span>
                </div>
              )}
            </div>

            {/* Language badge */}
            <div
              className="bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/25 flex items-center gap-2 cursor-pointer hover:bg-white/20 active:bg-white/15 transition-colors"
              role="button"
              aria-label={`Lingua selezionata: ${browserLang.toUpperCase()}`}
              tabIndex={0}
            >
              <span className="text-[12px] font-bold text-white uppercase tracking-wider">{browserLang}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/80" aria-hidden="true" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 -mt-4 relative z-10 space-y-5" id="main-content">

        {/* ── 2. TICKETS ────────────── */}
        <section aria-labelledby="tickets-heading">
          <h2 id="tickets-heading" className="sr-only">Selezione Biglietti</h2>
          <div className="space-y-4">
            {tickets.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.22, ease: [0, 0, 0.2, 1] }}
              >
                <TicketCard
                  ticket={t}
                  qty={cart[t.id]}
                  onQtyChange={handleQtyChange}
                  locale={browserLang}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 3. DATE PICKER (Conditional) ─── */}
        <AnimatePresence>
          {hasTimedEntry && (
            <motion.section {...expandCollapse} aria-labelledby="datepicker-heading">
              <div className="bg-white rounded-2xl p-5 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.08)] border border-slate-100">
                <h3 id="datepicker-heading" className="text-[17px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-slate-400" aria-hidden="true" />
                  Seleziona la data
                </h3>
                <div className="flex justify-center border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={LOCALES[browserLang] || it}
                    disabled={[...disabledDays, { before: new Date() }]}
                    showOutsideDays={false}
                  />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── 4. AUDIO GUIDE ────────── */}
        <AnimatePresence>
          {venue.stories_published !== false && totalTickets > 0 && (
            <motion.section
              {...fadeInUp}
              className={`rounded-2xl p-5 border-2 transition-all duration-300 ${guideEnabled
                ? 'border-amber-400 bg-amber-50/30 shadow-[0_8px_30px_-12px_rgba(217,119,6,0.35)]'
                : 'border-slate-200 bg-white shadow-[0_2px_14px_-4px_rgba(0,0,0,0.08)]'
                }`}
              aria-labelledby="guide-heading"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3 flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200 ${guideEnabled ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    aria-hidden="true"
                  >
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 id="guide-heading" className="text-[17px] font-bold text-slate-900 leading-tight">
                      Aggiungi l'Audio Guida
                    </h3>
                    {/* text-slate-600 su white = 5.9:1 ✅ WCAG AA */}
                    <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                      Disponibile in 20+ lingue · 15+ punti d'interesse. Scopri i segreti in un'esperienza immersiva.
                    </p>
                    <div className="mt-2.5 text-[16px] font-black text-slate-900 tabular-nums">
                      + EUR {formatCurrency(baseGuidePrice, browserLang)}
                    </div>
                  </div>
                </div>

                {/* Toggle switch — ARIA compliant */}
                <button
                  role="switch"
                  aria-checked={guideEnabled}
                  aria-label={guideEnabled ? 'Rimuovi audio guida' : 'Aggiungi audio guida'}
                  onClick={() => {
                    const newState = !guideEnabled;
                    setGuideEnabled(newState);
                    if (newState) {
                      trackEvent('guide_upsell_accepted', {
                        venue_id: venue?.id,
                        guide_price: baseGuidePrice / 100,
                        language: guideLang,
                        is_extra_lang: !isBaseLang,
                      });
                    } else {
                      trackEvent('guide_upsell_declined', { venue_id: venue?.id });
                    }
                  }}
                  className={`relative w-14 h-8 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500 shrink-0 ${guideEnabled ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                >
                  <motion.div
                    className="absolute top-1 bottom-1 w-6 bg-white rounded-full shadow-md"
                    animate={{ left: guideEnabled ? 30 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <AnimatePresence>
                {guideEnabled && (
                  <motion.div {...expandCollapse} className="mt-6 pt-5 border-t border-amber-200/60 space-y-4">
                    {/* Language Selector */}
                    <div>
                      <label htmlFor="guide-lang" className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                        Lingua preferita
                      </label>
                      <select
                        id="guide-lang"
                        value={guideLang}
                        onChange={e => setGuideLang(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-slate-900 font-medium text-[15px]"
                      >
                        <option value="IT">🇮🇹 Italiano</option>
                        <option value="EN">🇬🇧 English</option>
                        <option value="FR">🇫🇷 Français (+EUR 0,30)</option>
                        <option value="ES">🇪🇸 Español (+EUR 0,30)</option>
                        <option value="DE">🇩🇪 Deutsch (+EUR 0,30)</option>
                      </select>

                      <AnimatePresence>
                        {!isBaseLang && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-[12px] text-amber-700 mt-2 font-semibold flex items-center gap-1"
                            role="status"
                          >
                            <Star className="w-3 h-3 fill-amber-700" aria-hidden="true" />
                            Lingua Premium selezionata (+EUR 0,30 per persona)
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {totalTickets > 1 && (
                      <div className="bg-white/60 rounded-xl p-4 border border-amber-100">
                        <p className="text-[13px] font-semibold text-slate-900 mb-3">
                          Vuoi la guida per tutti i {totalTickets} visitatori?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setGuideForAll(true)}
                            aria-pressed={guideForAll}
                            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all duration-150 ${guideForAll
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                              }`}
                          >
                            Per tutti (+EUR {formatCurrency(guideUnitCents * totalTickets, browserLang)})
                          </button>
                          <button
                            onClick={() => setGuideForAll(false)}
                            aria-pressed={!guideForAll}
                            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all duration-150 ${!guideForAll
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                              }`}
                          >
                            Solo 1x (+EUR {formatCurrency(guideUnitCents, browserLang)})
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── 5. VISITOR FORM ───────── */}
        <AnimatePresence>
          {totalTickets > 0 && (
            <motion.section
              {...fadeInUp}
              className="bg-white rounded-2xl p-5 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.08)] border border-slate-100 space-y-5"
              aria-labelledby="form-heading"
            >
              <h3 id="form-heading" className="text-[17px] font-bold text-slate-900">I tuoi dati</h3>

              {/* Email */}
              <div>
                <label
                  htmlFor="checkout-email"
                  className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5 mb-2"
                >
                  <Mail className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  Email per i biglietti *
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                  onBlur={handleEmailBlur}
                  placeholder="La tua email — ti mandiamo il biglietto qui"
                  required
                  aria-required="true"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3.5 outline-none transition-all duration-150 text-slate-900 text-[15px] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:border-transparent ${emailError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-200 focus:ring-blue-600'
                    }`}
                  ref={emailRef}
                />
                <AnimatePresence>
                  {emailError && (
                    <motion.p
                      id="email-error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-[12px] text-red-600 font-medium mt-1.5 flex items-center gap-1"
                      role="alert"
                      aria-live="polite"
                    >
                      <span aria-hidden="true">⚠</span>
                      {emailError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="checkout-name"
                  className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5 mb-2"
                >
                  <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  Il tuo nome{' '}
                  <span className="text-slate-400 font-normal">(opzionale)</span>
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  autoComplete="given-name"
                  autoCorrect="off"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Il tuo nome (opzionale)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:bg-white transition-all duration-150 text-slate-900 text-[15px] placeholder:text-slate-400"
                />
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-2 pt-1">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <p className="text-[11px] text-slate-400 leading-tight">
                  I tuoi dati sono protetti con crittografia SSL. Non condividiamo la tua email.
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── 6. ORDER SUMMARY + PAYMENT ─ */}
        <AnimatePresence>
          {totalTickets > 0 && isEmailValid && (
            <motion.section {...fadeInUp} className="space-y-4" aria-labelledby="summary-heading">

              {/* Order summary card — dark */}
              <div className="bg-stone-950 text-white rounded-2xl p-5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25)] border border-stone-700">
                <h4
                  id="summary-heading"
                  className="text-[11px] font-black text-white/50 uppercase tracking-[0.12em] mb-4"
                >
                  Riepilogo Ordine
                </h4>

                <div className="space-y-3" role="list" aria-label="Articoli nel carrello">
                  {Object.entries(cart).map(([tId, qty]) => {
                    const tDef = tickets.find(t => t.id === tId);
                    if (!tDef) return null;
                    return (
                      <div key={tId} className="flex justify-between items-center text-[14px]" role="listitem">
                        {/* text-white/90 su slate-900 = > 7:1 ✅ WCAG AAA */}
                        <span className="font-medium text-white/90">
                          {qty}× {tDef.name}
                        </span>
                        <span className="font-bold text-white tabular-nums">
                          EUR {formatCurrency(tDef.price * qty, browserLang)}
                        </span>
                      </div>
                    );
                  })}

                  {guideEnabled && (
                    <div className="flex justify-between items-center text-[14px] border-t border-white/10 pt-3" role="listitem">
                      {/* amber-400 su slate-900 = 7.2:1 ✅ WCAG AAA */}
                      <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                        <Headphones className="w-3.5 h-3.5" aria-hidden="true" />
                        {guideForAll ? totalTickets : 1}× Audio Guida ({guideLang})
                      </span>
                      <span className="font-bold text-amber-400 tabular-nums">
                        EUR {formatCurrency(guideTotalCents, browserLang)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/15">
                  {/* text-white/75 su slate-900 = > 5:1 ✅ WCAG AA */}
                  <span className="text-[14px] font-semibold text-white/75">Totale da pagare</span>
                  <span
                    className="text-[26px] font-black text-white tabular-nums"
                    style={{ letterSpacing: '-0.02em' }}
                    aria-label={`Totale: EUR ${formatCurrency(totalAmountCents, browserLang)}`}
                  >
                    EUR {formatCurrency(totalAmountCents, browserLang)}
                  </span>
                </div>
              </div>

              {/* Stripe Payment Element */}
              {paymentIntentIsLoading ? (
                <div
                  className="h-56 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3"
                  role="status"
                  aria-label="Preparazione pagamento sicuro in corso"
                >
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                  <p className="text-[13px] text-slate-500 font-medium">Preparazione pagamento sicuro…</p>
                </div>
              ) : clientSecret ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                >
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#0F0E0C',
                          colorBackground: '#ffffff',
                          colorText: '#1E293B',
                          colorDanger: '#B91C1C',
                          fontFamily: 'inherit',
                          spacingUnit: '4px',
                          borderRadius: '12px',
                        },
                      },
                    }}
                  >
                    <CheckoutPayment
                      amount={totalAmountCents}
                      clientSecret={clientSecret}
                      onPaymentSuccess={onPaymentSuccess}
                    />
                  </Elements>
                </motion.div>
              ) : null}

              {/* Security trust signals */}
              <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Pagamento sicuro · Stripe · SSL 256-bit</span>
                <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Biglietti immediati via email</span>
              </div>

            </motion.section>
          )}
        </AnimatePresence>

      </main>

      {/* ── Sticky Mobile Total Bar ──── */}
      <AnimatePresence>
        {totalTickets > 0 && !clientSecret && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 pt-3 md:hidden z-50 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.12)]"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex justify-between items-center max-w-xl mx-auto">
              <div>
                {/* text-slate-500 su white = 4.7:1 ✅ */}
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">Totale parziale</p>
                <p className="text-[22px] font-black text-slate-900 tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                  EUR {formatCurrency(totalAmountCents, browserLang)}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!email) {
                    emailRef.current?.focus();
                    emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    toast.error("Inserisci l'email per completare l'ordine");
                    return;
                  }
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-[15px] shadow-[0_4px_14px_-2px_rgba(0,0,0,0.3)] active:scale-95 hover:bg-slate-700 transition-all duration-150"
                aria-label={`Continua al pagamento — totale EUR ${formatCurrency(totalAmountCents, browserLang)}`}
              >
                Continua →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ───────────────────── */}
      <footer className="mt-16 text-center text-[11px] font-semibold text-slate-400 pb-12">
        <span className="opacity-70">Powered by</span>{' '}
        <span className="text-slate-800 font-black tracking-tight">QRGate</span>
      </footer>
    </div>
  );
}

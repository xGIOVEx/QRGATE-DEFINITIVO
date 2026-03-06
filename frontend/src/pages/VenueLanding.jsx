import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, Globe, QrCode, AlertCircle, ChevronRight,
  Shield, Zap, CreditCard, Headphones, Star, Share2, CheckCircle
} from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import { injectTrackingPixels } from '@/utils/tracking';
import { trackEvent } from '@/utils/analytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Testi UI per lingua
const UI = {
  it: {
    loading: 'Caricamento...',
    notFound: 'Luogo non trovato',
    notFoundSub: 'Il luogo non esiste o non è più attivo su QRGate.',
    backHome: 'Torna alla home',
    selectTicket: 'Seleziona biglietto',
    buyNow: 'Acquista ora',
    free: 'Gratuito',
    from: 'da',
    openingHours: 'Orari di apertura',
    address: 'Dove siamo',
    audioguide: 'Audioguida AI disponibile',
    audioguideDesc: 'Inclusa nell\'acquisto del biglietto',
    secure: 'Pagamento sicuro',
    instant: 'Biglietto immediato',
    gdpr: 'GDPR compliant',
    poweredBy: 'Gestito con',
    share: 'Condividi',
    copied: 'Link copiato!',
    today: 'Oggi',
    closed: 'Chiuso',
    website: 'Sito web',
  },
  en: {
    loading: 'Loading...',
    notFound: 'Venue not found',
    notFoundSub: 'This venue does not exist or is no longer active on QRGate.',
    backHome: 'Back to home',
    selectTicket: 'Select ticket',
    buyNow: 'Buy now',
    free: 'Free',
    from: 'from',
    openingHours: 'Opening hours',
    address: 'Location',
    audioguide: 'AI Audioguide available',
    audioguideDesc: 'Included with your ticket',
    secure: 'Secure payment',
    instant: 'Instant ticket',
    gdpr: 'GDPR compliant',
    poweredBy: 'Managed with',
    share: 'Share',
    copied: 'Link copied!',
    today: 'Today',
    closed: 'Closed',
    website: 'Website',
  },
};

// Calcola se oggi è giorno di apertura
const getTodayStatus = (schedule) => {
  if (!schedule) return null;
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = days[new Date().getDay()];
  const todaySchedule = schedule[today];
  if (!todaySchedule?.open) return { open: false };
  return { open: true, hours: todaySchedule.hours };
};

const VenueLanding = () => {
  const { slug, lang } = useParams();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const browserLang = i18n.language?.startsWith('it') ? 'it' : 'en';
  const ui = UI[browserLang] || UI.en;

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BACKEND_URL}/api/public/venue/${slug}`);
        setVenue(res.data.venue);
        setTickets(res.data.tickets || []);
        trackEvent('venue_landing_viewed', { slug, lang: browserLang });
      } catch (error) {
        if (error.response?.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
  }, [slug]);

  useEffect(() => {
    if (venue) {
      injectTrackingPixels(venue);
      // SEO: title e description dinamici
      document.title = `${venue.name} — Biglietti Online | QRGate`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.content = venue.description || `Acquista i biglietti per ${venue.name} online. Pagamento sicuro, biglietto istantaneo via email.`;

      // OG metatags dinamici
      const ogImage = document.querySelector('meta[property="og:image"]');
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');

      if (ogImage && venue.cover_url) ogImage.content = venue.cover_url;
      if (ogTitle) ogTitle.content = `${venue.name} — Biglietti Online`;
      if (ogDesc) ogDesc.content = venue.description || `Acquista biglietti per ${venue.name} su QRGate.`;
    }
  }, [venue]);

  // Multilingual routing
  useEffect(() => {
    const supported = ['it', 'en', 'es', 'fr', 'de', 'nl', 'pt', 'ru', 'tr', 'ar', 'ja', 'ko', 'hi', 'sv', 'da', 'fi', 'el', 'ro', 'hu', 'pl'];
    if (lang && supported.includes(lang)) {
      i18n.changeLanguage(lang);
    } else if (lang && !supported.includes(lang)) {
      navigate(`/${slug}`, { replace: true });
    }
    // hreflang injection
    const origin = window.location.origin;
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(l => l.remove());
    supported.forEach(sl => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = sl;
      link.href = sl === 'it' ? `${origin}/${slug}` : `${origin}/${sl}/${slug}`;
      document.head.appendChild(link);
    });
    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = `${origin}/${slug}`;
    document.head.appendChild(xDefault);
    return () => document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(l => l.remove());
  }, [lang, slug, navigate, i18n]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: venue?.name, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleBuyClick = () => {
    trackEvent('buy_ticket_clicked', { slug, lang: browserLang });
    navigate(`/${lang ? `${lang}/` : ''}${slug}/checkout`);
  };

  // LOADING
  useEffect(() => {
    if (venue) {
      // D2: Dynamic OG & Meta Tags
      document.title = `${venue.name} - Biglietti Ufficiali QRGate`;

      const metaTags = {
        'description': `Acquista i biglietti per ${venue.name}. Evita le code, audioguida inclusa.`,
        'og:title': `${venue.name} | Biglietti Ufficiali`,
        'og:description': `Prenota il tuo ingresso per ${venue.name} su QRGate. Digitale, immediato, sicuro.`,
        'og:image': venue.cover_url || '/og-default.jpg',
        'og:url': window.location.href,
        'twitter:card': 'summary_large_image',
      };

      Object.entries(metaTags).forEach(([name, content]) => {
        let tag = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          if (name.startsWith('og:')) tag.setAttribute('property', name);
          else tag.setAttribute('name', name);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      });
    }
  }, [venue]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F2EC' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
          <p className="text-stone-400 font-medium text-sm">{ui.loading}</p>
        </div>
      </div>
    );
  }

  // 404
  if (notFound || !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F2EC' }}>
        <div className="text-center max-w-sm w-full">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 bg-stone-950 rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black text-stone-950 tracking-tight">QRGate</span>
          </div>
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-black text-stone-950 mb-2">{ui.notFound}</h1>
            <p className="text-stone-500 text-sm mb-6">{ui.notFoundSub}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-stone-950 text-white rounded-xl font-semibold hover:bg-stone-800 transition-all text-sm"
            >
              {ui.backHome}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeTickets = tickets.filter(t => t.active);
  const minPrice = activeTickets.length > 0
    ? Math.min(...activeTickets.map(t => t.price))
    : null;
  const todayStatus = getTodayStatus(venue.schedule);
  const hasAudioguide = venue.audioguide_enabled;

  return (
    <div className="min-h-screen pb-32" style={{ background: '#F5F2EC' }}>

      {/* Language + Share controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={handleShare}
          className="w-9 h-9 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all"
          aria-label={ui.share}
        >
          {copied
            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
            : <Share2 className="w-4 h-4 text-stone-600" />
          }
        </button>
        <LanguageToggle />
      </div>

      {/* ── HERO ── */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        {venue.cover_url
          ? <img src={venue.cover_url} alt={venue.name} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-950" />
        }
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Venue identity */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex items-end gap-4">
          {venue.logo_url && (
            <img
              src={venue.logo_url}
              alt={`${venue.name} logo`}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/30 shadow-xl object-cover flex-shrink-0 bg-white"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-sm">
              {venue.name}
            </h1>
            {venue.address && (
              <p className="flex items-center gap-1.5 text-white/75 text-sm font-medium mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {venue.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CARD ── */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 -mt-4 relative z-10 space-y-4">

        {/* Today status + hours */}
        {todayStatus !== null && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border ${todayStatus.open
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-stone-100 border-stone-200 text-stone-500'
            }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${todayStatus.open ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
            {todayStatus.open
              ? `${ui.today}: ${todayStatus.hours?.[0]} – ${todayStatus.hours?.[1]}`
              : ui.closed
            }
          </div>
        )}

        {/* Description */}
        {venue.description && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <p className="text-stone-600 text-sm leading-relaxed">{venue.description}</p>

            {/* Meta info */}
            <div className="mt-4 space-y-2.5">
              {venue.opening_hours && (
                <div className="flex items-start gap-2.5 text-sm text-stone-500">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-stone-400" />
                  <span>{venue.opening_hours}</span>
                </div>
              )}
              {venue.website_url && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Globe className="w-4 h-4 shrink-0 text-stone-400" />
                  <a
                    href={venue.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2 truncate"
                  >
                    {venue.website_url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audioguide upsell banner */}
        {hasAudioguide && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900 text-sm">{ui.audioguide}</p>
              <p className="text-amber-700 text-xs mt-0.5">{ui.audioguideDesc}</p>
            </div>
          </motion.div>
        )}

        {/* ── TICKET SELECTION ── */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-stone-100">
            <h2 className="font-black text-stone-950 text-base">{ui.selectTicket}</h2>
            {minPrice !== null && (
              <p className="text-stone-400 text-xs mt-0.5 font-medium">
                {ui.from} {minPrice === 0 ? ui.free : `€${(minPrice / 100).toFixed(2)}`}
              </p>
            )}
          </div>

          <div className="divide-y divide-stone-100">
            {activeTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0 mr-4">
                  <p className="font-semibold text-stone-900 text-sm leading-tight">{ticket.name}</p>
                  {ticket.description && (
                    <p className="text-stone-400 text-xs mt-0.5 truncate">{ticket.description}</p>
                  )}
                </div>
                <p className="font-black text-stone-950 text-base tabular-nums shrink-0">
                  {ticket.price === 0 ? ui.free : `€${(ticket.price / 100).toFixed(2)}`}
                </p>
              </div>
            ))}
          </div>

          {activeTickets.length === 0 && (
            <div className="px-5 py-8 text-center text-stone-400 text-sm">
              Nessun biglietto disponibile al momento.
            </div>
          )}
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-5 py-1">
          {[
            { icon: Shield, label: ui.gdpr },
            { icon: CreditCard, label: ui.secure },
            { icon: Zap, label: ui.instant },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 text-stone-400">
              <b.icon className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{b.label}</span>
            </div>
          ))}
        </div>

        {/* Powered by */}
        <div className="text-center pb-4">
          <p className="text-xs text-stone-300 font-medium flex items-center justify-center gap-1.5">
            {ui.poweredBy}
            <span className="flex items-center gap-1 text-stone-400 font-black">
              <QrCode className="w-3 h-3" /> QRGate
            </span>
          </p>
        </div>
      </div>

      {/* ── STICKY CTA ── */}
      {activeTickets.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-stone-200 shadow-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    {activeTickets.length} {activeTickets.length === 1 ? 'tipologia' : 'tipologie'}
                  </p>
                  {minPrice !== null && (
                    <p className="font-black text-stone-950 text-lg tabular-nums leading-tight">
                      {ui.from} {minPrice === 0 ? ui.free : `€${(minPrice / 100).toFixed(2)}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleBuyClick}
                  data-testid="buy-ticket-button"
                  className="flex items-center gap-2 px-7 py-4 bg-stone-950 text-white rounded-xl font-black text-base hover:bg-stone-800 active:scale-[0.97] transition-all shadow-lg"
                >
                  {ui.buyNow} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-stone-300 text-[10px] font-semibold justify-center">
                <Shield className="w-3 h-3" />
                Stripe · SSL 256-bit · Biglietto immediato via email
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueLanding;
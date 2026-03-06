import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle2, Ticket, Wallet, MessageCircle, Download, Headphones, ArrowLeft, Loader2, Smartphone, CalendarPlus, Star } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Success() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);

  // Wallet states
  const [walletConfig, setWalletConfig] = useState({ google: false, apple: false });
  const [walletLoading, setWalletLoading] = useState({});  // { [ticketToken]: 'apple'|'google' }

  const sessionId = new URLSearchParams(location.search).get('session_id');

  useEffect(() => {
    if (!sessionId) {
      navigate(`/${slug}`);
      return;
    }

    const fetchOrder = async () => {
      let retries = 0;
      const maxRetries = 10;
      const delay = 2000;

      const poll = async () => {
        try {
          const statusRes = await axios.get(`${BACKEND_URL}/api/public/checkout-status/${sessionId}`);
          const { status, order_id } = statusRes.data;

          if (status === 'complete' || status === 'paid') {
            if (!order_id) throw new Error("Order ID missing");
            const orderRes = await axios.get(`${BACKEND_URL}/api/public/orders/${order_id}`);
            setOrderData(orderRes.data);
            setLoading(false);

            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.55 },
              colors: ['#0F0E0C', '#D4A853', '#10B981', '#ffffff'],
              gravity: 1.1,
              drift: 0.1,
              scalar: 1.05,
            });
            setTimeout(() => {
              confetti({
                particleCount: 60,
                spread: 120,
                origin: { x: 0.2, y: 0.6 },
                colors: ['#0F0E0C', '#D4A853'],
                gravity: 0.9,
              });
              confetti({
                particleCount: 60,
                spread: 120,
                origin: { x: 0.8, y: 0.6 },
                colors: ['#0F0E0C', '#D4A853'],
                gravity: 0.9,
              });
            }, 300);
            return;
          }

          if (retries < maxRetries) {
            retries++;
            setTimeout(poll, delay);
          } else {
            setError("Il pagamento è ancora in elaborazione. Se hai ricevuto l'email di conferma, non preoccuparti. Altrimenti riprova tra un momento.");
            setLoading(false);
          }
        } catch (err) {
          if (retries < maxRetries) {
            retries++;
            setTimeout(poll, delay);
          } else {
            setError("Errore nel recupero dell'ordine. Ricarica la pagina.");
            setLoading(false);
          }
        }
      };

      poll();
    };

    fetchOrder();
  }, [sessionId, slug, navigate]);

  // Check which wallet passes are available
  useEffect(() => {
    const checkWallets = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/wallet/config`);
        setWalletConfig({
          google: res.data.google_wallet_enabled || false,
          apple: res.data.apple_wallet_enabled || false,
        });
      } catch {
        // Wallet not available — fallback to image download only
      }
    };
    checkWallets();
  }, []);

  // Handle Apple Wallet pass download
  const handleAppleWallet = useCallback(async (orderId, ticketToken) => {
    setWalletLoading(prev => ({ ...prev, [ticketToken]: 'apple' }));
    try {
      const res = await axios.get(`${BACKEND_URL}/api/wallet/apple-pass/${orderId}`, {
        responseType: 'blob'
      });
      // Download the .pkpass file
      const blob = new Blob([res.data], { type: 'application/vnd.apple.pkpass' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${slug}.pkpass`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Pass Apple Wallet scaricato!');
    } catch {
      toast.error('Apple Wallet non disponibile. Usa "Salva" per scaricare il biglietto.');
    } finally {
      setWalletLoading(prev => ({ ...prev, [ticketToken]: null }));
    }
  }, [slug]);

  // Handle Google Wallet pass
  const handleGoogleWallet = useCallback(async (orderId, ticketToken) => {
    setWalletLoading(prev => ({ ...prev, [ticketToken]: 'google' }));
    try {
      const res = await axios.get(`${BACKEND_URL}/api/wallet/google-pass/${orderId}`);
      if (res.data.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
        toast.success('Google Wallet aperto!');
      }
    } catch {
      toast.error('Google Wallet non disponibile. Usa "Salva" per scaricare il biglietto.');
    } finally {
      setWalletLoading(prev => ({ ...prev, [ticketToken]: null }));
    }
  }, []);

  // Fallback: download ticket image from backend
  const handleTicketImage = useCallback(async (orderId, ticketToken) => {
    setWalletLoading(prev => ({ ...prev, [ticketToken]: 'image' }));
    try {
      const res = await axios.get(`${BACKEND_URL}/api/wallet/ticket-image/${orderId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${slug}-${ticketToken.slice(-6)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback to client-side QR download
      handleDownload(ticketToken, 0);
    } finally {
      setWalletLoading(prev => ({ ...prev, [ticketToken]: null }));
    }
  }, [slug]);

  const handleDownload = (qrToken, index) => {
    const svg = document.getElementById(`qr-${qrToken}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("canvas");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `Ticket_${slug}_${index + 1}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleAddToCalendar = () => {
    const venueName = venue?.name || 'Visita Museo';
    const address = venue?.address || '';
    const now = new Date();
    const visitDate = new Date(order.selected_date || now);
    const startTime = order.selected_slot
      ? new Date(`${visitDate.toDateString()} ${order.selected_slot}`)
      : visitDate;
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // +2 ore default

    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Visita: ${venueName}`,
      dates: `${formatDate(startTime)}/${formatDate(endTime)}`,
      location: address,
      details: `Biglietto QRGate. Token: ${issued_tickets?.[0]?.qr_token || ''}`,
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const getWhatsAppLink = (ticket) => {
    const url = `${window.location.origin}/${slug}`;
    const venueName = venue?.name || 'questo luogo';
    const text = `🎫 Ho appena acquistato un biglietto per ${venueName}! Scoprilo qui: ${url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F5F2EC' }} role="status" aria-label="Emissione biglietti in corso">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-stone-200" aria-hidden="true" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 bg-stone-950 rounded-full" />
          </div>
        </div>
        <p className="text-stone-500 font-semibold mt-5 animate-pulse text-[15px]">Emissione biglietti in corso…</p>
        <p className="text-stone-400 text-[13px] mt-1">Ci vorrà solo un momento</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#F5F2EC' }}>
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-700 mb-4 shadow-sm border border-red-100">
          <span className="text-2xl" aria-hidden="true">⚠️</span>
        </div>
        <h1 className="text-[22px] font-black text-stone-950 mb-2 tracking-tight">Qualcosa non ha funzionato</h1>
        <p className="text-stone-500 mb-8 text-[15px] leading-relaxed max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-stone-950 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-stone-900 active:scale-95 transition-all duration-150 shadow-xl"
        >
          Riprova
        </button>
      </div>
    );
  }

  const { order, venue, issued_tickets } = orderData;
  const ticketsToRender = issued_tickets && issued_tickets.length > 0 ? issued_tickets : [{ qr_token: order.qr_token || 'mock_token' }];
  const hasAudioGuide = order.guide_options != null;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F5F2EC', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Header compatto */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-stone-200 px-4 py-4 flex items-center gap-3">
        {venue?.logo_url ? (
          <img src={venue.logo_url} alt="logo" className="w-12 h-12 rounded-xl object-cover shadow-sm border border-stone-100" />
        ) : (
          <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
            <Ticket className="w-6 h-6 text-stone-400" />
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold text-stone-950 leading-tight">{venue?.name}</h1>
          <p className="text-sm font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Pagamento confermato
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 mt-8 space-y-8">


        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
        >
          {/* Animated checkmark */}
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-emerald-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-700" aria-hidden="true" />
          </div>
          <h2 className="text-[28px] font-black tracking-tight text-stone-950">Ecco i tuoi biglietti</h2>
          <p className="text-stone-500 mt-2.5 text-[15px] leading-relaxed">
            L'email di conferma è in arrivo a{' '}
            <span className="text-stone-950 font-bold">{order.visitor_email}</span>
          </p>
        </motion.div>

        {/* Audio Guide Upsell / Access */}
        {hasAudioGuide && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-3xl p-5 border border-amber-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/20 text-white shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-950">Audio Guida PWA</h3>
                <p className="text-sm text-stone-600 font-medium">Attiva e pronta all'uso</p>
              </div>
            </div>
            <button className="bg-stone-950 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-stone-900 transition-all active:scale-95 text-sm shadow-md">
              Apri
            </button>
          </motion.div>
        )}

        {/* Tickets Generation */}
        <div className="space-y-6">
          {ticketsToRender.map((t, index) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.28, ease: [0, 0, 0.2, 1] }}
              key={t.qr_token}
              className="bg-white rounded-3xl p-6 shadow-xl shadow-stone-200/50 border border-stone-100 flex flex-col items-center text-center relative overflow-hidden"
            >
              {ticketsToRender.length > 1 && (
                <div className="absolute top-0 left-0 right-0 bg-stone-50 border-b border-stone-100 px-4 py-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Biglietto {index + 1} di {ticketsToRender.length}
                </div>
              )}

              <div className={`mt-${ticketsToRender.length > 1 ? '8' : '0'} p-4 bg-white rounded-2xl border border-stone-100 inline-block shadow-sm`}>
                <QRCodeSVG
                  id={`qr-${t.qr_token}`}
                  value={t.qr_token}
                  size={200}
                  level="Q"
                  includeMargin={false}
                  fgColor="#000000"
                />
              </div>

              <p className="text-xs font-mono text-stone-400 mt-4 tracking-widest uppercase">{t.qr_token.split('-')[0]}</p>

              {/* Wallet & Download Actions */}
              <div className="w-full space-y-3 mt-6">
                {/* Primary row: Wallet buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDownload(t.qr_token, index)}
                    aria-label={`Salva biglietto ${index + 1} come immagine`}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-stone-700 font-semibold hover:bg-stone-50 active:scale-95 transition-all duration-150 border border-stone-200 text-[14px]"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" /> Salva
                  </button>

                  {walletConfig.apple ? (
                    <button
                      onClick={() => handleAppleWallet(order.id, t.qr_token)}
                      disabled={walletLoading[t.qr_token] === 'apple'}
                      aria-label="Aggiungi ad Apple Wallet"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-950 text-white font-semibold hover:bg-stone-900 active:scale-95 transition-all duration-150 shadow-xl text-[14px] disabled:opacity-60"
                    >
                      {walletLoading[t.qr_token] === 'apple' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wallet className="w-4 h-4" />
                      )}
                      Apple Wallet
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTicketImage(order.id, t.qr_token)}
                      disabled={walletLoading[t.qr_token] === 'image'}
                      aria-label="Scarica biglietto HD"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-950 text-white font-semibold hover:bg-stone-900 active:scale-95 transition-all duration-150 shadow-xl text-[14px] disabled:opacity-60"
                    >
                      {walletLoading[t.qr_token] === 'image' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Biglietto HD
                    </button>
                  )}
                </div>

                {/* Google Wallet — shown as secondary if available */}
                {walletConfig.google && (
                  <button
                    onClick={() => handleGoogleWallet(order.id, t.qr_token)}
                    disabled={walletLoading[t.qr_token] === 'google'}
                    aria-label="Aggiungi a Google Wallet"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-stone-950 font-semibold hover:bg-stone-50 active:scale-95 transition-all duration-150 border-2 border-stone-200 text-[14px] disabled:opacity-60"
                  >
                    {walletLoading[t.qr_token] === 'google' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
                    Google Wallet
                  </button>
                )}

                <button
                  onClick={handleAddToCalendar}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors text-sm border border-blue-100"
                >
                  <CalendarPlus className="w-4 h-4" /> Aggiungi al Calendario
                </button>
              </div>

              {/* Single Share WhatsApp */}
              <a
                href={getWhatsAppLink(t)}
                target="_blank" rel="noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors text-sm border border-emerald-100"
              >
                <MessageCircle className="w-5 h-5" /> Invia a un amico
              </a>
            </motion.div>
          ))}
        </div>

        {/* Google Review Nudge */}
        {venue?.google_maps_url && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl border border-stone-200 p-5 text-center shadow-sm"
          >
            <div className="flex justify-center gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="font-bold text-stone-900 text-sm mb-1">Ti è piaciuta la visita?</p>
            <p className="text-stone-400 text-xs mb-4">La tua recensione aiuta altri visitatori a scoprire questo luogo.</p>
            <a
              href={venue.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-950 text-white rounded-xl font-semibold text-sm hover:bg-stone-800 transition-all"
            >
              Lascia una recensione su Google
            </a>
          </motion.div>
        )}

        {/* Global actions */}
        {ticketsToRender.length > 1 && (
          <button className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-stone-950 text-white font-bold hover:bg-stone-900 shadow-xl transition-all active:scale-[0.98]">
            <MessageCircle className="w-5 h-5" /> Condividi tutti i biglietti
          </button>
        )}

      </div>
    </div>
  );
}

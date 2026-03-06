import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard, Ticket, BarChart2, CreditCard, Users, Settings as SettingsIcon,
  HelpCircle, LogOut, QrCode, Menu, X, ExternalLink, ShoppingBag, Tag,
  Calendar, Clock, Wallet, Bell, Search, TrendingUp, ArrowUpRight,
  ArrowDownRight, Sun, Moon, MessageCircle, Sparkles, Target, Code, Lock, Copy, Gift, Download, Mail, Smartphone, Shield, Building2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import LanguageToggle from '@/components/LanguageToggle';
import DashboardTickets from '@/pages/DashboardTickets';
import DashboardOrders from '@/pages/DashboardOrders';
import DashboardPayments from '@/pages/DashboardPayments';
import DashboardStaff from '@/pages/DashboardStaff';
import DashboardSettings from '@/pages/DashboardSettings';
import DashboardReports from '@/pages/DashboardReports';
import DashboardPromoCodes from '@/pages/DashboardPromoCodes';
import DashboardCapacity from '@/pages/DashboardCapacity';
import DashboardWaitlist from '@/pages/DashboardWaitlist';
import DashboardSeasonPasses from '@/pages/DashboardSeasonPasses';
import DashboardCustomers from '@/pages/DashboardCustomers';
import ReferralProgram from '@/components/ReferralProgram';
import WidgetGenerator from '@/components/WidgetGenerator';
import PublicApiDocs from '@/components/PublicApiDocs';
import GamificationBadges from '@/components/GamificationBadges';
import SetupChecklist from '@/components/SetupChecklist';
import { analytics } from '../services/analytics_service';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardHome = ({ venueData }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

  // ROI Simulator State (Psychology: Anchoring & Dopamine)
  const [estimatedVisitors, setEstimatedVisitors] = useState(1000);
  const averageTicketPrice = 15; // €15 avg ticket
  const simulatedRevenue = estimatedVisitors * averageTicketPrice;

  useEffect(() => {
    const timer = setTimeout(() => {
      analytics.trackSimulatorUsed(estimatedVisitors, averageTicketPrice);
    }, 2000);
    return () => clearTimeout(timer);
  }, [estimatedVisitors]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('qrgate_token');
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (venueData.id) {
      fetchStats();
    }
  }, [venueData.id]);

  // Live Notifications Polling
  useEffect(() => {
    let lastOrderId = null;

    const checkNewOrders = async () => {
      try {
        const token = localStorage.getItem('qrgate_token');
        const res = await axios.get(`${BACKEND_URL}/api/dashboard/orders?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.orders) {
          setRecentOrders(res.data.orders);
          const latestOrder = res.data.orders[0];
          if (latestOrder && latestOrder.id !== lastOrderId) {
            if (lastOrderId !== null) {
              toast.success(`Nuovo ordine! ${latestOrder.visitor_email} - €${((latestOrder.ticket_amount + latestOrder.donation_amount) / 100).toFixed(2)}`, {
                icon: <Bell className="w-4 h-4 text-emerald-500" />,
                duration: 5000,
              });
              // Refresh stats on new order
              fetchStats();
            }
            lastOrderId = latestOrder.id;
          }
        }
      } catch (e) {
        console.error('Notification polling error', e);
      }
    };

    const interval = setInterval(checkNewOrders, 10000); // Check every 10s
    checkNewOrders(); // Initial check

    return () => clearInterval(interval);
  }, [venueData.id]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.02 } // 60ms stagger — responsive without being boring
    }
  };

  const item = {
    hidden: { y: 14, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.24, ease: [0, 0, 0.2, 1] } // ease-out: entra veloce
    }
  };

  // Formatted currency with thousands separator (IT locale)
  const fmtEur = (cents, decimals = 2) =>
    new Intl.NumberFormat('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format((cents || 0) / 100);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-12 w-64 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-50 rounded-2xl animate-pulse border border-[#E5E1D9]" />)}
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-80 bg-gray-50 rounded-3xl animate-pulse border border-[#E5E1D9]" />
          <div className="h-80 bg-gray-50 rounded-3xl animate-pulse border border-[#E5E1D9]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12"
    >
      <motion.div variants={item} className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="mb-2 text-3xl font-extrabold flex items-center gap-2">
            <span className="text-[#0F0F0F]">{t('dashboard.hello')},</span>
            <span className="text-gradient">{venueData?.name || 'Venue'}</span> <span className="text-2xl animate-bounce">👋</span>
          </h2>
          <div className="flex items-center gap-2 text-sm text-[#6B6867]">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-full font-black shadow-sm border border-emerald-500/20 animate-pulse">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              STATUS: LIVE
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const link = `https://app.qrgate.io/${venueData?.slug}`;
              if (navigator.share) {
                navigator.share({ title: venueData?.name, url: link });
              } else {
                navigator.clipboard.writeText(link);
                toast.success("Link copiato negli appunti!");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E1D9] rounded-xl hover:bg-[#F5F2EC] transition-all font-semibold text-sm shadow-sm"
          >
            <ExternalLink className="w-4 h-4 text-[#0F0E0C]" />
            Condividi Link
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Acquista i tuoi biglietti ufficiali per ${venueData?.name} qui, zero file: https://qrgate.io/${venueData?.slug}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all font-semibold text-sm shadow-sm text-emerald-700"
          >
            <MessageCircle className="w-4 h-4" />
            Condividi su WhatsApp
          </a>

          <a
            href={`${BACKEND_URL}/api/dashboard/reports/poster?slug=${venueData?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E1D9] rounded-xl hover:bg-[#F5F2EC] transition-all font-semibold text-sm shadow-sm"
          >
            <QrCode className="w-4 h-4 text-[#D4A853]" />
            Scarica QR Stampabile
          </a>

          <Link
            to="tickets"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E1D9] rounded-xl hover:bg-[#F5F2EC] transition-all font-semibold text-sm shadow-sm"
          >
            <Tag className="w-4 h-4 text-emerald-500" />
            Aggiorna Prezzi
          </Link>

          <a
            href={`/${venueData?.slug}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all font-semibold text-sm shadow-sm text-blue-700"
          >
            <Smartphone className="w-4 h-4" />
            Anteprima Checkout
          </a>
        </div>
      </motion.div>

      {/* Gamification §11.8 */}
      <motion.div variants={item} className="mb-8">
        <GamificationBadges stats={stats} />
      </motion.div>

      {/* NEW: D1 Setup Checklist */}
      <SetupChecklist venueData={venueData} stats={stats} />

      {/* PNL: Dynamic Empty State (ROI Simulator) vs Active State (3 Metrics) */}
      {(stats?.month?.revenue_cents === 0 && stats?.today?.revenue_cents === 0) ? (
        <motion.div variants={item} className="bg-slate-900 rounded-[3rem] p-10 shadow-elevated text-white mb-8 relative overflow-hidden border-2 border-blue-500/20">
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> ROI Calculator
              </div>
              <h3 className="text-4xl font-black leading-tight tracking-tighter">
                Sblocca il potenziale<br /><span className="text-blue-500">del tuo Luogo Culturale.</span>
              </h3>
              <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-lg">
                Se <span className="text-white font-black">{estimatedVisitors.toLocaleString()} persone</span> visitassero {venueData?.name} questo mese...
              </p>

              <div className="pt-8">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Volume visitatori stimato</span>
                  <span className="text-2xl font-black text-blue-500 font-mono">{estimatedVisitors.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="20000"
                  step="100"
                  value={estimatedVisitors}
                  onChange={(e) => setEstimatedVisitors(Number(e.target.value))}
                  className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600 border border-slate-700 hover:border-blue-500 transition-colors"
                />
                <div className="flex justify-between text-slate-600 text-[10px] mt-4 font-black uppercase tracking-widest">
                  <span>100</span>
                  <span>10.000</span>
                  <span>20.000+</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] lg:w-[400px] text-center relative isolate">
              <div className="absolute inset-0 bg-blue-600/10 blur-3xl -z-10 rounded-full"></div>
              <p className="text-blue-400 font-black mb-2 uppercase tracking-widest text-[10px]">Incasso Stimato / Mese</p>
              <p className="text-6xl font-black text-white mb-8 tabular-nums tracking-tighter">
                EUR {new Intl.NumberFormat('it-IT').format(simulatedRevenue)}
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    const link = `https://qrgate.io/${venueData?.slug}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Link copiato!");
                  }}
                  className="w-full py-5 px-8 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center justify-center gap-3 text-lg"
                >
                  Copia Link Vetrina <Copy className="w-5 h-5" />
                </button>
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <Shield className="w-3 h-3 text-emerald-500" /> Commissioni incluse nel calcolo
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 -m-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div variants={item} className="bg-white border border-[#E5E1D9] rounded-[2rem] p-8 shadow-sm relative overflow-hidden group hover:border-[#D4A853]/30 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:text-[#0F0E0C] transition-colors">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Today</span>
            </div>
            <p className="text-4xl font-black text-[#0F0E0C] tabular-nums tracking-tighter mb-2">
              {stats?.today?.ticket_count || 0}
            </p>
            <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
              +12.5% vs avg
            </p>
            <div className="mt-8 pt-6 border-t border-stone-50 flex justify-between items-center">
              <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest line-clamp-1">Daily Volume</span>
              <span className="font-black text-[#0F0E0C] tabular-nums text-sm italic">€{fmtEur(stats?.today?.revenue_cents)}</span>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white border border-[#E5E1D9] rounded-[2rem] p-8 shadow-sm relative overflow-hidden group hover:border-[#D4A853]/30 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:text-[#D4A853] transition-colors">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Monthly</span>
            </div>
            <p className="text-4xl font-black text-[#0F0E0C] tabular-nums tracking-tighter mb-2">
              €{fmtEur(stats?.month?.revenue_cents, 0)}
            </p>
            <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
              +24.5% Growth
            </p>
            <div className="mt-8 pt-6 border-t border-stone-50 flex justify-between items-center">
              <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest line-clamp-1">30-day transacted</span>
              <span className="font-black text-[#0F0E0C] tabular-nums text-sm italic">{new Intl.NumberFormat('it-IT').format(stats?.month?.ticket_count || 0)} tix</span>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-[#0F0E0C] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group shadow-stone-900/20">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Payout</span>
            </div>
            <p className="text-4xl font-black text-white tabular-nums tracking-tighter mb-2 relative z-10">
              €{fmtEur((stats?.month?.revenue_cents || 0) * 0.95)}
            </p>
            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest relative z-10 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Scheduled: Fri
            </p>
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Net Payable</span>
              <span className="font-black text-emerald-400 tabular-nums text-sm italic uppercase tracking-tighter">Automatic</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* PNL: Live Sales Feed (Social Proof / Action Bias) */}
      {(stats?.today?.revenue_cents > 0 || stats?.month?.revenue_cents > 0) && (
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F0E0C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0F0E0C]"></span>
              </span>
              Feed Vendite in Diretta
            </h3>
            <Link to="orders" className="text-sm text-[#0F0E0C] hover:underline font-medium flex items-center gap-1">
              Vedi Tutti <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Attività Recente</span>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
                </div>
              </div>
              {recentOrders.length > 0 ? (
                <ul className="divide-y divide-slate-50">
                  {recentOrders.slice(0, 5).map(order => (
                    <motion.li
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-5 flex items-center justify-between hover:bg-blue-50/30 transition-all border-l-4 border-transparent hover:border-blue-500 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors relative">
                          <Ticket className="w-6 h-6" />
                          <span className="absolute -top-1 -right-1 text-xs">🇮🇹</span>
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-tight">
                            {order.visitor_email.split('@')[0]}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {order.ticket_name || 'Ticket Standard'} • Apple Pay
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600 text-lg italic">
                          +€{((order.ticket_amount + order.donation_amount) / 100).toFixed(2)}
                        </p>
                        <p className="text-[10px] font-black text-slate-300 uppercase">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">In attesa di scansioni...</p>
                </div>
              )}
            </div>

            <div className="glass-card p-8 bg-slate-900 border-2 border-blue-500/30 text-white relative overflow-hidden shadow-2xl rounded-[2.5rem]">
              <div className="absolute top-0 right-0 -m-16 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xl tracking-tighter uppercase leading-none">AI BI Alerts</h4>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Insight Generati ora</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Growth Opportunity</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    Il <b>32%</b> dei tuoi visitatori acquista entro 5 minuti. Aggiungi un ticket <span className="text-blue-400">"Salto Coda"</span> per aumentare il ricavo medio del 15%.
                  </p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Heatmap Peak</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    Picco di scansioni rilevato alle <b>11:00</b>. Assicurati che il personale sia pronto all'indirizzamento QR.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('report')}
                className="w-full mt-8 py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all text-sm uppercase tracking-widest shadow-xl shadow-blue-900/40 active:scale-95"
              >
                Analisi Profonda →
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <motion.div variants={item} className="md:col-span-2 glass-card p-6">
          <h3 className="font-semibold text-[#0F0F0F] mb-4 text-lg">{t('dashboard.revenueTrend')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats?.revenue_trend || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
              <XAxis dataKey="date" tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} className="text-xs" />
              <YAxis tickFormatter={(value) => `€${value}`} className="text-xs" />
              <Tooltip
                contentStyle={{
                  background: '#0F0E0C',
                  border: '1px solid #2C2A27',
                  borderRadius: '10px',
                  color: '#F5F2EC',
                  fontSize: '12px',
                  fontWeight: 600
                }}
                formatter={(value) => [`€${value.toFixed(2)}`, t('dashboard.revenue')]}
                labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              />
              <Area type="monotone" dataKey="revenue" stroke="#1C1917" fill="url(#colorRevenue)" strokeWidth={2} />
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1C1917" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1C1917" stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={item} className="glass-card p-6">
          <h3 className="font-semibold text-[#0F0F0F] mb-4 text-lg">{t('dashboard.salesChannels')}</h3>
          <div className="space-y-4">
            {stats?.channel_split ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('dashboard.entrance')}</span>
                    <span className="font-semibold">{stats?.channel_split?.entrance_pct || 0}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1C1917]" style={{ width: `${stats?.channel_split?.entrance_pct || 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('dashboard.online')}</span>
                    <span className="font-semibold">{stats?.channel_split?.online_pct || 0}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4A853]" style={{ width: `${stats?.channel_split?.online_pct || 0}%` }}></div>
                  </div>
                </div>
                {stats?.channel_split?.other_pct > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t('dashboard.others')}</span>
                      <span className="font-semibold">{stats?.channel_split?.other_pct || 0}%</span>
                    </div>
                    <div className="h-2 bg-[#F5F2EC] rounded-full overflow-hidden">
                      <div className="h-full bg-[#6B6867]" style={{ width: `${stats?.channel_split?.other_pct || 0}%` }}></div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#6B6867]">Dati non disponibili</div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div variants={item} className="glass-card p-6">
          <h3 className="font-semibold text-[#0F0F0F] mb-4 text-lg">{t('dashboard.estimatedCountries')}</h3>
          <div className="space-y-2 text-sm">
            {stats?.country_split?.length > 0 ? (
              stats.country_split.map((country, index) => (
                <div key={index} className="flex justify-between">
                  <span>{country.flag} {country.name}</span>
                  <span className="font-semibold">{country.percentage}%</span>
                </div>
              ))
            ) : (
              <p className="text-[#6B6867]">{t('dashboard.noCountryData')}</p>
            )}
          </div>
          <p className="text-xs text-[#6B6867] italic mt-4">{t('reports.estimatedNote')}</p>
        </motion.div>

        <motion.div variants={item} className="glass-card p-6">
          <h3 className="font-semibold text-[#0F0F0F] mb-4 text-lg">{t('dashboard.topProducts')}</h3>
          <div className="space-y-3">
            {stats?.top_products?.length > 0 ? (
              stats.top_products.map((product, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-[#0F0F0F]">{product.name}</span>
                  <span className="font-semibold text-[#6B6867]">{product.count} {t('dashboard.sales')}</span>
                </div>
              ))
            ) : (
              <p className="text-[#6B6867]">{t('dashboard.noProductData')}</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [venueData, setVenueData] = useState(JSON.parse(localStorage.getItem('qrgate_venue') || '{}'));
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (!localStorage.getItem('qrgate_token')) {
      navigate('/login');
    }
  }, [navigate]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { icon: <LayoutDashboard />, label: t('dashboard.home'), path: '' },
    { icon: <Ticket />, label: t('dashboard.tickets'), path: 'tickets' },
    { icon: <ShoppingBag />, label: t('dashboard.orders'), path: 'orders' },
    { icon: <CreditCard />, label: t('dashboard.payments'), path: 'payments' },
    { icon: <Tag />, label: 'Codici Promo', path: 'promo' },
    { icon: <Users />, label: 'Clienti', path: 'customers' },
    { icon: <Users />, label: t('dashboard.staff'), path: 'staff' },
    { icon: <BarChart2 />, label: t('dashboard.reports'), path: 'report' },
    { icon: <Gift />, label: 'Referral', path: 'referral' },
    { icon: <Download />, label: 'Widget & API', path: 'api' },
    { icon: <SettingsIcon />, label: t('dashboard.settings'), path: 'settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('qrgate_token');
    localStorage.removeItem('qrgate_venue');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#F5F2EC] transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-[#0F0E0C] border-r border-white/5 transition-all duration-300 flex flex-col z-50 shadow-2xl shrink-0`}>
        <div className="p-8 flex items-center justify-between border-b border-white/5">
          <Link to="/" className="flex items-center gap-3 active:scale-95 transition-transform">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-[#0F0E0C] shadow-lg shadow-white/5">
              <QrCode className="w-6 h-6" strokeWidth={2.5} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-black text-2xl tracking-tighter text-white leading-none">QRGate</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mt-1">Manager</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-5 py-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = (item.path === '' && location.pathname === '/dashboard') || (item.path !== '' && location.pathname.includes(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative ${isActive
                  ? 'bg-white text-[#0F0E0C] shadow-2xl shadow-black/40 font-bold translate-x-1'
                  : 'text-stone-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
              >
                <span className={`${isActive ? 'text-[#0F0E0C]' : 'text-stone-500 group-hover:text-white'} transition-colors`}>{item.icon}</span>
                {isSidebarOpen && <span>{item.label}</span>}
                {isActive && <motion.div layoutId="active-nav" className="absolute left-0 w-1 h-6 bg-[#0F0E0C] rounded-r-full" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-2">
          <button onClick={toggleDarkMode} className="flex items-center gap-4 w-full px-5 py-4 text-stone-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-medium">
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            {isSidebarOpen && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-4 w-full px-5 py-4 text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all font-bold">
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span>{t('dashboard.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-[#E5E1D9] flex items-center justify-between px-10 z-40">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="p-2 -ml-2 hover:bg-stone-100 rounded-xl transition-colors md:hidden">
              <Menu className="w-6 h-6 text-[#0F0E0C]" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-[#E5E1D9] shadow-sm">
              {venueData?.logo_url ? <img src={venueData.logo_url} alt="Logo" className="w-full h-full object-cover p-1" /> : <Building2 className="w-5 h-5 text-[#D4A853]" />}
            </div>
            <div>
              <p className="font-black text-[#0F0F0F] leading-none mb-1 tracking-tight">{venueData?.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#6B6867] opacity-60">Venue Administrator</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden lg:block">
              <LanguageToggle />
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0F0E0C] text-white font-black rounded-xl hover:bg-stone-800 transition-all text-sm shadow-xl shadow-stone-950/20 active:scale-95" onClick={() => navigate('/scanner')}>
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline uppercase tracking-widest text-[10px]">Open Staff Scanner</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Routes>
            <Route path="/" element={<DashboardHome venueData={venueData} />} />
            <Route path="/tickets" element={<DashboardTickets />} />
            <Route path="/orders" element={<DashboardOrders />} />
            <Route path="/capacity" element={<DashboardCapacity />} />
            <Route path="/waitlist" element={<DashboardWaitlist />} />
            <Route path="/report" element={<DashboardReports />} />
            <Route path="/payments" element={<DashboardPayments />} />
            <Route path="/promo" element={<DashboardPromoCodes />} />
            <Route path="/staff" element={<DashboardStaff />} />
            <Route path="/customers" element={<DashboardCustomers />} />
            <Route path="/referral" element={<ReferralProgram venueData={venueData} />} />
            <Route path="/api" element={
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex bg-white p-2 rounded-2xl border-2 border-slate-100 max-w-fit mb-8">
                  <button
                    onClick={() => navigate('/dashboard/api')}
                    className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${!location.hash || location.hash === '#builder' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    Widget Builder
                  </button>
                  <button
                    onClick={() => { window.location.hash = 'docs'; }}
                    className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${location.hash === '#docs' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    Public API Docs
                  </button>
                </div>

                {location.hash === '#docs' ? (
                  <PublicApiDocs venueSlug={venueData?.slug} />
                ) : (
                  <WidgetGenerator />
                )}
              </div>
            } />
            <Route path="/support" element={
              <div className="glass-card p-8 md:p-12 text-center max-w-2xl mx-auto my-8 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-[#0F0E0C] text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-button-hover">
                  <MessageCircle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-extrabold text-[#0F0F0F] mb-4">Supporto QRGate AI</h2>
                <p className="text-[#6B6867] text-lg mb-8">
                  Il nostro assistente virtuale è <strong>online e pronto</strong> a rispondere a tutte le tue domande. Clicca sull'icona della chat in basso a destra per iniziare a conversare in tempo reale!
                </p>
                <button onClick={() => {
                  const trigger = document.querySelector('[data-testid="chatbot-trigger-button"]');
                  if (trigger) trigger.click();
                }} className="px-6 py-3 bg-[#0F0E0C] text-white rounded-xl font-bold hover:bg-[#292524] transition-all shadow-sm mb-8">
                  Apri Chatbot AI
                </button>
                <p className="text-sm border-t border-[#E5E1D9] pt-8 text-[#6B6867]">
                  Preferisci un operatore? Inviaci un'email a <a href="mailto:support@qrgate.com" className="text-[#0F0E0C] font-semibold hover:underline">support@qrgate.com</a>
                </p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
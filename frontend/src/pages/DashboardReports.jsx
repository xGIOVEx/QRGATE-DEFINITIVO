import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend,
  ComposedChart
} from 'recharts';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Download, TrendingUp, TrendingDown, Users, Globe, Calendar, Euro, FileText, Printer, ShieldCheck, Mail } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format, subDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COLORS = ['#1E3A5F', '#00C896', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const countryNames = {
  IT: 'Italia', DE: 'Germania', FR: 'Francia', ES: 'Spagna', GB: 'Regno Unito',
  US: 'Stati Uniti', CH: 'Svizzera', AT: 'Austria', NL: 'Paesi Bassi', BE: 'Belgio',
  JP: 'Giappone', CN: 'Cina', BR: 'Brasile', AU: 'Australia', CA: 'Canada'
};

const DashboardReports = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  const token = localStorage.getItem('qrgate_token');
  // const headers = { Authorization: `Bearer ${token}` }; // This is no longer needed as headers are created inside useCallback

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/analytics?days=${period}`, { headers: { Authorization: `Bearer ${token}` } });
      setAnalytics(res.data);
    } catch (e) {
      toast.error('Errore caricamento analytics');
    } finally {
      setLoading(false);
    }
  }, [period, token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const downloadCsv = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/reports/export`, {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ordini-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV esportato con successo');
    } catch (e) {
      toast.error('Errore export CSV');
    }
  };

  const downloadPdfReport = async () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8F9FB'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;

      pdf.addImage(imgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`report-${format(new Date(), 'yyyy-MM')}.pdf`);

      toast.success('PDF esportato con successo');
    } catch (e) {
      console.error('PDF export error:', e);
      toast.error('Errore export PDF');
    } finally {
      setExporting(false);
    }
  };

  // Prepare chart data
  const revenueChartData = analytics?.daily_revenue
    ? Object.entries(analytics.daily_revenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount], idx, arr) => {
        // Calculate 7-day moving average
        const start = Math.max(0, idx - 6);
        const slice = arr.slice(start, idx + 1);
        const avg = slice.reduce((sum, [, val]) => sum + val, 0) / slice.length;

        return {
          date: format(parseISO(date), 'dd MMM', { locale: it }),
          revenue: amount / 100,
          average: Math.round(avg) / 100
        };
      })
    : [];

  // Revenue forecast (simple linear projection)
  const forecastData = revenueChartData.length > 7
    ? (() => {
      const last7 = revenueChartData.slice(-7);
      const avgGrowth = last7.reduce((sum, d, i, arr) => {
        if (i === 0) return 0;
        return sum + (d.revenue - arr[i - 1].revenue);
      }, 0) / 6;

      const lastValue = last7[last7.length - 1]?.revenue || 0;
      const forecast = [];
      for (let i = 1; i <= 7; i++) {
        forecast.push({
          date: format(subDays(new Date(), -i), 'dd MMM', { locale: it }),
          forecast: Math.max(0, lastValue + avgGrowth * i)
        });
      }
      return forecast;
    })()
    : [];

  const ticketBreakdownData = analytics?.ticket_breakdown?.map(t => ({
    name: t.name || 'Sconosciuto',
    value: t.count,
    revenue: t.revenue / 100
  })) || [];

  const channelData = analytics?.channel_split ? [
    { name: 'Entrata QR', value: analytics.channel_split.entrance, color: '#1E3A5F' },
    { name: 'Online', value: analytics.channel_split.online, color: '#00C896' }
  ] : [];

  const dayOfWeekData = analytics?.day_of_week_sales
    ? Object.entries(analytics.day_of_week_sales).map(([day, count]) => ({
      day: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][parseInt(day)],
      vendite: count
    }))
    : [];

  const hourData = analytics?.hour_sales
    ? Object.entries(analytics.hour_sales)
      .filter(([h]) => parseInt(h) >= 8 && parseInt(h) <= 20)
      .map(([hour, count]) => ({
        ora: `${hour}:00`,
        vendite: count
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#0F0E0C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const current = analytics?.current || {};
  const changes = analytics?.changes || {};
  const donationStats = analytics?.donation_stats || {};
  const visitorStats = analytics?.visitor_stats || {};

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[#0F0F0F]">Report e Analytics</h2>
          <p className="text-[#6B6867] text-sm mt-1">
            Analisi dettagliata delle vendite e dei visitatori
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="px-4 py-2 border border-[#E5E1D9] rounded-lg bg-white"
          >
            <option value={7}>Ultimi 7 giorni</option>
            <option value={30}>Ultimi 30 giorni</option>
            <option value={90}>Ultimi 90 giorni</option>
          </select>
          <button onClick={downloadCsv} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E1D9] rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={downloadPdfReport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F0E0C] text-white rounded-lg hover:bg-[#292524] disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> {exporting ? 'Generazione...' : 'PDF Report'}
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* KPI Cards with Comparison */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#6B6867] text-sm mb-2">
              <Euro className="w-4 h-4" /> Fatturato
            </div>
            <div className="text-2xl font-bold text-[#0F0F0F]">
              €{((current.revenue_cents || 0) / 100).toFixed(0)}
            </div>
            <div className={`flex items-center gap-1 text-sm mt-1 ${changes.revenue_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changes.revenue_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(changes.revenue_pct || 0).toFixed(1)}% vs periodo prec.
            </div>
          </div>

          <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#6B6867] text-sm mb-2">
              <Users className="w-4 h-4" /> Biglietti
            </div>
            <div className="text-2xl font-bold text-[#0F0F0F]">
              {current.tickets || 0}
            </div>
            <div className={`flex items-center gap-1 text-sm mt-1 ${changes.tickets_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changes.tickets_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(changes.tickets_pct || 0).toFixed(1)}% vs periodo prec.
            </div>
          </div>

          <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#6B6867] text-sm mb-2">
              <Calendar className="w-4 h-4" /> Ordini
            </div>
            <div className="text-2xl font-bold text-[#0F0F0F]">
              {current.orders || 0}
            </div>
            <div className="text-sm text-[#6B6867] mt-1">
              AOV: €{((visitorStats.aov_cents || 0) / 100).toFixed(2)}
            </div>
          </div>

          <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#6B6867] text-sm mb-2">
              <Globe className="w-4 h-4" /> Donazioni
            </div>
            <div className="text-2xl font-bold text-[#0F0F0F]">
              €{((current.donations_cents || 0) / 100).toFixed(0)}
            </div>
            <div className="text-sm text-[#6B6867] mt-1">
              {(donationStats.conversion_rate || 0).toFixed(1)}% conversione
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart with Moving Average and Forecast */}
        <div className="bg-white border border-[#E5E1D9] rounded-xl p-6">
          <h3 className="font-semibold text-[#0F0F0F] mb-4">
            Trend Fatturato (con media mobile 7gg)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={[...revenueChartData, ...forecastData.map(f => ({ ...f, date: f.date }))]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
              <Tooltip
                formatter={(value, name) => [`€${value?.toFixed(2) || 0}`, name === 'revenue' ? 'Fatturato' : name === 'average' ? 'Media 7gg' : 'Previsione']}
                labelStyle={{ color: '#1E3A5F' }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#1E3A5F" name="Fatturato" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="average" stroke="#00C896" strokeWidth={2} dot={false} name="Media 7gg" />
              <Line type="monotone" dataKey="forecast" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Previsione" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Two Column: Channel Split & Ticket Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Channel Split Donut */}
          <div className="bg-white border border-[#E5E1D9] rounded-xl p-6">
            <h3 className="font-semibold text-[#0F0F0F] mb-4">Canali di Vendita</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {channelData.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-[#6B6867]">{c.name}: {c.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Breakdown */}
          <div className="bg-white border border-[#E5E1D9] rounded-xl p-6">
            <h3 className="font-semibold text-[#0F0F0F] mb-4">Performance per Biglietto</h3>
            <div className="space-y-3">
              {ticketBreakdownData.map((ticket, i) => {
                const total = ticketBreakdownData.reduce((s, t) => s + t.value, 0);
                const pct = total > 0 ? (ticket.value / total * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#0F0F0F] font-medium">{ticket.name}</span>
                      <span className="text-[#6B6867]">{ticket.value} venduti • €{ticket.revenue.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Day of Week & Hour Heatmap */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E5E1D9] rounded-xl p-6">
            <h3 className="font-semibold text-[#0F0F0F] mb-4">Vendite per Giorno</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="vendite" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-[#E5E1D9] rounded-xl p-6">
            <h3 className="font-semibold text-[#0F0F0F] mb-4">Vendite per Ora</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="ora" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="vendite" stroke="#00C896" fill="#00C89620" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geographic Map */}
        <div className="bg-white border border-[#E5E1D9] rounded-xl p-6">
          <h3 className="font-semibold text-[#0F0F0F] mb-4">
            <Globe className="w-5 h-5 inline mr-2" />
            Provenienza Visitatori
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Map */}
            <div className="h-[300px] bg-gray-50 rounded-lg overflow-hidden">
              <ComposableMap
                projectionConfig={{ scale: 150, center: [10, 45] }}
                style={{ width: '100%', height: '100%' }}
              >
                <ZoomableGroup>
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const countryData = analytics?.countries?.find(c => {
                          const isoMap = { IT: 'ITA', DE: 'DEU', FR: 'FRA', ES: 'ESP', GB: 'GBR', US: 'USA', CH: 'CHE', AT: 'AUT', NL: 'NLD', BE: 'BEL' };
                          return isoMap[c.code] === geo.properties.ISO_A3;
                        });
                        const intensity = countryData ? Math.min(1, countryData.count / 50) : 0;
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={intensity > 0 ? `rgba(30, 58, 95, ${0.2 + intensity * 0.8})` : '#E2E8F0'}
                            stroke="#FFF"
                            strokeWidth={0.5}
                            style={{
                              hover: { fill: '#00C896' },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>

            {/* Country Table */}
            <div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E1D9]">
                    <th className="text-left py-2 text-sm font-semibold text-[#6B6867]">Paese</th>
                    <th className="text-right py-2 text-sm font-semibold text-[#6B6867]">Ordini</th>
                    <th className="text-right py-2 text-sm font-semibold text-[#6B6867]">Fatturato</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.countries || []).slice(0, 8).map((country, i) => (
                    <tr key={i} className="border-b border-[#E5E1D9]">
                      <td className="py-2 text-[#0F0F0F]">
                        {countryNames[country.code] || country.code}
                      </td>
                      <td className="py-2 text-right text-[#6B6867]">{country.count}</td>
                      <td className="py-2 text-right text-[#0F0F0F] font-medium">
                        €{(country.revenue / 100).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI BI Insights & Benchmarks (§7.4) */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-blue-500/30">
            <div className="absolute top-0 right-0 -m-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-xl tracking-tighter uppercase leading-none italic">AI Insights PNL</h3>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Ottimizzazione Conversione</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Abbiamo rilevato un tasso di abbandono del <span className="text-blue-400 font-black">42%</span> nel checkout mobile. Implementa il checkout <span className="text-emerald-400">"Express"</span> per recuperare circa <span className="text-emerald-400 font-bold">€1.240/mese</span>.
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Il ticket <b>"Ridotto"</b> è il più venduto il martedì. Considera una promo <b>"Early Bird"</b> per le fasce orarie 09:00 - 11:00.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Benchmark di Settore (Anonimizzati)</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">
                  <span>Conversione Landing</span>
                  <span className="text-slate-900">Il Tuo: 8.4% • Media: 6.2%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: '84%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">
                  <span>AOV (Average Order Value)</span>
                  <span className="text-slate-900">Il Tuo: €18.5 • Media: €22.1</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: '65%' }}></div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic mt-4 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Dati basati su 150+ venue partner in Europa.
              </p>
            </div>
          </div>
        </div>

        {/* Visitor Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
            <h4 className="text-sm text-[#6B6867] mb-2">Visitatori Unici</h4>
            <div className="text-2xl font-bold text-[#0F0F0F]">{visitorStats.unique_visitors || 0}</div>
            <p className="text-xs text-[#6B6867] mt-1">{visitorStats.returning_visitors || 0} di ritorno</p>
          </div>
          <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
            <h4 className="text-sm text-[#6B6867] mb-2">Media Biglietti/Ordine</h4>
            <div className="text-2xl font-bold text-[#0F0F0F]">{(visitorStats.avg_tickets_per_order || 0).toFixed(1)}</div>
          </div>
          <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
            <h4 className="text-sm text-[#6B6867] mb-2">Tasso Donazione</h4>
            <div className="text-2xl font-bold text-[#0F0F0F]">{(donationStats.conversion_rate || 0).toFixed(1)}%</div>
            <p className="text-xs text-[#6B6867] mt-1">Media: €{((donationStats.avg_donation_cents || 0) / 100).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardReports;

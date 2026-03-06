import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardCapacity = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [capacityData, setCapacityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyCapacity, setDailyCapacity] = useState({ enabled: false, capacity: 0 });
  const [savingCapacity, setSavingCapacity] = useState(false);

  const fetchCapacity = async (date) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('qrgate_token');
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/capacity?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCapacityData(response.data);
      if (response.data.daily_capacity) {
        setDailyCapacity({
          enabled: true,
          capacity: response.data.daily_capacity.capacity
        });
      }
    } catch (error) {
      console.error('Failed to fetch capacity', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacity(selectedDate);
  }, [selectedDate]);

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const updateDailyCapacity = async () => {
    try {
      setSavingCapacity(true);
      const token = localStorage.getItem('qrgate_token');
      await axios.put(`${BACKEND_URL}/api/dashboard/capacity`, {
        daily_capacity_enabled: dailyCapacity.enabled,
        daily_capacity: dailyCapacity.capacity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Capacità aggiornata');
      fetchCapacity(selectedDate);
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSavingCapacity(false);
    }
  };

  const getSlotColor = (slot) => {
    const percentage = (slot.booked / slot.capacity) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    if (percentage >= 50) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const getSlotBgColor = (slot) => {
    const percentage = (slot.booked / slot.capacity) * 100;
    if (percentage >= 100) return 'bg-red-50 border-red-200';
    if (percentage >= 80) return 'bg-amber-50 border-amber-200';
    return 'bg-white border-[#E5E1D9]';
  };

  return (
    <div className="space-y-6" data-testid="dashboard-capacity">
      <div className="flex items-center justify-between">
        <h2 className="text-[#0F0F0F]">
          <Calendar className="w-5 h-5 inline mr-2" />
          Capacità e Fasce Orarie
        </h2>
        <button 
          onClick={() => fetchCapacity(selectedDate)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white border border-[#E5E1D9] rounded-xl p-4">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none text-center focus:outline-none"
          />
          <p className="text-sm text-[#6B6867] capitalize">{formatDate(selectedDate)}</p>
        </div>
        
        <button
          onClick={() => changeDate(1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Daily Capacity Settings */}
      <div className="bg-white border border-[#E5E1D9] rounded-xl p-6">
        <h3 className="font-semibold text-[#0F0F0F] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Capacità Giornaliera
        </h3>
        
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dailyCapacity.enabled}
              onChange={(e) => setDailyCapacity({ ...dailyCapacity, enabled: e.target.checked })}
              className="w-5 h-5 accent-[#0F0E0C]"
            />
            <span className="text-[#0F0F0F]">Abilita limite giornaliero</span>
          </label>
        </div>
        
        {dailyCapacity.enabled && (
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={dailyCapacity.capacity}
              onChange={(e) => setDailyCapacity({ ...dailyCapacity, capacity: parseInt(e.target.value) || 0 })}
              min="0"
              className="w-32 px-4 py-2 border border-[#E5E1D9] rounded-lg focus:outline-none focus:border-[#0F0E0C]"
              placeholder="Capacità"
            />
            <span className="text-[#6B6867]">visitatori massimi al giorno</span>
            <button
              onClick={updateDailyCapacity}
              disabled={savingCapacity}
              className="px-4 py-2 bg-[#0F0E0C] text-white rounded-lg hover:bg-[#292524] disabled:opacity-50"
            >
              {savingCapacity ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        )}

        {capacityData?.daily_capacity && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#6B6867]">Venduti oggi</span>
              <span className="font-semibold">{capacityData.daily_capacity.sold} / {capacityData.daily_capacity.capacity}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  capacityData.daily_capacity.available === 0 ? 'bg-red-500' : 
                  capacityData.daily_capacity.sold > capacityData.daily_capacity.capacity * 0.8 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (capacityData.daily_capacity.sold / capacityData.daily_capacity.capacity) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-[#6B6867] mt-2">
              {capacityData.daily_capacity.available > 0 
                ? `${capacityData.daily_capacity.available} posti disponibili`
                : 'Capacità esaurita'}
            </p>
          </div>
        )}
      </div>

      {/* Timed Entry Slots */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#0F0E0C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : capacityData?.timed_tickets?.length > 0 ? (
        <div className="space-y-6">
          {capacityData.timed_tickets.map((ticket) => (
            <div key={ticket.ticket_id} className="bg-white border border-[#E5E1D9] rounded-xl p-6">
              <h3 className="font-semibold text-[#0F0F0F] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {ticket.ticket_name}
              </h3>
              
              {ticket.slots.length === 0 ? (
                <p className="text-[#6B6867]">Nessuna fascia oraria configurata per questa data</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {ticket.slots.map((slot) => (
                    <div 
                      key={slot.time}
                      className={`border rounded-xl p-4 ${getSlotBgColor(slot)}`}
                    >
                      <div className="text-lg font-bold text-[#0F0F0F] mb-1">{slot.time}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-[#6B6867]" />
                        <span className="text-sm">
                          {slot.booked}/{slot.capacity}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getSlotColor(slot)}`}
                          style={{ width: `${Math.min(100, (slot.booked / slot.capacity) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#6B6867] mt-2">
                        {slot.available > 0 ? `${slot.available} disponibili` : 'Esaurito'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E5E1D9] rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[#6B6867] mx-auto mb-4" />
          <h3 className="font-semibold text-[#0F0F0F] mb-2">Nessun biglietto a fascia oraria</h3>
          <p className="text-[#6B6867]">
            Crea un biglietto con "Ingresso a fascia oraria" attivo per gestire la capacità per slot
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardCapacity;

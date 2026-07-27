import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { useTranslation } from '../../i18n';

export default function AdminDriverPerformance() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (filter) {
      case 'today':
        return { startDate: today.toISOString(), endDate: now.toISOString() };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: yesterday.toISOString(), endDate: today.toISOString() };
      }
      case '7days': {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        return { startDate: d.toISOString(), endDate: now.toISOString() };
      }
      case '30days': {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        return { startDate: d.toISOString(), endDate: now.toISOString() };
      }
      case 'custom':
        return {
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
        };
      default:
        return {};
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'drivers-performance', page, search, filter, startDate, endDate],
    queryFn: () => {
      const range = getDateRange();
      return adminApi.getDriversPerformance({ page, limit: 20, search: search || undefined, ...range });
    },
    refetchInterval: 30000,
  });

  const drivers = data?.data?.drivers || [];
  const pages = data?.data?.pages || 1;

  const handleExportCSV = () => {
    const range = getDateRange();
    adminApi.exportDriversPerformance(range).then(({ data: resp }) => {
      const rows = resp.data || [];
      const headers = 'Name,Phone,TelegramID,Status,Rating,CompletedRides,CancelledRides,TotalEarnings,TodayRides,TodayEarnings,WeeklyEarnings,MonthlyEarnings\n';
      const csv = rows.map((r: any) =>
        `"${r.name}","${r.phone}","${r.telegramId}",${r.status},${r.rating},${r.totalRides},${r.cancelledRides},${r.totalEarnings},${r.todayRides},${r.todayEarnings},${r.weeklyEarnings},${r.monthlyEarnings}`
      ).join('\n');
      const blob = new Blob([headers + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `driver-performance-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">📊 {t('driver_performance')}</h1>
        <button onClick={handleExportCSV}
          className="px-4 py-2 rounded-btn bg-green-500/15 text-green-400 text-xs font-medium border border-green-500/30 hover:bg-green-500/25 active:scale-95 transition-all">
          📥 {t('export_csv')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'today', label: t('today') },
          { value: 'yesterday', label: t('yesterday') },
          { value: '7days', label: t('last_7_days') },
          { value: '30days', label: t('last_30_days') },
          { value: 'custom', label: t('custom_range') },
          { value: 'all', label: t('all_time') },
        ].map((f) => (
          <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.value ? 'bg-primary-500 text-white shadow-sm' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {filter === 'custom' && (
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all" />
        </div>
      )}

      {/* Search */}
      <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder={t('search_drivers')}
        className="w-full bg-white/5 border border-white/10 rounded-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder-gray-500" />

      {/* Driver List */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 rounded-card skeleton" />)}</div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500 text-sm">{t('no_drivers_found_admin')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drivers.map((d: any) => (
            <div key={d._id} className="glass rounded-card p-3 sm:p-4 cursor-pointer hover:bg-white/5 transition-all"
              onClick={() => navigate(`/admin/drivers-performance/${d._id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {d.userId?.firstName?.[0]}{d.userId?.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{d.userId?.firstName} {d.userId?.lastName}</div>
                    <div className="text-[11px] text-gray-500 truncate">
                      📱 {d.userId?.telegramId} • 📞 {d.userId?.phone || '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${d.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                <div>
                  <div className="text-sm font-bold text-green-400">{d.completedRides}</div>
                  <div className="text-[9px] text-gray-500">{t('completed_rides')}</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-red-400">{d.cancelledRides}</div>
                  <div className="text-[9px] text-gray-500">{t('cancelled_rides')}</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-yellow-400">⭐ {d.rating?.toFixed(1)}</div>
                  <div className="text-[9px] text-gray-500">{t('rating')}</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-primary-400">{d.totalEarnings?.toLocaleString()}</div>
                  <div className="text-[9px] text-gray-500">{t('total_earnings')}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2 text-center border-t border-white/5 pt-2">
                <div>
                  <div className="text-xs font-medium text-blue-400">{d.todayRides} / {d.todayEarnings?.toLocaleString()}</div>
                  <div className="text-[9px] text-gray-500">{t('today')}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-blue-400">{d.weekRides} / {d.weeklyEarnings?.toLocaleString()}</div>
                  <div className="text-[9px] text-gray-500">{t('this_week')}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-blue-400">{d.monthRides} / {d.monthlyEarnings?.toLocaleString()}</div>
                  <div className="text-[9px] text-gray-500">{t('this_month')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-1.5 flex-wrap">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                p === page ? 'bg-primary-500 text-white shadow-btn' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

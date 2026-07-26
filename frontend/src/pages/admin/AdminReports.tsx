import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { adminApi } from '../../services/api';
import { useTranslation } from '../../i18n';

export default function AdminReports() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', period],
    queryFn: () => adminApi.getReports({ period }),
  });

  const revenue = data?.data?.revenue || [];
  const topDrivers = data?.data?.topDrivers || [];
  const topCustomers = data?.data?.topCustomers || [];

  const totalRevenue = revenue.reduce((acc: number, r: any) => acc + (r.revenue || 0), 0);
  const totalRides = revenue.reduce((acc: number, r: any) => acc + (r.rides || 0), 0);

  const exportCSV = () => {
    const headers = 'Period,Rides,Revenue\n';
    const rows = revenue.map((r: any) => `${r._id},${r.rides},${r.revenue}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `report-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t('reports')}</h1>
        <button onClick={exportCSV} className="px-4 py-2 bg-white/5 border border-white/10 text-sm rounded-btn hover:bg-white/10 transition-all">
          {t('export_csv')}
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-btn text-sm font-medium whitespace-nowrap transition-all ${
              p === period ? 'bg-primary-500 text-white shadow-btn' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}>
            {p === 'daily' ? t('today') : p === 'weekly' ? t('this_week') : p === 'monthly' ? t('this_month') : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <div className="text-xl sm:text-2xl font-bold">{totalRides.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">{t('total_rides')}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <div className="text-xl sm:text-2xl font-bold truncate">{totalRevenue.toLocaleString()} <span className="text-sm font-normal text-gray-400">{t('sum')}</span></div>
          <div className="text-xs text-gray-400 mt-1">{t('total_revenue')}</div>
        </motion.div>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-card skeleton" />
      ) : revenue.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold text-sm mb-3">{t('revenue_rides')}</h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue}>
                <XAxis dataKey="_id" tick={{ fill: '#8e8e93', fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fill: '#8e8e93', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8e8e93', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name={t('revenue')} />
                <Line yAxisId="right" type="monotone" dataKey="rides" stroke="#0c8ee7" strokeWidth={2} name={t('rides')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📈</div>
          <p className="text-gray-500 text-sm">{t('no_data_period')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold text-sm mb-3">{t('top_drivers')}</h3>
          {topDrivers.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">{t('no_data')}</p>
          ) : (
            <div className="space-y-1.5">
              {topDrivers.map((d: any, i: number) => (
                <div key={d._id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-500 w-4 text-center flex-shrink-0">{i + 1}</span>
                    <span className="truncate">{d.user?.firstName} {d.user?.lastName}</span>
                  </div>
                  <div className="text-gray-400 flex-shrink-0 ml-2">{d.rides} {t('rides_suffix')} {d.revenue?.toLocaleString()} {t('sum')}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold text-sm mb-3">{t('top_customers')}</h3>
          {topCustomers.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">{t('no_data')}</p>
          ) : (
            <div className="space-y-1.5">
              {topCustomers.map((c: any, i: number) => (
                <div key={c._id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-500 w-4 text-center flex-shrink-0">{i + 1}</span>
                    <span className="truncate">{c.user?.firstName} {c.user?.lastName}</span>
                  </div>
                  <div className="text-gray-400 flex-shrink-0 ml-2">{c.rides} {t('rides_suffix')} {c.spent?.toLocaleString()} {t('sum')}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

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
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('reports')}</h1>
        <button onClick={exportCSV} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">{t('export_csv')}</button>
      </div>

      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm ${p === period ? 'bg-primary-500 text-white' : 'bg-white/10'}`}>
            {p === 'daily' ? t('today') : p === 'weekly' ? t('this_week') : p === 'monthly' ? t('this_month') : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <div className="text-2xl font-bold">{totalRides.toLocaleString()}</div>
          <div className="text-xs text-gray-400">{t('total_rides')}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} {t('sum')}</div>
          <div className="text-xs text-gray-400">{t('total_revenue')}</div>
        </motion.div>
      </div>

      {isLoading ? (
        <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
      ) : revenue.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3">{t('revenue_rides')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenue}>
              <XAxis dataKey="_id" tick={{ fill: '#8e8e93', fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fill: '#8e8e93', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8e8e93', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, color: '#fff' }} />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name={t('revenue')} />
              <Line yAxisId="right" type="monotone" dataKey="rides" stroke="#0c8ee7" strokeWidth={2} name={t('rides')} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">{t('no_data_period')}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3">{t('top_drivers')}</h3>
          {topDrivers.length === 0 ? (
            <p className="text-xs text-gray-500">{t('no_data')}</p>
          ) : (
            <div className="space-y-2">
              {topDrivers.map((d: any, i: number) => (
                <div key={d._id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-4">{i + 1}.</span>
                    <span>{d.user?.firstName} {d.user?.lastName}</span>
                  </div>
                  <div className="text-gray-400">{d.rides}{t('rides_suffix')}{d.revenue?.toLocaleString()} {t('sum')}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3">{t('top_customers')}</h3>
          {topCustomers.length === 0 ? (
            <p className="text-xs text-gray-500">{t('no_data')}</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((c: any, i: number) => (
                <div key={c._id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-4">{i + 1}.</span>
                    <span>{c.user?.firstName} {c.user?.lastName}</span>
                  </div>
                  <div className="text-gray-400">{c.rides}{t('rides_suffix')}{c.spent?.toLocaleString()} {t('sum')}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

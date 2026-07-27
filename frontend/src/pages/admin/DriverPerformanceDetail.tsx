import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { adminApi } from '../../services/api';
import { useTranslation } from '../../i18n';

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-red-500/15 text-red-400',
  accepted: 'bg-green-500/15 text-green-400',
  arrived: 'bg-purple-500/15 text-purple-400',
  in_progress: 'bg-indigo-500/15 text-indigo-400',
  pending: 'bg-yellow-500/15 text-yellow-400',
  searching: 'bg-blue-500/15 text-blue-400',
  disputed: 'bg-orange-500/15 text-orange-400',
};

export default function DriverPerformanceDetail() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'rides' | 'charts'>('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'driver-performance', driverId],
    queryFn: () => adminApi.getDriverPerformance(driverId!),
    enabled: !!driverId,
    refetchInterval: 30000,
  });

  const driver = data?.data?.driver;
  const stats = data?.data?.stats || {};
  const timeline = data?.data?.timeline || [];
  const rideHistory = data?.data?.rideHistory || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded skeleton" />
        <div className="h-32 rounded-card skeleton" />
        <div className="h-64 rounded-card skeleton" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('driver_not_found')}</p>
        <button onClick={() => navigate('/admin/drivers-performance')}
          className="mt-4 px-4 py-2 rounded-btn bg-primary-500 text-white text-sm">{t('back')}</button>
      </div>
    );
  }

  const handleExportCSV = () => {
    const headers = 'Date,Pickup,Destination,Distance,Duration,Fare,Status,Customer\n';
    const rows = rideHistory.map((r: any) =>
      `"${new Date(r.createdAt).toLocaleDateString()}","${r.pickup?.address || ''}","${r.destination?.address || ''}",${r.distance},${r.duration},${r.pricing?.total || 0},"${r.status}","${r.customerId?.firstName || ''} ${r.customerId?.lastName || ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-${driverId}-rides-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    let xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="Driver Performance">\n<Table>\n';
    xml += '<Row><Cell><Data ss:Type="String">Date</Data></Cell><Cell><Data ss:Type="String">Pickup</Data></Cell><Cell><Data ss:Type="String">Destination</Data></Cell><Cell><Data ss:Type="String">Distance</Data></Cell><Cell><Data ss:Type="String">Duration</Data></Cell><Cell><Data ss:Type="String">Fare</Data></Cell><Cell><Data ss:Type="String">Status</Data></Cell><Cell><Data ss:Type="String">Customer</Data></Cell></Row>\n';
    rideHistory.forEach((r: any) => {
      xml += `<Row><Cell><Data ss:Type="String">${new Date(r.createdAt).toLocaleDateString()}</Data></Cell><Cell><Data ss:Type="String">${r.pickup?.address || ''}</Data></Cell><Cell><Data ss:Type="String">${r.destination?.address || ''}</Data></Cell><Cell><Data ss:Type="Number">${r.distance}</Data></Cell><Cell><Data ss:Type="Number">${r.duration}</Data></Cell><Cell><Data ss:Type="Number">${r.pricing?.total || 0}</Data></Cell><Cell><Data ss:Type="String">${r.status}</Data></Cell><Cell><Data ss:Type="String">${r.customerId?.firstName || ''} ${r.customerId?.lastName || ''}</Data></Cell></Row>\n`;
    });
    xml += '</Table>\n</Worksheet>\n</Workbook>';
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-${driverId}-rides-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/admin/drivers-performance')}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 active:scale-95 transition-all">
          ← {t('back')}
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">📊 {t('driver_detail_stats')}</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-btn bg-green-500/15 text-green-400 text-xs font-medium border border-green-500/30 hover:bg-green-500/25 active:scale-95 transition-all">
            📥 CSV
          </button>
          <button onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-btn bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/30 hover:bg-blue-500/25 active:scale-95 transition-all">
            📊 Excel
          </button>
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="glass rounded-card p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-500/20 border-2 border-primary-500 flex items-center justify-center text-lg font-bold flex-shrink-0">
            {driver.userId?.firstName?.[0]}{driver.userId?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-base">{driver.userId?.firstName} {driver.userId?.lastName}</h2>
            <div className="text-xs text-gray-400 mt-0.5 space-x-3">
              <span>📱 {driver.userId?.telegramId}</span>
              <span>📞 {driver.userId?.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`w-2 h-2 rounded-full ${driver.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">{driver.isOnline ? t('online') : t('offline')}</span>
              <span className="text-xs text-yellow-400">⭐ {driver.rating?.toFixed(1)}</span>
              {driver.car && (
                <span className="text-xs text-gray-400">{driver.car.brand} {driver.car.model} • {driver.car.plateNumber}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {[
          { key: 'overview', label: '📊 ' + t('overview') },
          { key: 'rides', label: '🚖 ' + t('ride_history') },
          { key: 'charts', label: '📈 ' + t('charts') },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'bg-primary-500 text-white shadow-sm' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: '🟢', label: t('accepted_rides'), value: stats.totalAccepted || 0, color: 'text-green-400' },
              { icon: '✅', label: t('completed_rides'), value: stats.totalCompleted || 0, color: 'text-emerald-400' },
              { icon: '❌', label: t('cancelled_rides'), value: stats.totalCancelled || 0, color: 'text-red-400' },
              { icon: '💰', label: t('total_earnings'), value: (stats.totalEarnings || 0).toLocaleString(), color: 'text-yellow-400' },
            ].map((s, i) => (
              <div key={i} className="glass rounded-card p-3 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Period Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('today'), rides: stats.todayRides || 0, earnings: stats.todayEarnings || 0 },
              { label: t('this_week'), rides: stats.weekRides || 0, earnings: stats.weeklyEarnings || 0 },
              { label: t('this_month'), rides: stats.monthRides || 0, earnings: stats.monthlyEarnings || 0 },
            ].map((p, i) => (
              <div key={i} className="glass rounded-card p-3 text-center">
                <div className="text-xs font-medium text-gray-400 mb-2">{p.label}</div>
                <div className="text-sm font-bold text-primary-400">{p.rides} {t('rides_suffix')}</div>
                <div className="text-xs text-yellow-400">{p.earnings?.toLocaleString()} {t('sum')}</div>
              </div>
            ))}
          </div>

          {/* Averages */}
          <div className="glass rounded-card p-4">
            <h3 className="text-sm font-semibold mb-3">{t('averages')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '⏱', label: t('avg_response_time'), value: stats.avgResponseTimeMs ? `${Math.round(stats.avgResponseTimeMs / 1000)}s` : '—' },
                { icon: '📍', label: t('avg_pickup_distance'), value: stats.avgDistance ? `${stats.avgDistance.toFixed(1)} km` : '—' },
                { icon: '🕐', label: t('avg_ride_duration'), value: stats.avgDuration ? `${Math.round(stats.avgDuration)} min` : '—' },
                { icon: '💰', label: t('avg_fare'), value: stats.avgFare ? `${stats.avgFare.toLocaleString()} ${t('sum')}` : '—' },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <span className="text-base">{a.icon}</span>
                  <div>
                    <div className="text-[10px] text-gray-500">{a.label}</div>
                    <div className="text-xs font-medium">{a.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription */}
          <div className="glass rounded-card p-4">
            <h3 className="text-sm font-semibold mb-2">{t('subscription_status')}</h3>
            {driver.subscription?.active ? (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {t('subscription_active')} — {t('subscription_expires')}: {driver.subscription.expiresAt ? new Date(driver.subscription.expiresAt).toLocaleDateString() : '—'}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {t('subscription_expired')}
              </div>
            )}
          </div>

          {/* Last Location */}
          {driver.currentLocation && (
            <div className="glass rounded-card p-4">
              <h3 className="text-sm font-semibold mb-2">{t('last_location')}</h3>
              <div className="text-xs text-gray-400">
                📍 {driver.currentLocation.coordinates?.[1]?.toFixed(5)}, {driver.currentLocation.coordinates?.[0]?.toFixed(5)}
                {driver.currentLocation.updatedAt && (
                  <span className="ml-2">({new Date(driver.currentLocation.updatedAt).toLocaleString()})</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rides Tab */}
      {activeTab === 'rides' && (
        <div className="space-y-2">
          {rideHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">{t('no_rides_yet')}</p>
            </div>
          ) : (
            rideHistory.map((ride: any) => (
              <div key={ride._id} className="glass rounded-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium">#{ride.orderNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium ${STATUS_COLORS[ride.status] || 'bg-gray-500/15 text-gray-400'}`}>
                        {ride.status}
                      </span>
                      <span className="text-[10px] text-gray-500">{new Date(ride.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1.5 space-y-0.5">
                      <div className="truncate">📍 {ride.pickup?.address || '—'}</div>
                      <div className="truncate">🏁 {ride.destination?.address || '—'}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-primary-400">{ride.pricing?.total?.toLocaleString()} {t('sum')}</div>
                    <div className="text-[10px] text-gray-500">{ride.distance} km • {ride.duration} min</div>
                    {ride.customerId && (
                      <div className="text-[10px] text-gray-500 mt-0.5">👤 {ride.customerId.firstName}</div>
                    )}
                    {ride.status === 'cancelled' && ride.cancelReason && (
                      <div className="text-[10px] text-red-400 mt-0.5">❌ {ride.cancelReason}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="space-y-4">
          {/* Rides Over Time */}
          {timeline.length > 0 && (
            <div className="glass rounded-card p-4">
              <h3 className="text-sm font-semibold mb-3">{t('rides_over_time')}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="accepted" name={t('accepted_rides')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name={t('completed_rides')} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name={t('cancelled_rides')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Earnings Over Time */}
          {timeline.length > 0 && (
            <div className="glass rounded-card p-4">
              <h3 className="text-sm font-semibold mb-3">{t('daily_earnings')}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="earnings" stroke="#eab308" strokeWidth={2} dot={{ fill: '#eab308', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {timeline.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">{t('no_data')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

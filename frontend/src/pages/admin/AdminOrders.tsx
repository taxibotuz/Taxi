import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400', searching: 'bg-blue-500/15 text-blue-400',
  accepted: 'bg-green-500/15 text-green-400', arrived: 'bg-purple-500/15 text-purple-400',
  in_progress: 'bg-indigo-500/15 text-indigo-400', completed: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-red-500/15 text-red-400', disputed: 'bg-orange-500/15 text-orange-400',
};

export default function AdminOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', page, statusFilter, search],
    queryFn: () => adminApi.getOrders({ page, limit: 20, status: statusFilter || undefined, search }),
    refetchInterval: 10000,
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) => adminApi.assignDriver(orderId, driverId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }); toast.success(t('driver_assigned')); setAssigningOrderId(null); setAssignDriverId(''); },
    onError: () => toast.error(t('failed_assign')),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) => adminApi.cancelOrder(orderId, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }); toast.success(t('order_cancelled')); setCancellingOrderId(null); setCancelReason(''); },
    onError: () => toast.error(t('failed_cancel')),
  });

  const orders = data?.data?.orders || [];
  const pages = data?.data?.pages || 1;

  const viewDetail = async (o: any) => {
    try {
      const res = await adminApi.getOrderById(o._id);
      setDetail(res.data.order);
    } catch { toast.error(t('failed_load_order')); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">📦 {t('admin_orders')}</h1>

      <div className="flex gap-2">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('search_orders')}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder-gray-500" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all flex-shrink-0">
          <option value="">{t('all_status')}</option>
          <option value="pending">{t('status_pending')}</option>
          <option value="searching">{t('status_searching')}</option>
          <option value="accepted">{t('status_accepted')}</option>
          <option value="arrived">{t('status_arrived')}</option>
          <option value="in_progress">{t('status_in_progress')}</option>
          <option value="completed">{t('status_completed')}</option>
          <option value="cancelled">{t('status_cancelled')}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-card skeleton" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-gray-500 text-sm">{t('no_orders_found')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o: any) => (
            <div key={o._id} className="glass rounded-card p-3 sm:p-4 cursor-pointer" onClick={() => viewDetail(o)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium font-mono">#{o.orderNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium ${STATUS_COLORS[o.status] || 'bg-gray-500/15 text-gray-400'}`}>{o.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1.5 truncate">
                    {o.customerId?.firstName} → {o.driverId ? `Driver #${o.driverId?._id?.slice(-4)}` : t('no_driver')} • {o.pricing?.total?.toLocaleString()} {t('sum')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {(o.status === 'pending' || o.status === 'searching') && (
                    <button onClick={(e) => { e.stopPropagation(); setAssigningOrderId(o._id); setAssignDriverId(''); }}
                      className="px-2.5 py-1.5 text-[11px] font-medium bg-primary-500/15 text-primary-400 rounded-badge hover:bg-primary-500/25 active:scale-95 transition-all">
                      {t('assign')}
                    </button>
                  )}
                  {o.status !== 'completed' && o.status !== 'cancelled' && (
                    <button onClick={(e) => { e.stopPropagation(); setCancellingOrderId(o._id); setCancelReason(''); }}
                      className="px-2.5 py-1.5 text-[11px] font-medium bg-red-500/15 text-red-400 rounded-badge hover:bg-red-500/25 active:scale-95 transition-all">
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-1.5 flex-wrap">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                p === page ? 'bg-primary-500 text-white shadow-btn' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}>{p}</button>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {assigningOrderId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setAssigningOrderId(null)}>
          <div className="bg-[#16213e] rounded-t-sheet sm:rounded-card w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold">{t('assign_driver')}</h2>
            </div>
            <div className="p-5">
              <input value={assignDriverId} onChange={e => setAssignDriverId(e.target.value)}
                placeholder={t('enter_driver_id')}
                className="w-full bg-white/5 border border-white/10 rounded-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all placeholder-gray-500 mb-4" />
            </div>
            <div className="p-5 border-t border-white/5 flex gap-3">
              <button onClick={() => setAssigningOrderId(null)} className="flex-1 py-3 rounded-btn bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 active:scale-[0.98] transition-all">{t('cancel')}</button>
              <button onClick={() => assignMutation.mutate({ orderId: assigningOrderId, driverId: assignDriverId })}
                disabled={!assignDriverId} className="flex-1 py-3 rounded-btn bg-primary-500 text-sm font-semibold shadow-btn disabled:opacity-50 active:scale-[0.98] transition-all">{t('assign')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setCancellingOrderId(null)}>
          <div className="bg-[#16213e] rounded-t-sheet sm:rounded-card w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold">{t('cancel_order')}</h2>
            </div>
            <div className="p-5">
              <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder={t('cancel_reason')}
                className="w-full bg-white/5 border border-white/10 rounded-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all placeholder-gray-500" />
            </div>
            <div className="p-5 border-t border-white/5 flex gap-3">
              <button onClick={() => setCancellingOrderId(null)} className="flex-1 py-3 rounded-btn bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 active:scale-[0.98] transition-all">{t('back')}</button>
              <button onClick={() => cancelMutation.mutate({ orderId: cancellingOrderId, reason: cancelReason })}
                className="flex-1 py-3 rounded-btn bg-red-500 text-sm font-semibold active:scale-[0.98] transition-all">{t('cancel_order')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-[#16213e] rounded-t-sheet sm:rounded-card w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold">{t('order_details')}</h2>
            </div>
            <div className="p-5 space-y-2.5 text-sm">
              {[
                { label: t('order_number'), value: detail.orderNumber },
                { label: t('customer'), value: `${detail.customerId?.firstName} ${detail.customerId?.lastName}` },
                { label: t('driver'), value: detail.driverId?.userId?.firstName || t('not_assigned') },
                { label: t('pickup_label'), value: detail.pickup?.address, truncate: true },
                { label: t('destination_label'), value: detail.destination?.address, truncate: true },
                { label: t('distance'), value: `${detail.distance} km` },
                { label: t('duration'), value: `${detail.duration} min` },
                { label: t('total_label'), value: `${detail.pricing?.total?.toLocaleString()} ${t('sum')}` },
                { label: t('payment'), value: '💵 Naqd' },
                { label: t('created'), value: new Date(detail.createdAt).toLocaleString() },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0 gap-3">
                  <span className="text-gray-400 flex-shrink-0">{item.label}</span>
                  <span className={`text-right ${item.truncate ? 'truncate max-w-[200px]' : ''}`}>{item.value}</span>
                </div>
              ))}
              {detail.cancelReason && (
                <div className="flex justify-between items-center py-1.5 border-b border-white/5 gap-3">
                  <span className="text-gray-400">{t('cancel_reason')}</span>
                  <span className="text-right">{detail.cancelReason}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 gap-3">
                <span className="text-gray-400">{t('status')}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium ${STATUS_COLORS[detail.status] || ''}`}>{detail.status}</span>
              </div>
            </div>
            <div className="p-5 border-t border-white/5">
              <button onClick={() => setDetail(null)} className="w-full py-3 rounded-btn bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 active:scale-[0.98] transition-all">{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

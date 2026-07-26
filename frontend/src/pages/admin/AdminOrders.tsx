import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400', searching: 'bg-blue-500/20 text-blue-400',
  accepted: 'bg-green-500/20 text-green-400', arrived: 'bg-purple-500/20 text-purple-400',
  in_progress: 'bg-indigo-500/20 text-indigo-400', completed: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400', disputed: 'bg-orange-500/20 text-orange-400',
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
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;

  const viewDetail = async (o: any) => {
    try {
      const res = await adminApi.getOrderById(o._id);
      setDetail(res.data.order);
    } catch { toast.error(t('failed_load_order')); }
  };

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold">📦 {t('admin_orders')}</h1>

      <div className="flex gap-2">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('search_orders')} className="flex-1 bg-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none">
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
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">{t('no_orders_found')}</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o: any) => (
            <div key={o._id} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0" onClick={() => viewDetail(o)}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{o.orderNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-500/20'}`}>{o.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {o.customerId?.firstName} → {o.driverId ? `Driver #${o.driverId?._id?.slice(-4)}` : t('no_driver')} • {o.pricing?.total?.toLocaleString()} {t('sum')}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {o.status === 'pending' || o.status === 'searching' ? (
                    <button onClick={() => { setAssigningOrderId(o._id); setAssignDriverId(''); }}
                      className="text-xs text-primary-500 hover:underline">{t('assign')}</button>
                  ) : null}
                  {o.status !== 'completed' && o.status !== 'cancelled' ? (
                    <button onClick={() => { setCancellingOrderId(o._id); setCancelReason(''); }}
                      className="text-xs text-red-400 hover:underline">{t('cancel')}</button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs ${p === page ? 'bg-primary-500 text-white' : 'bg-white/10'}`}>{p}</button>
          ))}
        </div>
      )}

      {assigningOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setAssigningOrderId(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">{t('assign_driver')}</h2>
            <input value={assignDriverId} onChange={e => setAssignDriverId(e.target.value)}
              placeholder={t('enter_driver_id')} className="w-full bg-white/10 rounded-lg px-4 py-3 text-sm outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setAssigningOrderId(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-sm">{t('cancel')}</button>
              <button onClick={() => assignMutation.mutate({ orderId: assigningOrderId, driverId: assignDriverId })}
                disabled={!assignDriverId} className="flex-1 py-3 rounded-xl bg-primary-500 text-sm font-semibold disabled:opacity-50">{t('assign')}</button>
            </div>
          </div>
        </div>
      )}

      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setCancellingOrderId(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">{t('cancel_order')}</h2>
            <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder={t('cancel_reason')} className="w-full bg-white/10 rounded-lg px-4 py-3 text-sm outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setCancellingOrderId(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-sm">{t('back')}</button>
              <button onClick={() => cancelMutation.mutate({ orderId: cancellingOrderId, reason: cancelReason })}
                className="flex-1 py-3 rounded-xl bg-red-500 text-sm font-semibold">{t('cancel_order')}</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetail(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">{t('order_details')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">{t('order_number')}</span><span>{detail.orderNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('status')}</span><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[detail.status]}`}>{detail.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('customer')}</span><span>{detail.customerId?.firstName} {detail.customerId?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('driver')}</span><span>{detail.driverId?.userId?.firstName || detail.driverId?._id || t('not_assigned')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('pickup_label')}</span><span className="text-right max-w-[200px] truncate">{detail.pickup?.address}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('destination_label')}</span><span className="text-right max-w-[200px] truncate">{detail.destination?.address}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('distance')}</span><span>{detail.distance} km</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('duration')}</span><span>{detail.duration} min</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('total_label')}</span><span>{detail.pricing?.total?.toLocaleString()} {t('sum')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('payment')}</span><span>{detail.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('created')}</span><span>{new Date(detail.createdAt).toLocaleString()}</span></div>
              {detail.cancelReason && <div className="flex justify-between"><span className="text-gray-400">{t('cancel_reason')}</span><span>{detail.cancelReason}</span></div>}
            </div>
            <button onClick={() => setDetail(null)} className="w-full mt-4 py-3 rounded-xl bg-white/10 text-sm">{t('close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

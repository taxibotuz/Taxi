import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400', searching: 'bg-blue-500/20 text-blue-400',
  accepted: 'bg-green-500/20 text-green-400', arrived: 'bg-purple-500/20 text-purple-400',
  in_progress: 'bg-indigo-500/20 text-indigo-400', completed: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400', disputed: 'bg-orange-500/20 text-orange-400',
};

export default function AdminOrders() {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }); toast.success('Driver assigned'); setAssigningOrderId(null); setAssignDriverId(''); },
    onError: () => toast.error('Failed to assign driver'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) => adminApi.cancelOrder(orderId, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }); toast.success('Order cancelled'); setCancellingOrderId(null); setCancelReason(''); },
    onError: () => toast.error('Failed to cancel order'),
  });

  const orders = data?.data?.orders || [];
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;

  const viewDetail = async (o: any) => {
    try {
      const res = await adminApi.getOrderById(o._id);
      setDetail(res.data.order);
    } catch { toast.error('Failed to load order details'); }
  };

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold">📦 Orders</h1>

      <div className="flex gap-2">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by order # or customer..." className="flex-1 bg-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="searching">Searching</option>
          <option value="accepted">Accepted</option>
          <option value="arrived">Arrived</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No orders found</div>
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
                    {o.customerId?.firstName} → {o.driverId ? `Driver #${o.driverId?._id?.slice(-4)}` : 'No driver'} • {o.pricing?.total?.toLocaleString()} sum
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {o.status === 'pending' || o.status === 'searching' ? (
                    <button onClick={() => { setAssigningOrderId(o._id); setAssignDriverId(''); }}
                      className="text-xs text-primary-500 hover:underline">Assign</button>
                  ) : null}
                  {o.status !== 'completed' && o.status !== 'cancelled' ? (
                    <button onClick={() => { setCancellingOrderId(o._id); setCancelReason(''); }}
                      className="text-xs text-red-400 hover:underline">Cancel</button>
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
            <h2 className="text-lg font-bold mb-3">Assign Driver</h2>
            <input value={assignDriverId} onChange={e => setAssignDriverId(e.target.value)}
              placeholder="Enter Driver ID..." className="w-full bg-white/10 rounded-lg px-4 py-3 text-sm outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setAssigningOrderId(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-sm">Cancel</button>
              <button onClick={() => assignMutation.mutate({ orderId: assigningOrderId, driverId: assignDriverId })}
                disabled={!assignDriverId} className="flex-1 py-3 rounded-xl bg-primary-500 text-sm font-semibold disabled:opacity-50">Assign</button>
            </div>
          </div>
        </div>
      )}

      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setCancellingOrderId(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">Cancel Order</h2>
            <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..." className="w-full bg-white/10 rounded-lg px-4 py-3 text-sm outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setCancellingOrderId(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-sm">Back</button>
              <button onClick={() => cancelMutation.mutate({ orderId: cancellingOrderId, reason: cancelReason })}
                className="flex-1 py-3 rounded-xl bg-red-500 text-sm font-semibold">Cancel Order</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetail(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">Order Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Order #</span><span>{detail.orderNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[detail.status]}`}>{detail.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Customer</span><span>{detail.customerId?.firstName} {detail.customerId?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Driver</span><span>{detail.driverId?.userId?.firstName || detail.driverId?._id || 'Not assigned'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Pickup</span><span className="text-right max-w-[200px] truncate">{detail.pickup?.address}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Destination</span><span className="text-right max-w-[200px] truncate">{detail.destination?.address}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Distance</span><span>{detail.distance} km</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Duration</span><span>{detail.duration} min</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Total</span><span>{detail.pricing?.total?.toLocaleString()} sum</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Payment</span><span>{detail.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Created</span><span>{new Date(detail.createdAt).toLocaleString()}</span></div>
              {detail.cancelReason && <div className="flex justify-between"><span className="text-gray-400">Cancel Reason</span><span>{detail.cancelReason}</span></div>}
            </div>
            <button onClick={() => setDetail(null)} className="w-full mt-4 py-3 rounded-xl bg-white/10 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

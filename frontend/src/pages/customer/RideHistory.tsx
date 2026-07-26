import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ridesApi } from '../../services/api';
import { Order } from '../../types';

export default function RideHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['rides', 'history'],
    queryFn: () => ridesApi.getOrders({ limit: 50 }),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'cancelled': return 'text-red-400';
      case 'in_progress': return 'text-blue-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '✅ Completed';
      case 'cancelled': return '❌ Cancelled';
      case 'in_progress': return '🔄 In Progress';
      default: return '⏳ Pending';
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 pt-4 px-4 scrollbar-hide">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-6"
      >
        Ride History
      </motion.h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data?.orders?.map((order: Order, i: number) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-gray-400">{order.orderNumber}</span>
                <span className={`text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">●</span>
                  <span className="text-gray-300 truncate">{order.pickup.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400">●</span>
                  <span className="text-gray-300 truncate">{order.destination.address}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                <span className="text-sm text-gray-400">{order.distance} km • {order.duration} min</span>
                <span className="font-semibold">{order.pricing.total.toLocaleString()} sum</span>
              </div>
            </motion.div>
          ))}
          {data?.data?.orders?.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-3">📋</div>
              No rides yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

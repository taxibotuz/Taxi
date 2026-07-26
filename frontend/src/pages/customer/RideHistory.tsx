import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ridesApi } from '../../services/api';
import { Order } from '../../types';
import { useTranslation } from '../../i18n';

export default function RideHistory() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['rides', 'history'],
    queryFn: () => ridesApi.getOrders({ limit: 50 }),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/15 text-green-400';
      case 'cancelled': return 'bg-red-500/15 text-red-400';
      case 'in_progress': return 'bg-blue-500/15 text-blue-400';
      default: return 'bg-yellow-500/15 text-yellow-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return t('completed');
      case 'cancelled': return t('cancelled');
      case 'in_progress': return t('in_progress');
      default: return t('pending');
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 pt-4 px-4 scrollbar-hide">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl sm:text-2xl font-bold mb-5"
      >
        {t('ride_history')}
      </motion.h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-card skeleton" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {data?.data?.orders?.map((order: Order, i: number) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-card p-4"
            >
              <div className="flex justify-between items-start mb-2.5">
                <span className="text-[11px] text-gray-500 font-mono">{order.orderNumber}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-badge ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-gray-300 truncate">{order.pickup.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-gray-300 truncate">{order.destination.address}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                <span className="text-xs text-gray-500">{order.distance} km • {order.duration} min</span>
                <span className="font-semibold text-sm">{order.pricing.total.toLocaleString()} {t('sum')}</span>
              </div>
            </motion.div>
          ))}

          {data?.data?.orders?.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500 text-sm">{t('no_rides_yet')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

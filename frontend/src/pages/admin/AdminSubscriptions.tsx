import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { subscriptionApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

export default function AdminSubscriptions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showGrantSub, setShowGrantSub] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [tab, setTab] = useState<'plans' | 'active' | 'grant'>('plans');

  const { data: plansData } = useQuery({
    queryKey: ['admin', 'subscription', 'plans'],
    queryFn: () => subscriptionApi.adminGetPlans(),
  });

  const { data: activeData } = useQuery({
    queryKey: ['admin', 'subscription', 'active'],
    queryFn: () => subscriptionApi.adminGetActive(),
    enabled: tab === 'active',
  });

  const plans = plansData?.data?.plans || [];
  const activeSubs = activeData?.data?.subscriptions || [];

  const createPlanMutation = useMutation({
    mutationFn: (data: any) => subscriptionApi.adminCreatePlan(data),
    onSuccess: () => {
      toast.success(t('plan_created'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription', 'plans'] });
      setShowCreatePlan(false);
    },
    onError: () => toast.error(t('failed_create_plan')),
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, data }: any) => subscriptionApi.adminUpdatePlan(planId, data),
    onSuccess: () => {
      toast.success(t('plan_updated'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription', 'plans'] });
      setEditingPlan(null);
    },
    onError: () => toast.error(t('failed_update_plan')),
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => subscriptionApi.adminDeletePlan(planId),
    onSuccess: () => {
      toast.success(t('plan_deleted'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription', 'plans'] });
    },
    onError: () => toast.error(t('failed_delete_plan')),
  });

  const grantMutation = useMutation({
    mutationFn: (data: any) => subscriptionApi.adminGrant(data),
    onSuccess: () => {
      toast.success(t('subscription_granted'));
      setShowGrantSub(false);
      setSelectedDriver('');
      setSelectedPlan('');
    },
    onError: () => toast.error(t('failed_grant_subscription')),
  });

  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    durationDays: 30,
    price: 0,
    features: '',
    maxRidesPerDay: 0,
    commissionDiscount: 0,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">{t('manage_subscriptions')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(['plans', 'active', 'grant'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === key
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {key === 'plans' ? t('subscription_plans') : key === 'active' ? t('subscription_active') : t('grant_subscription')}
          </button>
        ))}
      </div>

      {/* Plans Tab */}
      {tab === 'plans' && (
        <div className="space-y-3">
          <button
            onClick={() => { setShowCreatePlan(true); setEditingPlan(null); }}
            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium"
          >
            + {t('create_plan')}
          </button>

          {plans.map((plan: any) => (
            <motion.div
              key={plan._id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-card p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{plan.description}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span>{plan.durationDays} {t('subscription_days')}</span>
                    <span>{plan.price?.toLocaleString()} {t('sum')}</span>
                    {plan.commissionDiscount > 0 && <span>{plan.commissionDiscount}% {t('commission_off')}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingPlan(plan); setShowCreatePlan(true); }}
                    className="px-3 py-1 rounded-lg bg-white/5 text-xs text-gray-400 hover:bg-white/10"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => { if (confirm(t('delete_plan_confirm'))) deletePlanMutation.mutate(plan._id); }}
                    className="px-3 py-1 rounded-lg bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Create/Edit Plan Modal */}
          <AnimatePresence>
            {showCreatePlan && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
                onClick={() => { setShowCreatePlan(false); setEditingPlan(null); }}
              >
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  className="glass rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-lg font-bold">{editingPlan ? t('edit_plan') : t('create_plan')}</h2>
                   <input
                     type="text"
                     placeholder={t('plan_name')}
                     value={editingPlan?.name ?? planForm.name}
                     onChange={(e) => editingPlan ? setEditingPlan({ ...editingPlan, name: e.target.value }) : setPlanForm({ ...planForm, name: e.target.value })}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                   />
                   <input
                     type="text"
                     placeholder={t('description')}
                     value={editingPlan?.description ?? planForm.description}
                     onChange={(e) => editingPlan ? setEditingPlan({ ...editingPlan, description: e.target.value }) : setPlanForm({ ...planForm, description: e.target.value })}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                   />
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-xs text-gray-400">{t('duration_days')}</label>
                       <input
                         type="number"
                         value={editingPlan?.durationDays ?? planForm.durationDays}
                         onChange={(e) => editingPlan ? setEditingPlan({ ...editingPlan, durationDays: +e.target.value }) : setPlanForm({ ...planForm, durationDays: +e.target.value })}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                       />
                     </div>
                     <div>
                       <label className="text-xs text-gray-400">{t('price_som')}</label>
                       <input
                         type="number"
                         value={editingPlan?.price ?? planForm.price}
                         onChange={(e) => editingPlan ? setEditingPlan({ ...editingPlan, price: +e.target.value }) : setPlanForm({ ...planForm, price: +e.target.value })}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                       />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-xs text-gray-400">{t('max_rides_per_day')}</label>
                       <input
                         type="number"
                         value={editingPlan?.maxRidesPerDay ?? planForm.maxRidesPerDay}
                         onChange={(e) => editingPlan ? setEditingPlan({ ...editingPlan, maxRidesPerDay: +e.target.value }) : setPlanForm({ ...planForm, maxRidesPerDay: +e.target.value })}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                       />
                     </div>
                     <div>
                       <label className="text-xs text-gray-400">{t('commission_discount')}</label>
                       <input
                         type="number"
                         value={editingPlan?.commissionDiscount ?? planForm.commissionDiscount}
                         onChange={(e) => editingPlan ? setEditingPlan({ ...editingPlan, commissionDiscount: +e.target.value }) : setPlanForm({ ...planForm, commissionDiscount: +e.target.value })}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                       />
                     </div>
                   </div>
                  <button
                    onClick={() => {
                      const data = editingPlan || planForm;
                      if (editingPlan) {
                        updatePlanMutation.mutate({ planId: editingPlan._id, data });
                      } else {
                        if (!planForm.name.trim()) {
                          toast.error(t('fill_required_fields'));
                          return;
                        }
                        if (planForm.durationDays < 1) {
                          toast.error(t('fill_required_fields'));
                          return;
                        }
                        createPlanMutation.mutate({ ...data, features: data.features ? data.features.split(',').map((f: string) => f.trim()) : [] });
                      }
                    }}
                    disabled={!editingPlan && !planForm.name.trim()}
                    className="w-full py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {editingPlan ? t('save_changes') : t('create_plan')}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Active Subscriptions Tab */}
      {tab === 'active' && (
        <div className="space-y-3">
          {activeSubs.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">{t('no_active_subscriptions')}</div>
          )}
          {activeSubs.map((sub: any) => (
            <motion.div
              key={sub._id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">
                    {sub.driverId?.userId?.firstName} {sub.driverId?.userId?.lastName}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {sub.planId?.name} • {t('expires')}: {new Date(sub.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium">
                  {t('active')}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Grant Subscription Tab */}
      {tab === 'grant' && (
        <div className="space-y-3">
          <div className="glass rounded-card p-4 space-y-3">
            <h3 className="font-semibold">{t('grant_subscription')}</h3>
            <input
              type="text"
              placeholder={t('driver_id')}
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
            />
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="">{t('select_plan')}</option>
              {plans.map((plan: any) => (
                <option key={plan._id} value={plan._id}>
                  {plan.name} - {plan.durationDays} {t('subscription_days')} - {plan.price?.toLocaleString()} {t('sum')}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!selectedDriver || !selectedPlan) {
                  toast.error(t('please_fill_fields'));
                  return;
                }
                grantMutation.mutate({ driverId: selectedDriver, planId: selectedPlan });
              }}
              disabled={grantMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50"
            >
              {grantMutation.isPending ? t('granting') : t('grant_subscription_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

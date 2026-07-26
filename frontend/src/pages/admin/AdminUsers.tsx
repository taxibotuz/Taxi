import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

export default function AdminUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search, role: roleFilter || undefined }),
  });

  const banMutation = useMutation({
    mutationFn: (userId: string) => adminApi.banUser(userId, 'Banned by admin'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success(t('user_banned')); },
    onError: () => toast.error(t('failed_ban')),
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unbanUser(userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success(t('user_unbanned')); },
    onError: () => toast.error(t('failed_unban')),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success(t('user_deleted')); },
    onError: () => toast.error(t('failed_delete')),
  });

  const users = data?.data?.users || [];
  const pages = data?.data?.pages || 1;

  const viewDetail = async (u: any) => {
    try {
      const res = await adminApi.getUserById(u._id);
      setDetail(res.data);
    } catch { toast.error(t('failed_load_user')); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">👤 {t('admin_users')}</h1>

      <div className="flex gap-2">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('search_users')}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder-gray-500" />
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all flex-shrink-0">
          <option value="">{t('all_roles')}</option>
          <option value="customer">{t('customer')}</option>
          <option value="driver">{t('driver_role')}</option>
          <option value="admin">{t('admin_role')}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-card skeleton" />)}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-gray-500 text-sm">{t('no_users_found')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <div key={u._id} className="glass rounded-card p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => viewDetail(u)}>
                <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold text-sm flex-shrink-0">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-gray-500 truncate">@{u.username || 'no username'} • {u.role}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium flex-shrink-0 ${u.isBanned ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                  {u.isBanned ? t('banned') : t('active')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                {u.isBanned ? (
                  <button onClick={() => unbanMutation.mutate(u._id)}
                    className="px-3 py-1.5 text-[11px] font-medium bg-green-500/15 text-green-400 rounded-badge hover:bg-green-500/25 active:scale-95 transition-all">
                    {t('unban')}
                  </button>
                ) : (
                  <button onClick={() => banMutation.mutate(u._id)}
                    className="px-3 py-1.5 text-[11px] font-medium bg-red-500/15 text-red-400 rounded-badge hover:bg-red-500/25 active:scale-95 transition-all">
                    {t('ban')}
                  </button>
                )}
                <button onClick={() => { if (confirm(t('delete_confirm'))) deleteMutation.mutate(u._id); }}
                  className="px-3 py-1.5 text-[11px] font-medium bg-red-500/15 text-red-400 rounded-badge hover:bg-red-500/25 active:scale-95 transition-all ml-auto">
                  {t('del')}
                </button>
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

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-[#16213e] rounded-t-sheet sm:rounded-card w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold">{t('user_details')}</h2>
            </div>
            <div className="p-5 space-y-4">
              {detail.user && (
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: t('name'), value: `${detail.user.firstName} ${detail.user.lastName}` },
                    { label: t('username'), value: `@${detail.user.username || '-'}` },
                    { label: t('phone'), value: detail.user.phone || '-' },
                    { label: t('role'), value: detail.user.role },
                    { label: t('language'), value: detail.user.language },
                    { label: t('status'), value: detail.user.isBanned ? t('banned') : t('active') },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {detail.stats && (
                <div className="glass rounded-card p-4">
                  <div className="text-sm font-semibold mb-3">{t('stats')}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">{t('total_rides')}</span><span>{detail.stats.totalRides}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">{t('total_spent')}</span><span>{detail.stats.totalSpent?.toLocaleString()} {t('sum')}</span></div>
                  </div>
                </div>
              )}
              {detail.recentOrders && detail.recentOrders.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2">{t('recent_rides')}</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                    {detail.recentOrders.map((o: any) => (
                      <div key={o._id} className="flex justify-between text-xs py-1.5 border-b border-white/5">
                        <span className="text-gray-400 font-mono">#{o.orderNumber}</span>
                        <span className="text-gray-500">{o.status}</span>
                        <span className="text-gray-500">{o.pricing?.total?.toLocaleString()} {t('sum')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-white/5">
              <button onClick={() => setDetail(null)} className="w-full py-3 rounded-btn bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 active:scale-[0.98] transition-all">
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User banned'); },
    onError: () => toast.error('Failed to ban user'),
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unbanUser(userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User unbanned'); },
    onError: () => toast.error('Failed to unban user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User deleted'); },
    onError: () => toast.error('Failed to delete user'),
  });

  const users = data?.data?.users || [];
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;

  const viewDetail = async (u: any) => {
    try {
      const res = await adminApi.getUserById(u._id);
      setDetail(res.data);
    } catch { toast.error('Failed to load user details'); }
  };

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold">👤 Users</h1>

      <div className="flex gap-2">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search users..." className="flex-1 bg-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <div key={u._id} className="glass rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => viewDetail(u)}>
                <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold text-sm">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-gray-500">@{u.username || 'no username'} • {u.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.isBanned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {u.isBanned ? 'Banned' : 'Active'}
                </span>
                {u.isBanned ? (
                  <button onClick={() => unbanMutation.mutate(u._id)} className="text-xs text-green-400 hover:underline">Unban</button>
                ) : (
                  <button onClick={() => banMutation.mutate(u._id)} className="text-xs text-red-400 hover:underline">Ban</button>
                )}
                <button onClick={() => { if (confirm('Delete this user?')) deleteMutation.mutate(u._id); }}
                  className="text-xs text-red-400 hover:underline">Del</button>
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

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetail(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">User Details</h2>
            {detail.user && (
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-400">Name</span><span>{detail.user.firstName} {detail.user.lastName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Username</span><span>@{detail.user.username || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Phone</span><span>{detail.user.phone || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Role</span><span>{detail.user.role}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Language</span><span>{detail.user.language}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Status</span><span>{detail.user.isBanned ? 'Banned' : 'Active'}</span></div>
              </div>
            )}
            {detail.stats && (
              <div className="glass rounded-xl p-3 mb-4">
                <div className="text-sm font-semibold mb-2">Stats</div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Total Rides</span><span>{detail.stats.totalRides}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Total Spent</span><span>{detail.stats.totalSpent?.toLocaleString()} sum</span></div>
              </div>
            )}
            {detail.recentOrders && detail.recentOrders.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-2">Recent Rides</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {detail.recentOrders.map((o: any) => (
                    <div key={o._id} className="flex justify-between text-xs py-1 border-b border-white/5">
                      <span className="text-gray-400">#{o.orderNumber}</span>
                      <span className="text-gray-500">{o.status}</span>
                      <span className="text-gray-500">{o.pricing?.total?.toLocaleString()} sum</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setDetail(null)} className="w-full mt-4 py-3 rounded-xl bg-white/10 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

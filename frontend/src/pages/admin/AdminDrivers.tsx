import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

interface DriverForm {
  status: string;
  isApproved: boolean;
  isOnline: boolean;
  isSuspended: boolean;
  isBlacklisted: boolean;
  commission: number;
  carBrand: string;
  carModel: string;
  carColor: string;
  carPlate: string;
  carYear: number;
  carSeats: number;
  rating: number;
}

interface AddDriverState {
  userId: string | null;
  userTelegramId: string;
  userInfo: string;
}

const initialForm: DriverForm = {
  status: 'offline', isApproved: false, isOnline: false, isSuspended: false,
  isBlacklisted: false, commission: 15, carBrand: '', carModel: '',
  carColor: '', carPlate: '', carYear: 2020, carSeats: 4, rating: 5,
};

export default function AdminDrivers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<DriverForm>(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [addState, setAddState] = useState<AddDriverState>({ userId: null, userTelegramId: '', userInfo: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'drivers', page, search, statusFilter],
    queryFn: () => adminApi.getDrivers({ page, limit: 20, search, status: statusFilter || undefined }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateDriver(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      toast.success(t('driver_updated'));
      setShowForm(false);
      setEditingId(null);
    },
    onError: () => toast.error(t('failed_update_driver')),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.updateDriver(id, { isApproved: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      toast.success(t('driver_approved'));
    },
    onError: () => toast.error(t('failed_update_driver')),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      toast.success(t('driver_created'));
      setShowForm(false);
      setIsAdding(false);
      setAddState({ userId: null, userTelegramId: '', userInfo: '' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || t('failed_create_driver'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      toast.success(t('driver_deleted'));
    },
    onError: () => toast.error(t('failed_delete_driver')),
  });

  const drivers = data?.data?.drivers || [];
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;

  const openAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setForm(initialForm);
    setAddState({ userId: null, userTelegramId: '', userInfo: '' });
    setShowForm(true);
  };

  const openEdit = (d: any) => {
    setIsAdding(false);
    setEditingId(d._id);
    setForm({
      status: d.status, isApproved: d.isApproved, isOnline: d.isOnline,
      isSuspended: d.isSuspended, isBlacklisted: d.isBlacklisted,
      commission: d.commission || 15, carBrand: d.car?.brand || '',
      carModel: d.car?.model || '', carColor: d.car?.color || '',
      carPlate: d.car?.plateNumber || '', carYear: d.car?.year || 2020,
      carSeats: d.car?.seats || 4, rating: d.rating || 5,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (isAdding) {
      if (!addState.userId) { toast.error(t('select_user_first')); return; }
      createMutation.mutate({
        userId: addState.userId,
        commission: form.commission,
        isApproved: form.isApproved,
        isOnline: form.isOnline,
        car: {
          brand: form.carBrand,
          model: form.carModel,
          color: form.carColor,
          plateNumber: form.carPlate,
          year: form.carYear,
          seats: form.carSeats,
        },
      });
      return;
    }
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        status: form.status, isApproved: form.isApproved, isOnline: form.isOnline,
        isSuspended: form.isSuspended, isBlacklisted: form.isBlacklisted,
        commission: form.commission, rating: form.rating,
        car: { brand: form.carBrand, model: form.carModel, color: form.carColor, plateNumber: form.carPlate, year: form.carYear, seats: form.carSeats },
      },
    });
  };

  const lookupUser = async () => {
    const tid = addState.userTelegramId.trim();
    if (!tid) { toast.error(t('enter_telegram_id_error')); return; }
    try {
      const res = await adminApi.getUsers({ search: tid });
      const users = res.data?.users || [];
      if (users.length === 0) {
        const isNum = /^\d+$/.test(tid);
        if (isNum && tid.length >= 5) {
          toast.error(t('telegram_user_never_started'));
        } else {
          toast.error(t('user_not_found'));
        }
        return;
      }
      const user = users[0];
      setAddState(s => ({
        ...s,
        userId: user._id,
        userInfo: `${user.firstName || ''} ${user.lastName || ''} (@${user.username || 'no username'}) • ${user.phone || 'no phone'}`,
      }));
      toast.success(t('user_found'));
    } catch {
      toast.error(t('failed_lookup_user'));
    }
  };

  const viewDetail = async (d: any) => {
    try {
      const res = await adminApi.getDriverById(d._id);
      setDetail(res.data.driver);
    } catch { toast.error(t('failed_load_driver')); }
  };

  const exportCSV = () => {
    const headers = 'Name,Phone,Car,Plate,Status,Rating,Rides,Earnings,Online\n';
    const rows = drivers.map((d: any) =>
      `"${d.userId?.firstName || ''} ${d.userId?.lastName || ''}",${d.userId?.phone || ''},${d.car?.brand || ''} ${d.car?.model || ''},${d.car?.plateNumber || ''},${d.status},${d.rating},${d.totalRides},${d.totalEarnings},${d.isOnline}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'drivers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🚗 {t('admin_drivers')}</h1>
        <div className="flex gap-2">
          <button onClick={openAdd} className="text-xs bg-primary-500 px-3 py-1.5 rounded-lg hover:bg-primary-600 font-semibold">+ {t('add_driver')}</button>
          <button onClick={exportCSV} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">{t('export_csv')}</button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('search_drivers')}
          className="flex-1 bg-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">{t('all_status')}</option>
          <option value="online">{t('status_online')}</option>
          <option value="offline">{t('status_offline')}</option>
          <option value="busy">{t('status_busy')}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">{t('no_drivers_found_admin')}</div>
      ) : (
        <div className="space-y-2">
          {drivers.map((d: any) => (
            <div key={d._id} className="glass rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full ${d.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{d.userId?.firstName} {d.userId?.lastName}</div>
                  <div className="text-xs text-gray-500">{d.car?.brand} {d.car?.model} • {d.car?.plateNumber}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.isApproved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {d.isApproved ? t('approved') : t('pending_approval_stat')}
                </span>
                {!d.isApproved && (
                  <button onClick={() => approveMutation.mutate(d._id)} disabled={approveMutation.isPending}
                    className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full hover:bg-green-500/30 disabled:opacity-50">{t('approve_btn')}</button>
                )}
                <button onClick={() => viewDetail(d)} className="text-xs text-primary-500 hover:underline">{t('view')}</button>
                <button onClick={() => openEdit(d)} className="text-xs text-primary-500 hover:underline">{t('edit')}</button>
                <button onClick={() => { if (confirm(t('delete_driver_confirm'))) deleteMutation.mutate(d._id); }}
                  className="text-xs text-red-400 hover:underline">{t('del')}</button>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{isAdding ? t('add_driver') : t('edit_driver')}</h2>
            <div className="space-y-3">

              {isAdding && (
                <>
                  <div>
                    <label className="text-xs text-gray-400">{t('telegram_id')}</label>
                    <div className="flex gap-2">
                      <input value={addState.userTelegramId} onChange={e => setAddState(s => ({ ...s, userTelegramId: e.target.value, userId: null, userInfo: '' }))}
                        placeholder={t('enter_telegram_id')}
                        className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
                      <button onClick={lookupUser} className="bg-primary-500 px-3 py-2 rounded-lg text-sm whitespace-nowrap">{t('find')}</button>
                    </div>
                  </div>
                  {addState.userId && (
                    <div className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold">
                        {(addState.userInfo || '?').charAt(0)}
                      </div>
                      {addState.userInfo}
                    </div>
                  )}
                  <hr className="border-white/10" />
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-400">{t('car_brand')}</label><input value={form.carBrand} onChange={e => setForm({ ...form, carBrand: e.target.value })} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-400">{t('car_model')}</label><input value={form.carModel} onChange={e => setForm({ ...form, carModel: e.target.value })} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-400">{t('car_color')}</label><input value={form.carColor} onChange={e => setForm({ ...form, carColor: e.target.value })} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-400">{t('car_plate')}</label><input value={form.carPlate} onChange={e => setForm({ ...form, carPlate: e.target.value })} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-400">{t('car_year')}</label><input type="number" value={form.carYear} onChange={e => setForm({ ...form, carYear: +e.target.value })} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-400">{t('seats')}</label><input type="number" value={form.carSeats} onChange={e => setForm({ ...form, carSeats: +e.target.value })} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-400">{t('commission')}</label><input type="number" value={form.commission} onChange={e => setForm({ ...form, commission: +e.target.value })} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-400">{t('rating_label')}</label><input type="number" step="0.1" value={form.rating} onChange={e => setForm({ ...form, rating: +e.target.value })} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isApproved} onChange={e => setForm({ ...form, isApproved: e.target.checked })} /> {t('approved')}</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isOnline} onChange={e => setForm({ ...form, isOnline: e.target.checked })} /> {t('online_label')}</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isSuspended} onChange={e => setForm({ ...form, isSuspended: e.target.checked })} /> {t('suspended')}</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-white/10 text-sm">{t('cancel')}</button>
              <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-3 rounded-xl bg-primary-500 text-sm font-semibold disabled:opacity-50">
                {isAdding ? t('add_driver') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetail(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">{t('driver_details')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">{t('name')}</span><span>{detail.userId?.firstName} {detail.userId?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('phone')}</span><span>{detail.userId?.phone || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('telegram')}</span><span>{detail.userId?.telegramId || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('car')}</span><span>{detail.car?.brand} {detail.car?.model} ({detail.car?.color})</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('car_plate')}</span><span>{detail.car?.plateNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('seats')}</span><span>{detail.car?.seats || 4}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('rating_label')}</span><span>⭐ {detail.rating}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('status')}</span><span className={detail.isOnline ? 'text-green-400' : 'text-gray-400'}>{detail.isOnline ? t('online_label') : t('status_offline')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('approved')}</span><span>{detail.isApproved ? t('yes') : t('no')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('suspended')}</span><span>{detail.isSuspended ? t('yes') : t('no')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('total_rides')}</span><span>{detail.totalRides}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t('total_earnings')}</span><span>{detail.totalEarnings?.toLocaleString()} {t('sum')}</span></div>
            </div>
            <button onClick={() => setDetail(null)} className="w-full mt-4 py-3 rounded-xl bg-white/10 text-sm">{t('close')}</button>
            {!detail.isApproved && (
              <button onClick={() => { approveMutation.mutate(detail._id); setDetail(null); }}
                disabled={approveMutation.isPending}
                className="w-full mt-2 py-3 rounded-xl bg-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/30 disabled:opacity-50">{t('approve_btn')}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

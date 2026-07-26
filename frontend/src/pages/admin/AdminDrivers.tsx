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
          brand: form.carBrand, model: form.carModel, color: form.carColor,
          plateNumber: form.carPlate, year: form.carYear, seats: form.carSeats,
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
        toast.error(/^\d+$/.test(tid) && tid.length >= 5 ? t('telegram_user_never_started') : t('user_not_found'));
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

  const InputField = ({ label, value, onChange, type = 'text', step }: { label: string; value: any; onChange: (v: any) => void; type?: string; step?: string }) => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input type={type} step={step} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder-gray-500" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">🚗 {t('admin_drivers')}</h1>
        <div className="flex gap-2">
          <button onClick={openAdd} className="flex-1 sm:flex-none px-4 py-2 bg-primary-500 text-white text-sm rounded-btn font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all shadow-btn">
            + {t('add_driver')}
          </button>
          <button onClick={exportCSV} className="flex-1 sm:flex-none px-4 py-2 bg-white/5 border border-white/10 text-sm rounded-btn hover:bg-white/10 transition-all">
            {t('export_csv')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('search_drivers')}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder-gray-500"
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all flex-shrink-0">
          <option value="">{t('all_status')}</option>
          <option value="online">{t('status_online')}</option>
          <option value="offline">{t('status_offline')}</option>
          <option value="busy">{t('status_busy')}</option>
        </select>
      </div>

      {/* Driver List */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-card skeleton" />)}</div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🚗</div>
          <p className="text-gray-500 text-sm">{t('no_drivers_found_admin')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drivers.map((d: any) => (
            <div key={d._id} className="glass rounded-card p-3 sm:p-4">
              {/* Main Row */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{d.userId?.firstName} {d.userId?.lastName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium ${d.isApproved ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                      {d.isApproved ? t('approved') : t('pending_approval_stat')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {d.car?.brand} {d.car?.model} • {d.car?.plateNumber}
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5 flex-wrap">
                {!d.isApproved && (
                  <button onClick={() => approveMutation.mutate(d._id)} disabled={approveMutation.isPending}
                    className="px-3 py-1.5 text-[11px] font-medium bg-green-500/15 text-green-400 rounded-badge hover:bg-green-500/25 active:scale-95 transition-all disabled:opacity-50">
                    {t('approve_btn')}
                  </button>
                )}
                <button onClick={() => viewDetail(d)}
                  className="px-3 py-1.5 text-[11px] font-medium bg-white/5 text-gray-300 rounded-badge hover:bg-white/10 active:scale-95 transition-all">
                  {t('view')}
                </button>
                <button onClick={() => openEdit(d)}
                  className="px-3 py-1.5 text-[11px] font-medium bg-primary-500/15 text-primary-400 rounded-badge hover:bg-primary-500/25 active:scale-95 transition-all">
                  {t('edit')}
                </button>
                <button onClick={() => { if (confirm(t('delete_driver_confirm'))) deleteMutation.mutate(d._id); }}
                  className="px-3 py-1.5 text-[11px] font-medium bg-red-500/15 text-red-400 rounded-badge hover:bg-red-500/25 active:scale-95 transition-all ml-auto">
                  {t('del')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
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

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#16213e] rounded-t-sheet sm:rounded-card w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5 sticky top-0 bg-[#16213e] z-10">
              <h2 className="text-lg font-bold">{isAdding ? t('add_driver') : t('edit_driver')}</h2>
            </div>
            <div className="p-5 space-y-4">
              {isAdding && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">{t('telegram_id')}</label>
                    <div className="flex gap-2">
                      <input value={addState.userTelegramId} onChange={e => setAddState(s => ({ ...s, userTelegramId: e.target.value, userId: null, userInfo: '' }))}
                        placeholder={t('enter_telegram_id')}
                        className="flex-1 bg-white/5 border border-white/10 rounded-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all" />
                      <button onClick={lookupUser} className="px-4 py-2.5 bg-primary-500 rounded-input text-sm font-semibold hover:bg-primary-600 active:scale-95 transition-all flex-shrink-0">{t('find')}</button>
                    </div>
                  </div>
                  {addState.userId && (
                    <div className="text-xs text-green-400 bg-green-500/10 px-3 py-2.5 rounded-input flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(addState.userInfo || '?').charAt(0)}
                      </div>
                      <span className="truncate">{addState.userInfo}</span>
                    </div>
                  )}
                  <hr className="border-white/5" />
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InputField label={t('car_brand')} value={form.carBrand} onChange={v => setForm({ ...form, carBrand: v })} />
                <InputField label={t('car_model')} value={form.carModel} onChange={v => setForm({ ...form, carModel: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label={t('car_color')} value={form.carColor} onChange={v => setForm({ ...form, carColor: v })} />
                <InputField label={t('car_plate')} value={form.carPlate} onChange={v => setForm({ ...form, carPlate: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label={t('car_year')} value={form.carYear} onChange={v => setForm({ ...form, carYear: +v })} type="number" />
                <InputField label={t('seats')} value={form.carSeats} onChange={v => setForm({ ...form, carSeats: +v })} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label={t('commission')} value={form.commission} onChange={v => setForm({ ...form, commission: +v })} type="number" />
                <InputField label={t('rating_label')} value={form.rating} onChange={v => setForm({ ...form, rating: +v })} type="number" step="0.1" />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isApproved} onChange={e => setForm({ ...form, isApproved: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary-500" />
                  {t('approved')}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isOnline} onChange={e => setForm({ ...form, isOnline: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary-500" />
                  {t('online_label')}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isSuspended} onChange={e => setForm({ ...form, isSuspended: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary-500" />
                  {t('suspended')}
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-white/5 sticky bottom-0 bg-[#16213e]">
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-btn bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 active:scale-[0.98] transition-all">
                  {t('cancel')}
                </button>
                <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-3 rounded-btn bg-primary-500 text-sm font-semibold shadow-btn hover:bg-primary-600 disabled:opacity-50 active:scale-[0.98] transition-all">
                  {isAdding ? t('add_driver') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-[#16213e] rounded-t-sheet sm:rounded-card w-full sm:max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold">{t('driver_details')}</h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                { label: t('name'), value: `${detail.userId?.firstName} ${detail.userId?.lastName}` },
                { label: t('phone'), value: detail.userId?.phone || '-' },
                { label: t('telegram'), value: detail.userId?.telegramId || '-' },
                { label: t('car'), value: `${detail.car?.brand} ${detail.car?.model} (${detail.car?.color})` },
                { label: t('car_plate'), value: detail.car?.plateNumber },
                { label: t('seats'), value: detail.car?.seats || 4 },
                { label: t('rating_label'), value: `⭐ ${detail.rating}` },
                { label: t('status'), value: detail.isOnline ? t('online_label') : t('status_offline'), highlight: detail.isOnline },
                { label: t('approved'), value: detail.isApproved ? t('yes') : t('no') },
                { label: t('total_rides'), value: detail.totalRides },
                { label: t('total_earnings'), value: `${detail.totalEarnings?.toLocaleString()} ${t('sum')}` },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-gray-400">{item.label}</span>
                  <span className={`text-right ${item.highlight ? 'text-green-400 font-medium' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-white/5 space-y-2">
              {!detail.isApproved && (
                <button onClick={() => { approveMutation.mutate(detail._id); setDetail(null); }}
                  disabled={approveMutation.isPending}
                  className="w-full py-3 rounded-btn bg-green-500/15 text-green-400 text-sm font-semibold hover:bg-green-500/25 disabled:opacity-50 active:scale-[0.98] transition-all">
                  {t('approve_btn')}
                </button>
              )}
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

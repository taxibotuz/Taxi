import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import type { Settings } from '../../types';
import { useTranslation } from '../../i18n';

export default function AdminSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
  });

  useEffect(() => {
    if (data?.data?.settings && !form) {
      setForm(data.data.settings);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (data: any) => adminApi.updateSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }); toast.success(t('settings_saved')); },
    onError: () => toast.error(t('failed_save_settings')),
  });

  const update = (path: string, value: any) => {
    if (!form) return;
    const keys = path.split('.');
    const newForm = { ...form };
    let obj: any = newForm;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] = { ...obj[keys[i]] };
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setForm(newForm);
  };

  const handleSave = () => {
    if (!form) return;
    mutation.mutate(form);
  };

  if (isLoading || !form) {
    return <div className="py-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>;
  }

  const Input = ({ label, path, type = 'text', step }: { label: string; path: string; type?: string; step?: string }) => {
    const keys = path.split('.');
    let val: any = form;
    for (const k of keys) val = val?.[k];
    return (
      <div>
        <label className="text-xs text-gray-400 block mb-1">{label}</label>
          <input type={type} step={step} value={val ?? ''} onChange={e => update(path, type === 'number' || type === 'range' ? Number(e.target.value) : e.target.value)}
          className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
      </div>
    );
  };

  const Toggle = ({ label, path }: { label: string; path: string }) => {
    const keys = path.split('.');
    let val: any = form;
    for (const k of keys) val = val?.[k];
    return (
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={!!val} onChange={e => update(path, e.target.checked)}
          className="w-4 h-4 rounded accent-primary-500" />
        {label}
      </label>
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="glass rounded-2xl p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('settings_title')}</h1>
        <button onClick={handleSave} className="bg-primary-500 px-6 py-2 rounded-xl text-sm font-semibold">{t('save_all')}</button>
      </div>

      <Section title={t('general')}>
        <Input label={t('app_name')} path="general.appName" />
        <Input label={t('support_phone')} path="general.contactPhone" />
        <Input label={t('support_url')} path="general.supportUrl" />
        <Input label={t('default_language')} path="general.defaultLanguage" />
      </Section>

      <Section title={t('pricing')}>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('base_fare_sum')} path="pricing.baseFare" type="number" />
          <Input label={t('price_per_km')} path="pricing.pricePerKm" type="number" />
          <Input label={t('price_per_minute')} path="pricing.pricePerMinute" type="number" />
          <Input label={t('minimum_fare')} path="pricing.minimumFare" type="number" />
          <Input label={t('night_coefficient')} path="pricing.nightCoefficient" type="number" step="0.1" />
          <Input label={t('rush_coefficient')} path="pricing.rushCoefficient" type="number" step="0.1" />
          <Input label={t('airport_fee')} path="pricing.airportFee" type="number" />
        </div>
        <Toggle label={t('surge_enabled')} path="pricing.surgeEnabled" />
      </Section>

      <Section title={t('search_settings')}>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('max_radius')} path="search.maxRadius" type="number" />
          <Input label={t('search_timeout')} path="search.searchTimeout" type="number" />
          <Input label={t('max_drivers')} path="search.maxDriversPerSearch" type="number" />
          <Input label={t('expansion_step')} path="search.expansionStep" type="number" />
          <Input label={t('max_expansions')} path="search.maxExpansions" type="number" />
        </div>
      </Section>

      <Section title={t('driver_settings')}>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('commission_percent')} path="driver.commission" type="number" />
          <Input label={t('min_rating')} path="driver.minRating" type="number" step="0.1" />
          <Input label={t('max_rides_before_break')} path="driver.maxRidesBeforeBreak" type="number" />
        </div>
      </Section>

       <Section title={t('features')}>
         <div className="flex flex-wrap gap-4">
           <Toggle label={t('food_delivery')} path="features.foodDelivery" />
           <Toggle label={t('ride_scheduling')} path="features.rideScheduling" />
           <Toggle label={t('referral_system')} path="features.referralSystem" />
           <Toggle label={t('sos_button')} path="features.sosButton" />
         </div>
       </Section>

       <Section title={t('district_boundary')}>
         <div className="space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-xs text-gray-400">{t('polygon_vertices')}</span>
             <button
               onClick={() => {
                 if (!form?.district?.boundary) return;
                 const last = form.district.boundary[form.district.boundary.length - 1];
                 update('district.boundary', [...form.district.boundary, { lat: last.lat + 0.01, lng: last.lng + 0.01 }]);
               }}
               className="text-xs bg-primary-500/20 text-primary-400 px-3 py-1 rounded-lg"
             >
               {t('add_vertex')}
             </button>
           </div>
           <div className="max-h-60 overflow-y-auto space-y-1">
             {(form.district?.boundary || []).map((_: any, i: number) => (
               <div key={i} className="flex items-center gap-2">
                 <span className="text-[10px] text-gray-500 w-4">{i + 1}</span>
                 <input
                   type="number"
                   step="0.0001"
                   value={form.district.boundary[i].lat}
                   onChange={(e) => {
                     const b = [...(form.district?.boundary || [])];
                     b[i] = { ...b[i], lat: Number(e.target.value) };
                     update('district.boundary', b);
                   }}
                   className="w-24 bg-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                   placeholder="lat"
                 />
                 <input
                   type="number"
                   step="0.0001"
                   value={form.district.boundary[i].lng}
                   onChange={(e) => {
                     const b = [...(form.district?.boundary || [])];
                     b[i] = { ...b[i], lng: Number(e.target.value) };
                     update('district.boundary', b);
                   }}
                   className="w-24 bg-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                   placeholder="lng"
                 />
                 {(form.district?.boundary || []).length > 3 && (
                   <button
                     onClick={() => {
                       const b = [...(form.district?.boundary || [])];
                       b.splice(i, 1);
                       update('district.boundary', b);
                     }}
                     className="text-red-400 text-xs hover:text-red-300"
                   >
                     ✕
                   </button>
                 )}
               </div>
             ))}
           </div>
           <div className="flex gap-2 text-[10px] text-gray-500">
             <span>{t('min_vertices')}</span>
             <span>•</span>
             <span>{t('vertices_count')}{(form.district?.boundary || []).length}</span>
           </div>
         </div>
       </Section>

       <Section title={t('maintenance')}>
        <Toggle label={t('maintenance_mode')} path="maintenance.isEnabled" />
        {form.maintenance?.isEnabled && <Input label={t('maintenance_message')} path="maintenance.message" />}
      </Section>

      <div className="flex justify-end">
        <button onClick={handleSave} className="bg-primary-500 px-8 py-3 rounded-xl text-sm font-semibold">{t('save_all_settings')}</button>
      </div>
    </div>
  );
}

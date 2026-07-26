import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import type { Settings } from '../../types';

export default function AdminSettings() {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }); toast.success('Settings saved'); },
    onError: () => toast.error('Failed to save settings'),
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
        <h1 className="text-xl font-bold">⚙ Settings</h1>
        <button onClick={handleSave} className="bg-primary-500 px-6 py-2 rounded-xl text-sm font-semibold">Save All</button>
      </div>

      <Section title="General">
        <Input label="App Name" path="general.appName" />
        <Input label="Support Phone" path="general.contactPhone" />
        <Input label="Support URL" path="general.supportUrl" />
        <Input label="Default Language" path="general.defaultLanguage" />
      </Section>

      <Section title="Pricing">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Base Fare (sum)" path="pricing.baseFare" type="number" />
          <Input label="Price per km" path="pricing.pricePerKm" type="number" />
          <Input label="Price per minute" path="pricing.pricePerMinute" type="number" />
          <Input label="Minimum Fare" path="pricing.minimumFare" type="number" />
          <Input label="Night Coefficient" path="pricing.nightCoefficient" type="number" step="0.1" />
          <Input label="Rush Coefficient" path="pricing.rushCoefficient" type="number" step="0.1" />
          <Input label="Airport Fee" path="pricing.airportFee" type="number" />
        </div>
        <Toggle label="Surge Pricing Enabled" path="pricing.surgeEnabled" />
      </Section>

      <Section title="Search">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Max Search Radius (km)" path="search.maxRadius" type="number" />
          <Input label="Search Timeout (s)" path="search.searchTimeout" type="number" />
          <Input label="Max Drivers / Search" path="search.maxDriversPerSearch" type="number" />
          <Input label="Expansion Step (km)" path="search.expansionStep" type="number" />
          <Input label="Max Expansions" path="search.maxExpansions" type="number" />
        </div>
      </Section>

      <Section title="Driver">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Commission (%)" path="driver.commission" type="number" />
          <Input label="Min Rating" path="driver.minRating" type="number" step="0.1" />
          <Input label="Max Rides Before Break" path="driver.maxRidesBeforeBreak" type="number" />
        </div>
      </Section>

       <Section title="Features">
         <div className="flex flex-wrap gap-4">
           <Toggle label="Food Delivery" path="features.foodDelivery" />
           <Toggle label="Ride Scheduling" path="features.rideScheduling" />
           <Toggle label="Referral System" path="features.referralSystem" />
           <Toggle label="SOS Button" path="features.sosButton" />
         </div>
       </Section>

       <Section title="District Boundary">
         <div className="space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-xs text-gray-400">Polygon vertices (click a row to remove)</span>
             <button
               onClick={() => {
                 if (!form?.district?.boundary) return;
                 const last = form.district.boundary[form.district.boundary.length - 1];
                 update('district.boundary', [...form.district.boundary, { lat: last.lat + 0.01, lng: last.lng + 0.01 }]);
               }}
               className="text-xs bg-primary-500/20 text-primary-400 px-3 py-1 rounded-lg"
             >
               + Add Vertex
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
             <span>Min 4 vertices required</span>
             <span>•</span>
             <span>Vertices: {(form.district?.boundary || []).length}</span>
           </div>
         </div>
       </Section>

       <Section title="Maintenance">
        <Toggle label="Maintenance Mode" path="maintenance.isEnabled" />
        {form.maintenance?.isEnabled && <Input label="Maintenance Message" path="maintenance.message" />}
      </Section>

      <div className="flex justify-end">
        <button onClick={handleSave} className="bg-primary-500 px-8 py-3 rounded-xl text-sm font-semibold">Save All Settings</button>
      </div>
    </div>
  );
}

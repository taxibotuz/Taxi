import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

export default function AdminNotifications() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');

  const mutation = useMutation({
    mutationFn: (data: any) => adminApi.sendBroadcast(data),
    onSuccess: (res) => {
      toast.success(t('broadcast_sent', { count: res.data.count }));
      setTitle('');
      setBody('');
    },
    onError: () => toast.error(t('failed_broadcast')),
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.error(t('title_message_required'));
      return;
    }
    mutation.mutate({ title, body, target });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('notifications')}</h1>

      <div className="glass rounded-card p-4 sm:p-5 space-y-4">
        <h3 className="font-semibold text-sm">{t('send_broadcast')}</h3>

        <div>
          <label className="text-xs text-gray-400 block mb-2">{t('target')}</label>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { value: 'all', label: t('all_users') },
              { value: 'drivers', label: t('send_to_drivers') },
              { value: 'users', label: t('send_to_customers') },
            ].map(opt => (
              <button key={opt.value} onClick={() => setTarget(opt.value)}
                className={`px-4 py-2 rounded-btn text-sm font-medium transition-all ${
                  target === opt.value ? 'bg-primary-500 text-white shadow-btn' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1.5">{t('title')}</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder={t('title')}
            className="w-full bg-white/5 border border-white/10 rounded-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder-gray-500" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1.5">{t('message')}</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
            placeholder={t('message')}
            className="w-full bg-white/5 border border-white/10 rounded-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder-gray-500 resize-none" />
        </div>

        <button onClick={handleSend} disabled={mutation.isPending}
          className="w-full py-3 rounded-btn bg-primary-500 text-sm font-semibold shadow-btn disabled:opacity-50 hover:bg-primary-600 active:scale-[0.98] transition-all">
          {mutation.isPending ? t('sending') : target === 'all' ? t('send_to_all') : target === 'drivers' ? t('send_to_drivers') : t('send_to_customers')}
        </button>
      </div>

      <div className="glass rounded-card p-4">
        <h3 className="font-semibold text-sm mb-2">{t('info_title')}</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          {t('broadcast_info')}
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');

  const mutation = useMutation({
    mutationFn: (data: any) => adminApi.sendBroadcast(data),
    onSuccess: (res) => {
      toast.success(`Broadcast sent to ${res.data.count} users`);
      setTitle('');
      setBody('');
    },
    onError: () => toast.error('Failed to send broadcast'),
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    mutation.mutate({ title, body, target });
  };

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold">📢 Notifications</h1>

      <div className="glass rounded-2xl p-4 space-y-4">
        <h3 className="font-semibold text-sm">Send Broadcast</h3>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Target Audience</label>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All Users' },
              { value: 'drivers', label: 'Drivers' },
              { value: 'users', label: 'Customers' },
            ].map(t => (
              <button key={t.value} onClick={() => setTarget(t.value)}
                className={`px-4 py-2 rounded-lg text-sm ${target === t.value ? 'bg-primary-500 text-white' : 'bg-white/10'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Notification title..." className="w-full bg-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
            placeholder="Your message here..." className="w-full bg-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
        </div>

        <button onClick={handleSend} disabled={mutation.isPending}
          className="w-full py-3 rounded-xl bg-primary-500 text-sm font-semibold disabled:opacity-50">
          {mutation.isPending ? 'Sending...' : `Send to ${target === 'all' ? 'All Users' : target === 'drivers' ? 'Drivers' : 'Customers'}`}
        </button>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-2">ℹ️ Info</h3>
        <p className="text-xs text-gray-400">
          Broadcast notifications are delivered via in-app notifications and Telegram messages to all selected users.
          Each notification will appear in the user's notification list and be sent to their Telegram chat.
        </p>
      </div>
    </div>
  );
}

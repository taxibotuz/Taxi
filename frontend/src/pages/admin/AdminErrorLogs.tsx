import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminErrorLogs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [resolved, setResolved] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'error-logs', page, search, severity, resolved, typeFilter],
    queryFn: () => adminApi.getErrorLogs({
      page, limit: 30, search: search || undefined,
      severity: severity || undefined,
      resolved: resolved === '' ? undefined : resolved,
      type: typeFilter || undefined,
    }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => adminApi.resolveErrorLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-logs'] });
      toast.success('Error marked as resolved');
    },
    onError: () => toast.error('Failed to resolve error'),
  });

  const errors = data?.data?.errors || [];
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;

  const exportCSV = () => {
    const headers = 'Name,Message,Severity,Status,Endpoint,Count,Created\n';
    const rows = errors.map((e: any) =>
      `"${e.name}","${(e.message || '').replace(/"/g, '""')}",${e.severity},${e.resolved ? 'Resolved' : 'Open'},${e.endpoint || ''},${e.count},${new Date(e.createdAt).toISOString()}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'error-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const severityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🛡️ Error Logs</h1>
        <button onClick={exportCSV} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">Export CSV</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search errors..."
          className="flex-1 min-w-[120px] bg-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }}
          className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={resolved} onChange={e => { setResolved(e.target.value); setPage(1); }}
          className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All Status</option>
          <option value="false">Open</option>
          <option value="true">Resolved</option>
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All Types</option>
          <option value="express">Express</option>
          <option value="unhandled_rejection">Promise Rejection</option>
          <option value="uncaught_exception">Uncaught Exception</option>
          <option value="mongodb">MongoDB</option>
          <option value="redis">Redis</option>
          <option value="telegram_bot">Telegram Bot</option>
          <option value="socket_io">Socket.io</option>
          <option value="frontend">Frontend</option>
          <option value="axios">API Request</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : errors.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No errors recorded</div>
      ) : (
        <div className="space-y-2">
          {errors.map((e: any) => (
            <div key={e._id} className={`glass rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-all ${e.resolved ? 'opacity-60' : ''}`}
              onClick={() => setDetail(e)}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColors[e.severity] || 'bg-gray-500/20 text-gray-400'}`}>
                    {e.severity}
                  </span>
                  <span className="text-sm font-medium truncate">{e.name}</span>
                  {e.count > 1 && (
                    <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">x{e.count}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{e.type}</span>
                  {e.resolved ? (
                    <span className="text-xs text-green-400">✅</span>
                  ) : (
                    <button onClick={ev => { ev.stopPropagation(); resolveMutation.mutate(e._id); }}
                      className="text-xs text-primary-500 hover:underline">Resolve</button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 truncate">{e.message}</div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                <span>{e.method || '?'} {e.endpoint || 'N/A'}</span>
                {e.statusCode && <span className={`${e.statusCode >= 500 ? 'text-red-400' : 'text-yellow-400'}`}>{e.statusCode}</span>}
                <span>{new Date(e.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs ${p === page ? 'bg-primary-500 text-white' : 'bg-white/10'}`}>{p}</button>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetail(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Error Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="font-mono text-xs">{detail.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Severity</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[detail.severity] || ''}`}>{detail.severity}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-400">Type</span><span>{detail.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status Code</span><span>{detail.statusCode || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Count</span><span>x{detail.count}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Resolved</span><span>{detail.resolved ? '✅ Yes' : '❌ No'}</span></div>
              {detail.resolvedBy && <div className="flex justify-between"><span className="text-gray-400">Resolved By</span><span>{detail.resolvedBy}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">Endpoint</span><span className="font-mono text-xs">{detail.method || '?'} {detail.endpoint || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Created</span><span>{new Date(detail.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">First Seen</span><span>{new Date(detail.firstOccurrence).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Last Seen</span><span>{new Date(detail.lastOccurrence).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Fingerprint</span><span className="font-mono text-xs truncate max-w-[200px]">{detail.fingerprint}</span></div>

              <hr className="border-white/10" />
              <div><span className="text-gray-400">Message</span>
                <pre className="mt-1 bg-black/30 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">{detail.message}</pre>
              </div>

              {detail.stack && (
                <div><span className="text-gray-400">Stack Trace</span>
                  <pre className="mt-1 bg-black/30 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">{detail.stack}</pre>
                </div>
              )}

              {detail.requestBody && (
                <div><span className="text-gray-400">Request Body</span>
                  <pre className="mt-1 bg-black/30 rounded-lg p-3 text-xs overflow-x-auto">{detail.requestBody}</pre>
                </div>
              )}

              {detail.metadata && (
                <div><span className="text-gray-400">Metadata</span>
                  <pre className="mt-1 bg-black/30 rounded-lg p-3 text-xs overflow-x-auto">{detail.metadata}</pre>
                </div>
              )}

              {detail.gitCommit && <div className="flex justify-between"><span className="text-gray-400">Git Commit</span><span className="font-mono text-xs">{detail.gitCommit}</span></div>}
              {detail.railwayDeployment && <div className="flex justify-between"><span className="text-gray-400">Railway</span><span className="font-mono text-xs">{detail.railwayDeployment}</span></div>}
            </div>
            <div className="flex gap-3 mt-6">
              {!detail.resolved && (
                <button onClick={() => { resolveMutation.mutate(detail._id); setDetail(null); }}
                  className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 text-sm font-semibold">Mark Resolved</button>
              )}
              <button onClick={() => setDetail(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

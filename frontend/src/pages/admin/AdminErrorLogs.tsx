import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

export default function AdminErrorLogs() {
  const { t } = useTranslation();
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
      toast.success(t('error_marked_resolved'));
    },
    onError: () => toast.error(t('failed_resolve')),
  });

  const errors = data?.data?.errors || [];
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
    critical: 'bg-red-500/15 text-red-400',
    high: 'bg-orange-500/15 text-orange-400',
    medium: 'bg-yellow-500/15 text-yellow-400',
    low: 'bg-blue-500/15 text-blue-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t('error_logs')}</h1>
        <button onClick={exportCSV} className="px-4 py-2 bg-white/5 border border-white/10 text-sm rounded-btn hover:bg-white/10 transition-all">
          {t('export_csv')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('search_errors')}
          className="flex-1 min-w-[140px] bg-white/5 border border-white/10 rounded-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder-gray-500"
        />
        <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all">
          <option value="">{t('all_severity')}</option>
          <option value="critical">{t('severity_critical')}</option>
          <option value="high">{t('severity_high')}</option>
          <option value="medium">{t('severity_medium')}</option>
          <option value="low">{t('severity_low')}</option>
        </select>
        <select value={resolved} onChange={e => { setResolved(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all">
          <option value="">{t('all_status_filter')}</option>
          <option value="false">{t('status_open')}</option>
          <option value="true">{t('status_resolved')}</option>
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all">
          <option value="">{t('all_types')}</option>
          <option value="express">{t('type_express')}</option>
          <option value="unhandled_rejection">{t('type_rejection')}</option>
          <option value="uncaught_exception">{t('type_uncaught')}</option>
          <option value="mongodb">{t('type_mongodb')}</option>
          <option value="redis">{t('type_redis')}</option>
          <option value="telegram_bot">{t('type_telegram')}</option>
          <option value="socket_io">{t('type_socket')}</option>
          <option value="frontend">{t('type_frontend')}</option>
          <option value="axios">{t('type_api')}</option>
        </select>
      </div>

      {/* Error List */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-card skeleton" />)}</div>
      ) : errors.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🛡️</div>
          <p className="text-gray-500 text-sm">{t('no_errors')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {errors.map((e: any) => (
            <div key={e._id} className={`glass rounded-card p-3 sm:p-4 cursor-pointer hover:bg-white/[0.08] transition-all ${e.resolved ? 'opacity-60' : ''}`}
              onClick={() => setDetail(e)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium flex-shrink-0 ${severityColors[e.severity] || 'bg-gray-500/15 text-gray-400'}`}>
                    {e.severity}
                  </span>
                  <span className="text-sm font-medium truncate">{e.name}</span>
                  {e.count > 1 && (
                    <span className="text-[10px] bg-primary-500/15 text-primary-400 px-1.5 py-0.5 rounded-badge flex-shrink-0">x{e.count}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-500">{e.type}</span>
                  {e.resolved ? (
                    <span className="text-sm">✅</span>
                  ) : (
                    <button onClick={ev => { ev.stopPropagation(); resolveMutation.mutate(e._id); }}
                      className="px-2 py-1 text-[11px] font-medium bg-primary-500/15 text-primary-400 rounded-badge hover:bg-primary-500/25 active:scale-95 transition-all">
                      {t('resolve')}
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 truncate mt-1.5">{e.message}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-600">
                <span className="truncate">{e.method || '?'} {e.endpoint || 'N/A'}</span>
                {e.statusCode && <span className={`${e.statusCode >= 500 ? 'text-red-400' : 'text-yellow-400'} flex-shrink-0`}>{e.statusCode}</span>}
                <span className="flex-shrink-0">{new Date(e.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-1.5 flex-wrap">
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                p === page ? 'bg-primary-500 text-white shadow-btn' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}>{p}</button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-[#16213e] rounded-t-sheet sm:rounded-card w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold">{t('error_details')}</h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                { label: t('name'), value: detail.name, mono: true },
                { label: t('type_label'), value: detail.type },
                { label: t('status_code'), value: detail.statusCode || '-' },
                { label: t('count'), value: `x${detail.count}` },
                { label: t('resolved_label'), value: detail.resolved ? `✅ ${t('yes')}` : `❌ ${t('no')}` },
                ...(detail.resolvedBy ? [{ label: t('resolved_by'), value: detail.resolvedBy }] : []),
                { label: t('endpoint'), value: `${detail.method || '?'} ${detail.endpoint || 'N/A'}`, mono: true },
                { label: t('created'), value: new Date(detail.createdAt).toLocaleString() },
                { label: t('first_seen'), value: new Date(detail.firstOccurrence).toLocaleString() },
                { label: t('last_seen'), value: new Date(detail.lastOccurrence).toLocaleString() },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0 gap-3">
                  <span className="text-gray-400 flex-shrink-0">{item.label}</span>
                  <span className={`text-right ${item.mono ? 'font-mono text-[11px] break-all' : 'truncate max-w-[200px]'}`}>{item.value}</span>
                </div>
              ))}

              {detail.severity && (
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-gray-400">{t('status')}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium ${severityColors[detail.severity]}`}>{detail.severity}</span>
                </div>
              )}

              <hr className="border-white/5" />
              <div>
                <span className="text-gray-400 text-xs">{t('message_label')}</span>
                <pre className="mt-1.5 bg-black/30 rounded-input p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">{detail.message}</pre>
              </div>

              {detail.stack && (
                <div>
                  <span className="text-gray-400 text-xs">{t('stack_trace')}</span>
                  <pre className="mt-1.5 bg-black/30 rounded-input p-3 text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin break-all">{detail.stack}</pre>
                </div>
              )}

              {detail.requestBody && (
                <div>
                  <span className="text-gray-400 text-xs">{t('request_body')}</span>
                  <pre className="mt-1.5 bg-black/30 rounded-input p-3 text-xs overflow-x-auto break-all">{detail.requestBody}</pre>
                </div>
              )}

              {detail.metadata && (
                <div>
                  <span className="text-gray-400 text-xs">{t('metadata')}</span>
                  <pre className="mt-1.5 bg-black/30 rounded-input p-3 text-xs overflow-x-auto break-all">{detail.metadata}</pre>
                </div>
              )}

              {detail.gitCommit && (
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-gray-400">{t('git_commit')}</span>
                  <span className="font-mono text-[11px]">{detail.gitCommit}</span>
                </div>
              )}
              {detail.railwayDeployment && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-400">{t('railway_label')}</span>
                  <span className="font-mono text-[11px]">{detail.railwayDeployment}</span>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-white/5 flex gap-3">
              {!detail.resolved && (
                <button onClick={() => { resolveMutation.mutate(detail._id); setDetail(null); }}
                  className="flex-1 py-3 rounded-btn bg-green-500/15 text-green-400 text-sm font-semibold hover:bg-green-500/25 active:scale-[0.98] transition-all">
                  {t('mark_resolved')}
                </button>
              )}
              <button onClick={() => setDetail(null)} className="flex-1 py-3 rounded-btn bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 active:scale-[0.98] transition-all">
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

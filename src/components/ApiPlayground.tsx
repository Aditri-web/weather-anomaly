import React, { useState } from 'react';
import { Play, Copy, Check } from 'lucide-react';

interface EndpointConfig {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  defaultBody?: string;
  defaultParams?: Record<string, string>;
}

const ENDPOINTS: EndpointConfig[] = [
  {
    method: 'GET',
    path: '/health',
    description: 'System telemetry, active tracks, ensemble members, and model status',
  },
  {
    method: 'GET',
    path: '/v1/cycles',
    description: 'Available atmospheric ensemble cycle timestamps',
  },
  {
    method: 'GET',
    path: '/v1/anomalies',
    description: 'Active spherical anomaly tracks across the 3 to 10 day horizon',
  },
  {
    method: 'GET',
    path: '/v1/anomalies/TRK-001',
    description: 'Full trajectory coordinates, confidence, and 4D bounding box with margin',
  },
  {
    method: 'GET',
    path: '/v1/anomalies/TRK-001/downscaled?lead_time_hours=96',
    description: '5 km downscaled field statistics, power spectrum ratio, and 2D subgrid arrays',
  },
  {
    method: 'GET',
    path: '/v1/alerts?category=severe',
    description: 'Current hyper-local warnings filtered by severity tier',
  },
  {
    method: 'POST',
    path: '/v1/alerts/query',
    description: 'Geospatial radius search around coordinate with lead-time thresholds',
    defaultBody: JSON.stringify(
      {
        point: { lat: 16.3, lon: 86.1 },
        radius_km: 25.0,
        category: 'severe',
        min_lead_time_hours: 48,
        max_lead_time_hours: 144,
      },
      null,
      2
    ),
  },
  {
    method: 'POST',
    path: '/v1/pipeline/run',
    description: 'Simulate end-to-end 4-stage pipeline execution on latest ensemble cycle',
    defaultBody: JSON.stringify(
      {
        cycle: '2026-10-02T00Z',
      },
      null,
      2
    ),
  },
];

export const ApiPlayground: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'dark' }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointConfig>(ENDPOINTS[0]);
  const [requestPath, setRequestPath] = useState<string>(ENDPOINTS[0].path);
  const [requestBody, setRequestBody] = useState<string>(ENDPOINTS[0].defaultBody || '');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const isLight = theme === 'light';

  const handleSelectEndpoint = (ep: EndpointConfig) => {
    setSelectedEndpoint(ep);
    setRequestPath(ep.path);
    setRequestBody(ep.defaultBody || '');
    setResponseData(null);
    setResponseStatus(null);
  };

  const handleExecute = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (selectedEndpoint.method === 'POST' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(requestPath, options);
      const data = await res.json();
      const end = performance.now();

      setResponseStatus(res.status);
      setResponseData(data);
      setResponseTimeMs(Math.round(end - start));
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({ error: err.message || 'Network request failed' });
    } finally {
      setLoading(false);
    }
  };

  const curlCommand = `curl -X ${selectedEndpoint.method} "http://localhost:3000${requestPath}" ${
    selectedEndpoint.method === 'POST' ? `-H "Content-Type: application/json" -d '${requestBody.replace(/\n/g, '')}'` : ''
  }`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border shadow-xl transition-colors duration-300 ${
      isLight ? 'bg-white border-stone-200' : 'bg-[#111111] border-[#222222]'
    }`}>
      {/* Header */}
      <div className={`px-6 py-5 border-b flex flex-wrap items-center justify-between gap-4 ${
        isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141414] border-[#222222]'
      }`}>
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-medium mb-1">
            Programmatic Decision Support
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className={`font-serif italic text-2xl ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              REST Interface &amp; Developer Console
            </h3>
            <span className={`font-mono text-xs ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
              HTTP/1.1 &bull; Port 3000
            </span>
          </div>
        </div>

        <div className={`text-xs font-mono ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
          FastAPI &bull; Architecture Sec 9.1
        </div>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${
        isLight ? 'divide-stone-200' : 'divide-[#222222]'
      }`}>
        {/* Endpoint Selector List */}
        <div className={`lg:col-span-4 p-4 space-y-1.5 max-h-[580px] overflow-y-auto ${
          isLight ? 'bg-stone-50/50' : 'bg-[#141414]/40'
        }`}>
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium px-2 py-1">
            Catalog Endpoints
          </div>
          {ENDPOINTS.map((ep, idx) => {
            const isSelected = selectedEndpoint.path === ep.path;
            const isPost = ep.method === 'POST';

            return (
              <button
                key={idx}
                onClick={() => handleSelectEndpoint(ep)}
                className={`w-full text-left p-3 border transition-all ${
                  isSelected
                    ? isLight
                      ? 'bg-white border-stone-800 text-stone-900 shadow-sm font-medium'
                      : 'bg-[#1e1e1e] border-stone-500 text-white'
                    : isLight
                    ? 'bg-stone-50/80 border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-950'
                    : 'bg-[#151515] border-[#222222] text-stone-400 hover:border-stone-700 hover:text-stone-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-bold shrink-0 ${
                      isPost
                        ? isLight
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                        : isLight
                        ? 'bg-stone-200 text-stone-800 border border-stone-300'
                        : 'bg-stone-800 text-stone-200 border border-stone-700'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <div className="truncate">
                    <div className={`font-mono text-xs truncate ${isLight ? 'text-stone-900 font-semibold' : 'text-stone-200'}`}>
                      {ep.path}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 font-sans ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
                      {ep.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Execution & Response Terminal */}
        <div className="lg:col-span-8 p-6 flex flex-col space-y-5">
          {/* Request URL bar */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-2 text-xs font-mono font-bold uppercase ${
                selectedEndpoint.method === 'POST'
                  ? isLight ? 'bg-amber-600 text-white' : 'bg-amber-700 text-white'
                  : isLight ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-950'
              }`}
            >
              {selectedEndpoint.method}
            </span>
            <input
              type="text"
              value={requestPath}
              onChange={(e) => setRequestPath(e.target.value)}
              className={`flex-1 px-3.5 py-2 text-xs font-mono focus:outline-none ${
                isLight
                  ? 'bg-white border border-stone-300 text-stone-900 focus:border-stone-800'
                  : 'bg-[#161616] border border-stone-800 text-stone-200 focus:border-stone-500'
              }`}
            />
            <button
              onClick={handleExecute}
              disabled={loading}
              className={`px-5 py-2 font-medium text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                isLight
                  ? 'bg-stone-900 hover:bg-stone-700 text-white'
                  : 'bg-stone-100 hover:bg-stone-300 text-stone-950'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading ? 'Executing...' : 'Execute'}
            </button>
          </div>

          {/* Request Body (if POST) */}
          {selectedEndpoint.method === 'POST' && (
            <div>
              <div className={`text-[11px] uppercase tracking-wider font-medium mb-1.5 ${
                isLight ? 'text-stone-700' : 'text-stone-400'
              }`}>
                Request Payload:
              </div>
              <textarea
                rows={4}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className={`w-full p-3 text-xs font-mono focus:outline-none ${
                  isLight
                    ? 'bg-white border border-stone-300 text-stone-900 focus:border-stone-800'
                    : 'bg-[#161616] border border-stone-800 text-stone-300 focus:border-stone-500'
                }`}
              />
            </div>
          )}

          {/* cURL Command Generator */}
          <div className={`p-3 flex items-center justify-between text-[11px] font-mono border ${
            isLight ? 'bg-stone-100 border-stone-200 text-stone-700' : 'bg-[#161616] border-stone-800 text-stone-400'
          }`}>
            <div className="truncate mr-3">
              <span className={isLight ? "text-stone-400" : "text-stone-600"}>$ </span>
              {curlCommand}
            </div>
            <button
              onClick={copyCurl}
              className={`px-2.5 py-1 shrink-0 flex items-center gap-1.5 transition-colors ${
                isLight
                  ? 'bg-white hover:bg-stone-200 text-stone-800 border border-stone-300'
                  : 'bg-[#222222] hover:bg-[#333333] text-stone-300'
              }`}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy cURL'}
            </button>
          </div>

          {/* Response Console */}
          <div className={`flex-1 min-h-[240px] border p-4 flex flex-col font-mono text-xs ${
            isLight ? 'bg-[#0f172a] text-emerald-300 border-stone-300' : 'bg-[#0d0d0d] text-stone-300 border-stone-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-[11px] text-stone-400">
              <div className="flex items-center gap-3">
                <span className="uppercase tracking-wider">Payload Response</span>
                {responseStatus && (
                  <span
                    className={`font-bold ${
                      responseStatus === 200 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                )}
              </div>
              {responseTimeMs !== null && <span className="text-stone-400">Latency: {responseTimeMs} ms</span>}
            </div>

            <div className="flex-1 mt-3 overflow-y-auto max-h-[280px]">
              {responseData ? (
                <pre className="text-emerald-400 text-[11px] leading-relaxed select-text font-mono">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-stone-500 text-xs font-serif italic">
                  Press Execute above to dispatch request to the running server.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

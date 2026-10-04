import React, { useState } from 'react';
import { AlertItem, Coordinates } from '../types/weather';
import { ShieldAlert, Filter, Clock } from 'lucide-react';

interface AlertQueryPanelProps {
  alerts: AlertItem[];
  onFilterSubmit: (query: {
    category?: string;
    minLead?: number;
    maxLead?: number;
    point?: Coordinates;
    radiusKm?: number;
  }) => void;
  selectedAlertId: string | null;
  onSelectAlert: (alertId: string) => void;
  queryPoint: Coordinates | null;
  queryRadiusKm: number;
  setQueryRadiusKm: (r: number) => void;
  theme?: 'light' | 'dark';
}

export const AlertQueryPanel: React.FC<AlertQueryPanelProps> = ({
  alerts,
  onFilterSubmit,
  selectedAlertId,
  onSelectAlert,
  queryPoint,
  queryRadiusKm,
  setQueryRadiusKm,
  theme = 'dark',
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [minLeadTime, setMinLeadTime] = useState<number>(0);
  const [maxLeadTime, setMaxLeadTime] = useState<number>(168);
  const [customLat, setCustomLat] = useState<string>('16.3');
  const [customLon, setCustomLon] = useState<string>('86.1');
  const [enableGeoFilter, setEnableGeoFilter] = useState<boolean>(false);

  const isLight = theme === 'light';

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    let pt: Coordinates | undefined = undefined;
    if (enableGeoFilter && customLat && customLon) {
      pt = {
        lat: parseFloat(customLat),
        lon: parseFloat(customLon),
      };
    } else if (queryPoint) {
      pt = queryPoint;
    }

    onFilterSubmit({
      category: categoryFilter || undefined,
      minLead: minLeadTime || undefined,
      maxLead: maxLeadTime || undefined,
      point: pt,
      radiusKm: queryRadiusKm,
    });
  };

  const handleReset = () => {
    setCategoryFilter('');
    setMinLeadTime(0);
    setMaxLeadTime(168);
    setEnableGeoFilter(false);
    onFilterSubmit({});
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
            Early Warning Feeds &bull; 5 km Geodesic Radius
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className={`font-serif italic text-2xl ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              Categorized Anomaly Alerts
            </h3>
            <span className={`font-mono text-xs ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
              {alerts.length} Published Bulletins
            </span>
          </div>
        </div>

        <div className={`text-xs font-serif italic ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
          Decision support for trained forecasters &amp; emergency responders
        </div>
      </div>

      {/* Query Filter Bar */}
      <form onSubmit={handleApplyFilter} className={`p-6 border-b text-xs space-y-4 ${
        isLight ? 'bg-stone-50/50 border-stone-200' : 'bg-[#141414]/50 border-[#222222]'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Category Dropdown */}
          <div>
            <label className={`block text-[11px] uppercase tracking-wider font-medium mb-1.5 ${
              isLight ? 'text-stone-700' : 'text-stone-400'
            }`}>
              Severity Tier
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`w-full px-3 py-2 focus:outline-none ${
                isLight
                  ? 'bg-white border border-stone-300 text-stone-900 focus:border-stone-800'
                  : 'bg-[#181818] border border-stone-800 text-stone-200 focus:border-stone-500'
              }`}
            >
              <option value="">All Tiers</option>
              <option value="severe">Severe (≥ 120 mm/d or ≥ 50% prob)</option>
              <option value="moderate">Moderate (≥ 70 mm/d or EFI ≥ 0.70)</option>
              <option value="low">Low (≥ 35 mm/d or ≥ 30% prob)</option>
            </select>
          </div>

          {/* Lead Time Range */}
          <div>
            <label className={`block text-[11px] uppercase tracking-wider font-medium mb-1.5 ${
              isLight ? 'text-stone-700' : 'text-stone-400'
            }`}>
              Lead Time Window (hrs)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="240"
                step="24"
                value={minLeadTime}
                onChange={(e) => setMinLeadTime(Number(e.target.value))}
                className={`w-20 px-2.5 py-2 text-center font-mono ${
                  isLight
                    ? 'bg-white border border-stone-300 text-stone-900'
                    : 'bg-[#181818] border border-stone-800 text-stone-200'
                }`}
              />
              <span className="text-stone-400">&rarr;</span>
              <input
                type="number"
                min="0"
                max="240"
                step="24"
                value={maxLeadTime}
                onChange={(e) => setMaxLeadTime(Number(e.target.value))}
                className={`w-20 px-2.5 py-2 text-center font-mono ${
                  isLight
                    ? 'bg-white border border-stone-300 text-stone-900'
                    : 'bg-[#181818] border border-stone-800 text-stone-200'
                }`}
              />
              <span className="text-stone-400 text-[11px]">hrs</span>
            </div>
          </div>

          {/* Spatial Point & Radius Toggle */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-[11px] uppercase tracking-wider font-medium flex items-center gap-2 ${
                isLight ? 'text-stone-700' : 'text-stone-400'
              }`}>
                <input
                  type="checkbox"
                  checked={enableGeoFilter}
                  onChange={(e) => setEnableGeoFilter(e.target.checked)}
                  className={`rounded-none ${
                    isLight ? 'border-stone-300 text-stone-900' : 'border-stone-700 bg-stone-900 text-stone-200'
                  }`}
                />
                Filter by Geodesic Origin
              </label>
              <span className={`text-[11px] font-mono ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Radius: {queryRadiusKm} km
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Lat °N"
                disabled={!enableGeoFilter}
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className={`w-24 px-2.5 py-2 font-mono disabled:opacity-30 ${
                  isLight
                    ? 'bg-white border border-stone-300 text-stone-900'
                    : 'bg-[#181818] border border-stone-800 text-stone-200'
                }`}
              />
              <input
                type="text"
                placeholder="Lon °E"
                disabled={!enableGeoFilter}
                value={customLon}
                onChange={(e) => setCustomLon(e.target.value)}
                className={`w-24 px-2.5 py-2 font-mono disabled:opacity-30 ${
                  isLight
                    ? 'bg-white border border-stone-300 text-stone-900'
                    : 'bg-[#181818] border border-stone-800 text-stone-200'
                }`}
              />
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                disabled={!enableGeoFilter}
                value={queryRadiusKm}
                onChange={(e) => setQueryRadiusKm(Number(e.target.value))}
                className="flex-1 accent-stone-700 disabled:opacity-30"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
              isLight ? 'text-stone-500 hover:text-stone-900' : 'text-stone-400 hover:text-white'
            }`}
          >
            Reset
          </button>
          <button
            type="submit"
            className={`px-5 py-2 font-medium text-xs uppercase tracking-wider flex items-center gap-2 transition-colors ${
              isLight
                ? 'bg-stone-900 text-white hover:bg-stone-700'
                : 'bg-stone-100 text-stone-950 hover:bg-stone-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Apply Filters
          </button>
        </div>
      </form>

      {/* Alert Feed Cards */}
      <div className={`divide-y max-h-[500px] overflow-y-auto ${
        isLight ? 'divide-stone-200' : 'divide-[#222222]'
      }`}>
        {alerts.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-xs font-serif italic">
            No active alerts matched the query criteria. Expand the lead time window or radius.
          </div>
        ) : (
          alerts.map((alert) => {
            const isSelected = alert.alert_id === selectedAlertId;
            const isSevere = alert.category === 'severe';
            const isModerate = alert.category === 'moderate';

            const severityColor = isSevere
              ? 'text-rose-600 font-bold'
              : isModerate
              ? 'text-amber-600 font-bold'
              : isLight ? 'text-stone-700 font-semibold' : 'text-stone-300 font-semibold';

            return (
              <div
                key={alert.alert_id}
                onClick={() => onSelectAlert(alert.alert_id)}
                className={`p-6 transition-colors cursor-pointer ${
                  isSelected
                    ? isLight ? 'bg-stone-100/80 ring-1 ring-stone-400' : 'bg-[#181818]'
                    : isLight ? 'hover:bg-stone-50' : 'hover:bg-[#151515]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs uppercase tracking-wider font-mono ${severityColor}`}>
                      {alert.category} Warning
                    </span>
                    <span className="text-stone-400 font-mono">&bull;</span>
                    <span className={`font-mono text-xs font-semibold ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                      {alert.alert_id}
                    </span>
                    <span className="text-stone-400 font-mono">&bull;</span>
                    <span className={`text-xs capitalize ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className={`flex items-center gap-1.5 text-xs font-mono ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    +{alert.lead_time_hours}h Forecast Horizon
                  </div>
                </div>

                {/* Details Row */}
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 py-3 px-4 border my-3 text-xs ${
                  isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141414] border-[#222222]'
                }`}>
                  <div>
                    <span className="text-stone-500 block text-[11px] uppercase tracking-wider">Impact Core</span>
                    <span className={`font-mono ${isLight ? 'text-stone-900 font-medium' : 'text-stone-200'}`}>
                      {alert.core.lat}°N, {alert.core.lon}°E
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[11px] uppercase tracking-wider">Peak Impact</span>
                    <span className={`font-mono font-bold ${isLight ? 'text-stone-950 text-sm' : 'text-stone-100'}`}>
                      {alert.peak_value} {alert.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[11px] uppercase tracking-wider">Exceedance Probability</span>
                    <span className={`font-mono font-bold ${isLight ? 'text-stone-950 text-sm' : 'text-stone-100'}`}>
                      {(alert.exceedance_prob * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[11px] uppercase tracking-wider">Impact Envelope</span>
                    <span className={`font-mono ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                      {alert.radius_km} km Geodesic Ring
                    </span>
                  </div>
                </div>

                <div className={`flex flex-wrap items-center justify-between text-[11px] gap-2 ${
                  isLight ? 'text-stone-500' : 'text-stone-500'
                }`}>
                  <div>
                    <span>Valid: </span>
                    <span className={`font-mono ${isLight ? 'text-stone-700' : 'text-stone-400'}`}>{alert.valid_from} &rarr; {alert.valid_to}</span>
                  </div>
                  <span className="font-serif italic text-xs">
                    {alert.disclaimer}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

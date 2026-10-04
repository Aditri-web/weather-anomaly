import React, { useState, useEffect } from 'react';
import {
  AnomalySummary,
  AlertItem,
  DownscaledResponse,
  HealthStatus,
  Coordinates,
} from './types/weather';
import { GeoMap } from './components/GeoMap';
import { DownscalingInspector } from './components/DownscalingInspector';
import { AlertQueryPanel } from './components/AlertQueryPanel';
import { ApiPlayground } from './components/ApiPlayground';
import { PipelineRunnerModal } from './components/PipelineRunnerModal';
import { AtmosphericStreamlines } from './components/AtmosphericStreamlines';
import { AnomalySparkline } from './components/AnomalySparkline';
import { generateAnomalyPdfReport } from './utils/generateAnomalyPdf';
import { LandingPage } from './components/LandingPage';
import {
  Flame,
  Wind,
  Sun,
  Moon,
  FileDown,
  Check,
  ChevronLeft,
  LayoutDashboard,
  ArrowRight,
  Home,
  LogOut,
} from 'lucide-react';

export const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'app'>('landing');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crosby_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light'; // Classic light mode default
  });

  const [activeTab, setActiveTab] = useState<'map' | 'downscaler' | 'alerts' | 'api' | 'architecture'>('map');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [cycles, setCycles] = useState<string[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>('2026-10-02T00Z');
  const [anomalies, setAnomalies] = useState<AnomalySummary[]>([]);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string>('TRK-001');
  const [selectedLeadTime, setSelectedLeadTime] = useState<number>(96);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [downscaledData, setDownscaledData] = useState<DownscaledResponse | null>(null);
  const [downscalerLoading, setDownscalerLoading] = useState<boolean>(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState<boolean>(false);

  // Map & Query States
  const [queryPoint, setQueryPoint] = useState<Coordinates | null>(null);
  const [queryRadiusKm, setQueryRadiusKm] = useState<number>(25);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);

  const isLight = theme === 'light';

  // Synchronize theme to localStorage and body background
  useEffect(() => {
    localStorage.setItem('crosby_theme', theme);
    if (isLight) {
      document.body.style.backgroundColor = '#fbfbf9';
      document.body.style.color = '#1c1917';
    } else {
      document.body.style.backgroundColor = '#0c0c0c';
      document.body.style.color = '#f5f5f4';
    }
  }, [theme, isLight]);

  // Initial Fetch
  const loadInitialData = async () => {
    try {
      const [hRes, cRes, aRes, alRes] = await Promise.all([
        fetch('/health').then(r => r.json()),
        fetch('/v1/cycles').then(r => r.json()),
        fetch('/v1/anomalies').then(r => r.json()),
        fetch('/v1/alerts').then(r => r.json()),
      ]);

      setHealth(hRes);
      setCycles(cRes);
      if (cRes.length > 0) setSelectedCycle(cRes[cRes.length - 1]);
      setAnomalies(aRes);
      setAlerts(alRes);
      if (aRes.length > 0) {
        setSelectedAnomalyId(aRes[0].track_id);
      }
    } catch (err) {
      console.error('Error fetching initial weather data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch Downscaled Field on anomaly or lead time change
  useEffect(() => {
    if (!selectedAnomalyId) return;
    setDownscalerLoading(true);
    fetch(`/v1/anomalies/${selectedAnomalyId}/downscaled?lead_time_hours=${selectedLeadTime}`)
      .then(r => r.json())
      .then(data => {
        setDownscaledData(data);
        setDownscalerLoading(false);
      })
      .catch(err => {
        console.error('Failed to load downscaled fields:', err);
        setDownscalerLoading(false);
      });
  }, [selectedAnomalyId, selectedLeadTime]);

  const handleFilterSubmit = async (query: {
    category?: string;
    minLead?: number;
    maxLead?: number;
    point?: Coordinates;
    radiusKm?: number;
  }) => {
    try {
      const res = await fetch('/v1/alerts/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          point: query.point,
          radius_km: query.radiusKm,
          category: query.category,
          min_lead_time_hours: query.minLead,
          max_lead_time_hours: query.maxLead,
        }),
      });
      const data = await res.json();
      setAlerts(data);
    } catch (e) {
      console.error('Error querying alerts:', e);
    }
  };

  const selectedAnomaly = anomalies.find(a => a.track_id === selectedAnomalyId) || anomalies[0];

  const handleExportPdf = () => {
    if (!selectedAnomaly) return;
    setIsExportingPdf(true);
    try {
      generateAnomalyPdfReport({
        anomaly: selectedAnomaly,
        selectedLeadTime,
        cycle: selectedCycle,
        alerts,
        downscaledData,
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleLaunchApp = (tab?: 'map' | 'downscaler' | 'alerts' | 'api' | 'architecture') => {
    if (tab) setActiveTab(tab);
    setView('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* =========================================================================
     PAGE 1: SEPARATE FRONT INTRODUCTION / GET STARTED PAGE
     ========================================================================= */
  if (view === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => handleLaunchApp('map')}
        onExploreModule={(tab) => handleLaunchApp(tab)}
        anomalies={anomalies}
        alerts={alerts}
        theme={theme}
        onToggleTheme={() => setTheme(isLight ? 'dark' : 'light')}
      />
    );
  }

  /* =========================================================================
     PAGE 2: THE WHOLE OPERATIONAL WEBSITE (APPEARS AFTER "GET STARTED")
     ========================================================================= */
  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 relative bg-grain ${
      isLight ? 'bg-[#fbfbf9] text-stone-900 selection:bg-stone-200 selection:text-stone-900' : 'bg-[#0c0c0c] text-stone-200 selection:bg-stone-800 selection:text-white'
    }`}>
      {/* Full Operational Top Bar Navigation */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
        isLight ? 'bg-white/95 border-stone-200 text-stone-900' : 'bg-[#0e0e0e]/95 border-[#222222] text-stone-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-4">
            <a
              href="#intro"
              onClick={(e) => {
                e.preventDefault();
                setView('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="Return to Introduction Page"
              className={`font-serif italic text-2xl tracking-wide transition-colors flex items-center gap-2 group ${
                isLight ? 'text-stone-900 hover:text-stone-700' : 'text-stone-100 hover:text-white'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full transition-transform duration-200 group-hover:scale-125 ${
                isLight ? 'bg-stone-800' : 'bg-stone-300'
              }`} />
              Crosby Atmosphere
            </a>
          </div>

          {/* Module Navigation Tabs */}
          <nav className={`hidden lg:flex items-center gap-7 text-[12px] uppercase tracking-[0.14em] font-medium ${
            isLight ? 'text-stone-600' : 'text-stone-400'
          }`}>
            <button
              onClick={() => setActiveTab('map')}
              className={`transition-colors pb-1 relative ${
                activeTab === 'map'
                  ? isLight ? 'text-stone-950 font-bold' : 'text-stone-100 font-semibold'
                  : isLight ? 'hover:text-stone-900' : 'hover:text-stone-200'
              }`}
            >
              Spatial Tracking
              {activeTab === 'map' && (
                <span className={`absolute bottom-0 left-0 right-0 h-[1.5px] transition-all duration-300 ${
                  isLight ? 'bg-stone-900' : 'bg-stone-100'
                }`} />
              )}
            </button>

            <button
              onClick={() => setActiveTab('downscaler')}
              className={`transition-colors pb-1 relative ${
                activeTab === 'downscaler'
                  ? isLight ? 'text-stone-950 font-bold' : 'text-stone-100 font-semibold'
                  : isLight ? 'hover:text-stone-900' : 'hover:text-stone-200'
              }`}
            >
              5 km Downscaler
              {activeTab === 'downscaler' && (
                <span className={`absolute bottom-0 left-0 right-0 h-[1.5px] transition-all duration-300 ${
                  isLight ? 'bg-stone-900' : 'bg-stone-100'
                }`} />
              )}
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`transition-colors pb-1 relative ${
                activeTab === 'alerts'
                  ? isLight ? 'text-stone-950 font-bold' : 'text-stone-100 font-semibold'
                  : isLight ? 'hover:text-stone-900' : 'hover:text-stone-200'
              }`}
            >
              Early Warnings ({alerts.length})
              {activeTab === 'alerts' && (
                <span className={`absolute bottom-0 left-0 right-0 h-[1.5px] transition-all duration-300 ${
                  isLight ? 'bg-stone-900' : 'bg-stone-100'
                }`} />
              )}
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`transition-colors pb-1 relative ${
                activeTab === 'api'
                  ? isLight ? 'text-stone-950 font-bold' : 'text-stone-100 font-semibold'
                  : isLight ? 'hover:text-stone-900' : 'hover:text-stone-200'
              }`}
            >
              API Console
              {activeTab === 'api' && (
                <span className={`absolute bottom-0 left-0 right-0 h-[1.5px] transition-all duration-300 ${
                  isLight ? 'bg-stone-900' : 'bg-stone-100'
                }`} />
              )}
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`transition-colors pb-1 relative ${
                activeTab === 'architecture'
                  ? isLight ? 'text-stone-950 font-bold' : 'text-stone-100 font-semibold'
                  : isLight ? 'hover:text-stone-900' : 'hover:text-stone-200'
              }`}
            >
              Architecture
              {activeTab === 'architecture' && (
                <span className={`absolute bottom-0 left-0 right-0 h-[1.5px] transition-all duration-300 ${
                  isLight ? 'bg-stone-900' : 'bg-stone-100'
                }`} />
              )}
            </button>
          </nav>

          {/* Operational Right-side Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
              className={`px-3 py-1.5 border text-xs flex items-center gap-1.5 transition-all duration-200 ${
                isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                  : 'bg-[#181818] hover:bg-[#252525] text-stone-300 border-stone-800'
              }`}
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-stone-700" />
                  <span className="font-medium text-[11px] uppercase tracking-wider hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium text-[11px] uppercase tracking-wider hidden sm:inline">Light</span>
                </>
              )}
            </button>

            {/* Cycle Selector */}
            <div className={`hidden sm:flex items-center gap-2 text-xs border px-3 py-1.5 transition-colors ${
              isLight ? 'bg-stone-100/80 border-stone-300 text-stone-800' : 'bg-[#141414] border-stone-800 text-stone-200'
            }`}>
              <span className={`font-mono text-[11px] ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>Cycle:</span>
              <select
                value={selectedCycle}
                onChange={e => setSelectedCycle(e.target.value)}
                className="bg-transparent font-mono focus:outline-none cursor-pointer"
              >
                {cycles.map(c => (
                  <option key={c} value={c} className={isLight ? 'bg-white text-stone-900' : 'bg-[#141414] text-stone-200'}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary PDF Button */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              title={`Download PDF Summary Report for ${selectedAnomaly?.track_id}`}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium uppercase tracking-[0.1em] transition-all duration-150 ${
                isLight
                  ? 'border-stone-300 hover:border-stone-800 text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200'
                  : 'border-stone-800 hover:border-stone-400 text-stone-300 hover:text-white bg-[#181818] hover:bg-[#252525]'
              }`}
            >
              {pdfSuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileDown className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{pdfSuccess ? 'Downloaded' : 'PDF Report'}</span>
            </button>

            {/* Run Pipeline Button */}
            <button
              onClick={() => setIsPipelineModalOpen(true)}
              className={`px-5 py-2 font-medium text-xs uppercase tracking-[0.12em] active:scale-95 transition-all duration-150 shadow-md ${
                isLight
                  ? 'bg-stone-900 text-white hover:bg-stone-700'
                  : 'bg-stone-100 text-stone-950 hover:bg-stone-300'
              }`}
            >
              Run Pipeline
            </button>

            {/* Right-most Exit Button: only exit sign */}
            <button
              onClick={() => {
                setView('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="Exit to Introduction"
              className={`p-2 border text-xs flex items-center justify-center transition-all duration-150 active:scale-95 ${
                isLight
                  ? 'border-stone-300 hover:border-stone-900 text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200'
                  : 'border-stone-800 hover:border-stone-400 text-stone-300 hover:text-white bg-[#181818] hover:bg-[#252525]'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className={`lg:hidden flex items-center justify-between px-6 py-2 border-t text-[11px] uppercase tracking-wider overflow-x-auto ${
          isLight ? 'border-stone-200 text-stone-600 bg-stone-50' : 'border-[#222222] text-stone-400 bg-[#121212]'
        }`}>
          <button
            onClick={() => setActiveTab('map')}
            className={`whitespace-nowrap px-2.5 py-1 ${activeTab === 'map' ? (isLight ? 'text-stone-950 font-bold' : 'text-white font-bold') : ''}`}
          >
            Tracking
          </button>
          <button
            onClick={() => setActiveTab('downscaler')}
            className={`whitespace-nowrap px-2.5 py-1 ${activeTab === 'downscaler' ? (isLight ? 'text-stone-950 font-bold' : 'text-white font-bold') : ''}`}
          >
            Downscaler
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`whitespace-nowrap px-2.5 py-1 ${activeTab === 'alerts' ? (isLight ? 'text-stone-950 font-bold' : 'text-white font-bold') : ''}`}
          >
            Warnings
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`whitespace-nowrap px-2.5 py-1 ${activeTab === 'api' ? (isLight ? 'text-stone-950 font-bold' : 'text-white font-bold') : ''}`}
          >
            API
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`whitespace-nowrap px-2.5 py-1 ${activeTab === 'architecture' ? (isLight ? 'text-stone-950 font-bold' : 'text-white font-bold') : ''}`}
          >
            Architecture
          </button>
          <button
            onClick={() => {
              setView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="Exit to Introduction"
            className="whitespace-nowrap px-2 py-1 text-stone-500 hover:text-stone-950 dark:hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Contextual Status Strip */}
      <div className={`border-b py-2.5 px-6 sm:px-8 text-xs flex flex-wrap items-center justify-between gap-3 transition-colors ${
        isLight ? 'bg-stone-100/70 border-stone-200 text-stone-700' : 'bg-[#141414] border-[#222222] text-stone-300'
      }`}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-stone-500">
            Active Target: <strong className={isLight ? 'text-stone-900' : 'text-stone-100'}>{selectedAnomaly?.track_id}</strong> &bull; Cycle: <strong className={isLight ? 'text-stone-900' : 'text-stone-100'}>{selectedCycle}</strong>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Forecast Telemetry Active
          </span>
          <span>&bull;</span>
          <span>Lead Time: +{selectedLeadTime}h</span>
        </div>
      </div>

      {/* Main Operational Console Content */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-10 space-y-10 relative z-10">
        {/* TAB 1: GEOSPATIAL MAP & ANOMALY TRACK EXPLORER */}
        {activeTab === 'map' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Map Canvas (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <GeoMap
                  anomalies={anomalies}
                  alerts={alerts}
                  selectedAnomalyId={selectedAnomalyId}
                  onSelectAnomaly={id => setSelectedAnomalyId(id)}
                  selectedLeadTime={selectedLeadTime}
                  onSelectLeadTime={h => setSelectedLeadTime(h)}
                  onMapClick={coords => setQueryPoint(coords)}
                  queryPoint={queryPoint}
                  queryRadiusKm={queryRadiusKm}
                  theme={theme}
                />
              </div>

              {/* Anomaly Track Inspector Sidebar (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                <div className={`border p-6 shadow-xl transition-colors duration-300 ${
                  isLight ? 'bg-white border-stone-200' : 'bg-[#111111] border-[#222222]'
                }`}>
                  <div className={`flex items-center justify-between pb-4 border-b ${
                    isLight ? 'border-stone-200' : 'border-[#222222]'
                  }`}>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-medium">
                        Active Anomalies
                      </div>
                      <div className={`font-serif italic text-xl mt-0.5 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                        {anomalies.length} Isolated Tracks
                      </div>
                    </div>
                    <span className={`font-mono text-xs flex items-center gap-1.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      GNN Mesh
                    </span>
                  </div>

                  {/* List of Anomalies */}
                  <div className="mt-4 space-y-3">
                    {anomalies.map(anom => {
                      const isSel = anom.track_id === selectedAnomalyId;
                      const isHeat = anom.hazard_type.includes('heat');

                      return (
                        <div
                          key={anom.track_id}
                          onClick={() => setSelectedAnomalyId(anom.track_id)}
                          className={`p-4 border cursor-pointer transition-all duration-200 ${
                            isSel
                              ? isLight
                                ? 'bg-stone-100 border-stone-900 text-stone-950 shadow-sm translate-x-1 font-medium'
                                : 'bg-[#181818] border-stone-400 text-stone-100 shadow-md translate-x-1'
                              : isLight
                              ? 'bg-stone-50/70 border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-950'
                              : 'bg-[#141414] border-[#222222] text-stone-400 hover:border-stone-700 hover:text-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {isHeat ? (
                                <Flame className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Wind className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-stone-300'}`} />
                              )}
                              <span className={`font-mono text-xs font-bold ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
                                {anom.track_id}
                              </span>
                            </div>
                            <span className={`text-[11px] font-mono ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                              EFI: {anom.efi_score}
                            </span>
                          </div>

                          <div className={`font-serif italic text-base ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                            {anom.name}
                          </div>

                          {/* Mini Sparkline 5-Day Trend */}
                          <div className="my-2.5">
                            <AnomalySparkline
                              trajectory={anom.trajectory}
                              selectedLeadTime={selectedLeadTime}
                              onSelectLeadTime={setSelectedLeadTime}
                              hazardType={anom.hazard_type}
                              theme={theme}
                              compact={true}
                            />
                          </div>

                          <div className={`flex items-center justify-between text-xs mt-3 pt-3 border-t ${
                            isLight ? 'border-stone-200 text-stone-500' : 'border-[#222222] text-stone-400'
                          }`}>
                            <span>+{anom.start_lead_hours}h &rarr; +{anom.end_lead_hours}h</span>
                            <span className={`font-mono font-medium ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                              {(anom.max_confidence * 100).toFixed(0)}% Conf
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trajectory Waypoints for Selected Anomaly */}
                {selectedAnomaly && (
                  <div className={`border p-6 shadow-xl text-xs space-y-4 transition-colors duration-300 ${
                    isLight ? 'bg-white border-stone-200' : 'bg-[#111111] border-[#222222]'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                      <div>
                        <span className={`font-serif italic text-base block ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                          {selectedAnomaly.track_id} Trajectory Coordinates
                        </span>
                        <span className="font-mono text-[10px] text-stone-500">
                          {selectedAnomaly.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportPdf}
                          disabled={isExportingPdf}
                          title={`Generate PDF Summary Report for ${selectedAnomaly.track_id}`}
                          className={`px-3 py-1.5 border text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5 transition-all duration-150 shadow-sm ${
                            isLight
                              ? 'bg-stone-900 hover:bg-stone-700 text-white border-stone-900'
                              : 'bg-stone-100 hover:bg-stone-300 text-stone-950 border-stone-100'
                          }`}
                        >
                          {pdfSuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileDown className="w-3.5 h-3.5" />}
                          <span>{isExportingPdf ? 'Exporting...' : pdfSuccess ? 'Saved' : 'Export PDF'}</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('downscaler')}
                          className={`uppercase tracking-wider text-[10px] font-medium transition-colors ${
                            isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-white'
                          }`}
                        >
                          Specs &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Interactive 5-Day Intensity Sparkline */}
                    <AnomalySparkline
                      trajectory={selectedAnomaly.trajectory}
                      selectedLeadTime={selectedLeadTime}
                      onSelectLeadTime={setSelectedLeadTime}
                      hazardType={selectedAnomaly.hazard_type}
                      theme={theme}
                      compact={false}
                    />

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedAnomaly.trajectory.map(t => {
                        const isCurrent = t.lead_time_hours === selectedLeadTime;

                        return (
                          <div
                            key={t.lead_time_hours}
                            onClick={() => setSelectedLeadTime(t.lead_time_hours)}
                            className={`p-2.5 border cursor-pointer flex items-center justify-between transition-all duration-150 ${
                              isCurrent
                                ? isLight
                                  ? 'bg-stone-900 text-white font-bold border-stone-900 shadow-sm'
                                  : 'bg-stone-200 text-stone-950 font-bold border-stone-200 shadow-sm'
                                : isLight
                                ? 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-400'
                                : 'bg-[#151515] border-[#222222] text-stone-400 hover:border-stone-700 hover:text-stone-200'
                            }`}
                          >
                            <span className="font-mono text-xs">
                              +{t.lead_time_hours}h
                            </span>
                            <span className="font-mono text-[11px]">
                              {t.lat}°N, {t.lon}°E
                            </span>
                            <span className="font-mono text-xs">
                              {t.hazard_metric || `${(t.peak_prob * 100).toFixed(0)}%`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className={`text-[11px] pt-2 border-t ${
                      isLight ? 'border-stone-200 text-stone-500' : 'border-[#222222] text-stone-500'
                    }`}>
                      Climatology Baseline: {selectedAnomaly.climatology_baseline}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Downscaling Preview below Map */}
            <DownscalingInspector data={downscaledData} loading={downscalerLoading} theme={theme} />
          </div>
        )}

        {/* TAB 2: DOWNSCALING & AMPLITUDE PRESERVATION */}
        {activeTab === 'downscaler' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <DownscalingInspector data={downscaledData} loading={downscalerLoading} theme={theme} />

            {/* Editorial Article: The Spectral Smoothing Flaw */}
            <div className={`border p-8 sm:p-10 shadow-xl transition-colors duration-300 ${
              isLight ? 'bg-white border-stone-200' : 'bg-[#111111] border-[#222222]'
            }`}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-medium mb-1">
                Generative Formulation &bull; CorrDiff Architecture
              </div>
              <h3 className={`font-serif italic text-3xl mb-6 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                Why Plain Regression Fails &amp; Why Residual Diffusion Preserves Peaks
              </h3>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 text-xs leading-relaxed font-light ${
                isLight ? 'text-stone-700' : 'text-stone-300'
              }`}>
                <div className="space-y-4">
                  <div className={`font-serif italic text-lg ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>
                    The Spectral Smoothing Flaw (MSE / L2 Loss)
                  </div>
                  <p>
                    Standard deep learning models (such as plain CNNs and U-Nets) optimize Mean Squared Error. In atmospheric weather fields, the exact convective cell position carries irreducible chaotical uncertainty.
                  </p>
                  <p>
                    When optimizing an L2 objective under uncertainty, the network outputs the <em>conditional mean</em>—averaging together plausible storm tracks. This mathematically smooths sharp peaks, turning a catastrophic 190 mm/day cyclone downburst into an innocuous 110 mm/day rainfall swath. For emergency responders and civil defence authorities, this false smoothing masks life-threatening extremes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className={`font-serif italic text-lg ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                    Conditional Residual Diffusion (CorrDiff Method)
                  </div>
                  <p>
                    Instead of a single deterministic mapping, the downscaler divides generation into two complementary branches:
                  </p>
                  <ul className={`list-disc pl-5 space-y-2 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                    <li><strong className={isLight ? 'text-stone-900 font-medium' : 'text-stone-200'}>Deterministic Mean Predictor:</strong> Resolves synoptic thermodynamics and large-scale orographic moisture advection.</li>
                    <li><strong className={isLight ? 'text-stone-900 font-medium' : 'text-stone-200'}>Conditional Residual Diffusion Model:</strong> Learns the stochastic distribution of high-frequency sub-grid fluctuations, sampling realistic convective peaks with exact high-wavenumber energy retention.</li>
                  </ul>
                  <p>
                    By sampling across a 25-step DDIM schedule, the model respects physical conservation invariants while producing actionable tail estimates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ALERT ENGINE & RADIUS QUERY */}
        {activeTab === 'alerts' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <AlertQueryPanel
              alerts={alerts}
              onFilterSubmit={handleFilterSubmit}
              selectedAlertId={selectedAlertId}
              onSelectAlert={id => setSelectedAlertId(id)}
              queryPoint={queryPoint}
              queryRadiusKm={queryRadiusKm}
              setQueryRadiusKm={r => setQueryRadiusKm(r)}
              theme={theme}
            />
          </div>
        )}

        {/* TAB 4: REST API PLAYGROUND */}
        {activeTab === 'api' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <ApiPlayground theme={theme} />
          </div>
        )}

        {/* TAB 5: ARCHITECTURE & PRD DOCUMENTATION */}
        {activeTab === 'architecture' && (
          <div className={`border p-8 sm:p-12 shadow-xl space-y-10 text-xs transition-colors duration-300 ${
            isLight ? 'bg-white border-stone-200 text-stone-700' : 'bg-[#111111] border-[#222222] text-stone-300'
          }`}>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-medium mb-1">
                Technical Specification
              </div>
              <h2 className={`font-serif italic text-3xl sm:text-4xl ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
                System Architecture &amp; Product Requirements
              </h2>
              <p className={`mt-2 max-w-2xl font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Extreme Weather Anomaly Tracking and Amplitude-Preserving Downscaling (Operational Blueprint)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`p-6 border transition-all duration-200 hover:-translate-y-0.5 ${
                isLight ? 'bg-stone-50 border-stone-200 hover:border-stone-400' : 'bg-[#151515] border-[#222222] hover:border-stone-700'
              }`}>
                <div className={`font-serif italic text-lg mb-2 ${isLight ? 'text-stone-900 font-medium' : 'text-stone-100'}`}>
                  Stage 0: Preprocessing &amp; EFI
                </div>
                <p className={`leading-relaxed font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Ingests 12 km NEPS-G 4D ensemble runs. Projects against a 30-year climatological baseline (ERA5/IMDAA) to evaluate the Extreme Forecast Index (EFI) via numerical integral over the cumulative distribution function tails.
                </p>
              </div>

              <div className={`p-6 border transition-all duration-200 hover:-translate-y-0.5 ${
                isLight ? 'bg-stone-50 border-stone-200 hover:border-stone-400' : 'bg-[#151515] border-[#222222] hover:border-stone-700'
              }`}>
                <div className={`font-serif italic text-lg mb-2 ${isLight ? 'text-stone-900 font-medium' : 'text-stone-100'}`}>
                  Stage 1: Spherical GNN Tracker
                </div>
                <p className={`leading-relaxed font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Transfers 12 km grid nodes to an icosahedral spherical mesh, avoiding polar and planar coordinate distortions. Bipartite message passing groups anomalies into 4D bounding boxes with dynamic margins.
                </p>
              </div>

              <div className={`p-6 border transition-all duration-200 hover:-translate-y-0.5 ${
                isLight ? 'bg-stone-50 border-stone-200 hover:border-stone-400' : 'bg-[#151515] border-[#222222] hover:border-stone-700'
              }`}>
                <div className={`font-serif italic text-lg mb-2 ${isLight ? 'text-stone-900 font-medium' : 'text-stone-100'}`}>
                  Stage 2: CorrDiff Diffusion
                </div>
                <p className={`leading-relaxed font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Downscales isolated tracks to 5 km (2.4× non-integer ratio) using conditional denoising diffusion. Aggregation consistency and moisture convergence losses preserve mass and energy balance.
                </p>
              </div>
            </div>

            <div className={`p-6 border space-y-4 ${
              isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#151515] border-[#222222]'
            }`}>
              <div className={`font-serif italic text-xl ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                Alert Engine Threshold Matrix (Formal IMD / NDRF Spec)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className={`border-b uppercase tracking-wider ${
                      isLight ? 'border-stone-300 text-stone-500' : 'border-[#2a2a2a] text-stone-500'
                    }`}>
                      <th className="py-2.5">Category</th>
                      <th>Rainfall Threshold</th>
                      <th>Exceedance Prob</th>
                      <th>EFI Criteria</th>
                      <th>Geodesic Buffer</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-[#222222]'}`}>
                    <tr>
                      <td className="py-3 text-rose-600 font-bold uppercase">Severe</td>
                      <td>≥ 120.0 mm/day</td>
                      <td>≥ 50%</td>
                      <td>Or peak ≥ 120 mm/d</td>
                      <td>5.0 km radius (32-pt circle)</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-amber-600 font-bold uppercase">Moderate</td>
                      <td>≥ 70.0 mm/day</td>
                      <td>≥ 40%</td>
                      <td>EFI ≥ 0.70</td>
                      <td>5.0 km radius</td>
                    </tr>
                    <tr>
                      <td className={`py-3 font-bold uppercase ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>Low</td>
                      <td>≥ 35.0 mm/day</td>
                      <td>≥ 30%</td>
                      <td>Peak ≥ 35 mm/d</td>
                      <td>5.0 km radius</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Crosby Minimalist Footer for Operational Console */}
      <footer className={`mt-auto border-t py-12 relative z-10 transition-colors duration-300 ${
        isLight ? 'bg-white border-stone-200 text-stone-600' : 'bg-[#0c0c0c] border-[#222222] text-stone-500'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className={`font-serif italic text-base flex items-center gap-2 ${
            isLight ? 'text-stone-900' : 'text-stone-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-stone-800' : 'bg-stone-500'}`} />
            Crosby Atmosphere
          </div>
          <div>
            Extreme Weather Anomaly Tracking and Amplitude-Preserving Downscaling Engine
          </div>
          <div className="font-mono text-[11px] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Node.js 22 &bull; Port 3000 &bull; Operational
          </div>
        </div>
      </footer>

      {/* Pipeline Simulator Modal */}
      <PipelineRunnerModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
        onRunComplete={() => {
          loadInitialData();
        }}
        theme={theme}
      />
    </div>
  );
};

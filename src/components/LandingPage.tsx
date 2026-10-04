import React from 'react';
import { AtmosphericStreamlines } from './AtmosphericStreamlines';
import {
  ArrowRight,
  ShieldAlert,
  Layers,
  Wind,
  Flame,
  Activity,
  Compass,
  Zap,
  CheckCircle2,
  ChevronRight,
  Database,
  Eye,
  FileDown,
  Sparkles,
  BarChart3,
  Sliders,
  Sun,
  Moon,
  TrendingUp,
} from 'lucide-react';
import { AnomalySummary, AlertItem } from '../types/weather';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreModule: (tab: 'map' | 'downscaler' | 'alerts' | 'api' | 'architecture') => void;
  anomalies: AnomalySummary[];
  alerts: AlertItem[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onExploreModule,
  anomalies,
  alerts,
  theme,
  onToggleTheme,
}) => {
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 relative ${
      isLight ? 'bg-[#fbfbf9] text-stone-900 selection:bg-stone-200' : 'bg-[#0c0c0c] text-stone-100 selection:bg-stone-800'
    }`}>
      {/* Standalone Introduction Navigation Bar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
        isLight ? 'bg-white/95 border-stone-200 text-stone-900' : 'bg-[#0e0e0e]/95 border-[#222222] text-stone-100'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-stone-900' : 'bg-stone-200'}`} />
            <div>
              <span className={`font-serif italic text-2xl tracking-wide ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
                Crosby Atmosphere
              </span>
              <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[10px] uppercase font-mono tracking-widest border border-stone-300 dark:border-stone-800 text-stone-500">
                SIH 2026 Prototype
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
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

            {/* Primary Get Started Button */}
            <button
              onClick={onGetStarted}
              className={`px-6 py-2.5 font-medium text-xs uppercase tracking-[0.14em] flex items-center gap-2 transition-all duration-150 active:scale-95 shadow-lg ${
                isLight
                  ? 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-300'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-950 shadow-black'
              }`}
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className={`relative overflow-hidden border-b transition-colors duration-300 ${
        isLight ? 'bg-[#f7f7f4] border-stone-200' : 'bg-[#0c0c0c] border-[#222222]'
      }`}>
        {/* Dynamic Atmospheric Canvas Wind Currents */}
        <AtmosphericStreamlines className="z-0" intensity={1.15} theme={theme} />

        {/* Ambient Blur Glow Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className={`absolute top-12 right-1/4 w-[480px] h-[480px] rounded-full blur-[110px] animate-ambient-drift ${
            isLight ? 'bg-amber-400/15' : 'bg-stone-500/10'
          }`} />
          <div className={`absolute bottom-8 left-1/4 w-[540px] h-[360px] rounded-full blur-[130px] animate-ambient-drift ${
            isLight ? 'bg-rose-400/15' : 'bg-rose-950/20'
          }`} style={{ animationDelay: '-7s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-20 pb-24 sm:pt-28 sm:pb-36 relative z-10">
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2.5 px-4 py-2 border text-xs font-mono mb-8 backdrop-blur-md transition-colors ${
            isLight
              ? 'bg-white/85 border-stone-300 text-stone-800 shadow-sm'
              : 'bg-[#151515]/90 border-stone-800 text-stone-300 shadow-xl'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Extreme Weather Intelligence</span>
            <span className="text-stone-400">&bull;</span>
            <span className="text-[11px] text-stone-500">12 km to 5 km Super-Resolution Platform</span>
          </div>

          <div className="max-w-4xl space-y-6">
            <h1 className={`font-serif italic text-5xl sm:text-7xl lg:text-8xl font-normal tracking-tight leading-[1.04] text-balance ${
              isLight ? 'text-stone-950' : 'text-stone-100'
            }`}>
              Extreme Anomaly Tracking. Zero False Smoothing.
            </h1>

            <p className={`text-lg sm:text-2xl font-light leading-relaxed max-w-3xl ${
              isLight ? 'text-stone-700' : 'text-stone-300'
            }`}>
              Detect, track, and downscale cyclones, convective storms, and extreme heat domes across medium-range horizons (3 to 10 days). Preserving life-critical peak amplitudes for disaster relief agencies.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-6">
              <button
                onClick={onGetStarted}
                className={`group px-8 py-4 font-medium text-xs uppercase tracking-[0.16em] flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5 shadow-2xl ${
                  isLight
                    ? 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-400/60'
                    : 'bg-stone-100 hover:bg-white text-stone-950 shadow-black'
                }`}
              >
                <span>Enter Operational Platform</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => onExploreModule('downscaler')}
                className={`px-7 py-4 border font-medium text-xs uppercase tracking-[0.16em] transition-all duration-200 hover:-translate-y-0.5 ${
                  isLight
                    ? 'border-stone-400 hover:border-stone-900 bg-white/70 text-stone-900'
                    : 'border-stone-700 hover:border-stone-300 bg-stone-900/50 text-stone-200 hover:text-white'
                }`}
              >
                Inspect Downscaler Physics
              </button>
            </div>
          </div>
        </div>

        {/* Live Threat Ticker Ribbon */}
        <div className={`border-t py-4 px-6 sm:px-8 text-xs backdrop-blur-md transition-colors ${
          isLight ? 'bg-stone-100/90 border-stone-200 text-stone-700' : 'bg-[#121212]/95 border-[#222222] text-stone-400'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono text-[11px]">
            <div className="flex items-center gap-3">
              <span className="uppercase tracking-wider font-bold text-rose-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Active Anomaly:
              </span>
              <span className={isLight ? 'text-stone-900 font-semibold' : 'text-stone-200 font-semibold'}>
                {anomalies[0]?.name || 'Bay of Bengal Deep Depression'}
              </span>
              <span className="text-stone-500 hidden md:inline">
                &bull; Peak: 192 mm/d (+120h lead) &bull; EFI: 0.94
              </span>
            </div>

            <div className="flex items-center gap-5">
              <span>51 Ensemble Members</span>
              <span>&bull;</span>
              <span className="text-emerald-500">Mass Conserved (99.2%)</span>
              <span>&bull;</span>
              <button
                onClick={onGetStarted}
                className={`underline hover:no-underline font-sans uppercase tracking-wider text-[10px] font-bold ${
                  isLight ? 'text-stone-900' : 'text-stone-100'
                }`}
              >
                Launch Dashboard &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE CORE PROBLEM & WHY AMPLITUDE PRESERVATION MATTERS */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-24 sm:py-32">
        <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500 font-medium mb-2">
          The Deep Learning Paradox
        </div>
        <h2 className={`font-serif italic text-3xl sm:text-5xl max-w-3xl mb-12 ${
          isLight ? 'text-stone-950' : 'text-stone-100'
        }`}>
          Why standard weather AI smooths away catastrophic peaks.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Card 1: The Flaw of Mean-Squared Error */}
          <div className={`p-8 border space-y-4 transition-all duration-200 hover:-translate-y-1 ${
            isLight ? 'bg-white border-stone-200 shadow-md' : 'bg-[#121212] border-[#222222] shadow-xl'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-mono text-rose-500 font-bold">
                The Conventional Flaw
              </span>
              <span className="text-[11px] font-mono text-stone-500">L2 / MSE Loss</span>
            </div>

            <h3 className={`font-serif italic text-2xl ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              Spectral Smoothing
            </h3>

            <p className={`text-xs sm:text-sm leading-relaxed font-light ${
              isLight ? 'text-stone-700' : 'text-stone-400'
            }`}>
              Traditional neural networks (such as CNNs and plain U-Nets) optimize Mean Squared Error. In chaotic atmospheric flow at 3 to 10 day lead times, storm core positions have irreducible uncertainty.
            </p>

            <p className={`text-xs sm:text-sm leading-relaxed font-light ${
              isLight ? 'text-stone-700' : 'text-stone-400'
            }`}>
              Faced with uncertainty, MSE forces the network to output the <em>conditional average</em> across plausible tracks. This mathematically averages away extreme torrential rain, reporting a calm <strong>110 mm/day</strong> when the true cloudburst is a catastrophic <strong>192 mm/day</strong>.
            </p>

            <div className={`p-3.5 border font-mono text-xs ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-rose-950/30 border-rose-900 text-rose-300'
            }`}>
              &times; Results in deadly alert misses and false sense of security.
            </div>
          </div>

          {/* Card 2: The Crosby Solution: Conditional Residual Diffusion */}
          <div className={`p-8 border space-y-4 transition-all duration-200 hover:-translate-y-1 ${
            isLight ? 'bg-white border-stone-900 shadow-lg' : 'bg-[#151515] border-stone-600 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-mono text-emerald-500 font-bold">
                The Crosby Architecture
              </span>
              <span className="text-[11px] font-mono text-stone-400">CorrDiff Diffusion</span>
            </div>

            <h3 className={`font-serif italic text-2xl ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
              Residual Denoising Diffusion
            </h3>

            <p className={`text-xs sm:text-sm leading-relaxed font-light ${
              isLight ? 'text-stone-700' : 'text-stone-300'
            }`}>
              Our two-stage hybrid generative pipeline divides the super-resolution task into deterministic mean prediction followed by stochastic residual diffusion (25-step DDIM schedule).
            </p>

            <p className={`text-xs sm:text-sm leading-relaxed font-light ${
              isLight ? 'text-stone-700' : 'text-stone-300'
            }`}>
              The generative sampler reconstructs the true high-wavenumber power spectrum, resolving intense convective cores at <strong>5 km target resolution</strong> while satisfying physical mass and moisture conservation constraints.
            </p>

            <div className={`p-3.5 border font-mono text-xs ${
              isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
            }`}>
              &check; Preserves 100% of extreme peak amplitude for disaster relief.
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOUR-STAGE END-TO-END PIPELINE ARCHITECTURE */}
      <section className={`border-t border-b py-24 sm:py-32 transition-colors ${
        isLight ? 'bg-[#f4f4ee] border-stone-200' : 'bg-[#0f0f0f] border-[#222222]'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500 font-medium mb-2">
              System Blueprint
            </div>
            <h2 className={`font-serif italic text-3xl sm:text-5xl ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
              The 4-Stage Operational Pipeline
            </h2>
            <p className={`text-sm sm:text-base mt-4 font-light ${isLight ? 'text-stone-700' : 'text-stone-400'}`}>
              From coarse 12 km raw NetCDF/GRIB2 ensemble ingestion to hyper-local geodesic warning cartography in under 3 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stage 0 */}
            <div className={`p-6 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
              isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'
            }`}>
              <div>
                <span className="font-mono text-xs text-stone-500 block mb-2">STAGE 00</span>
                <h3 className={`font-serif italic text-xl mb-3 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                  Climatology &amp; EFI Index
                </h3>
                <p className={`text-xs leading-relaxed font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Ingests 51-member NEPS-G 4D forecasts. Integrates against a 30-year ERA5/IMDAA baseline (1991–2020) to compute the Extreme Forecast Index (EFI) from distribution tails.
                </p>
              </div>
              <div className="pt-6 border-t border-dashed border-stone-300 dark:border-stone-800 mt-6 text-[11px] font-mono text-stone-500">
                Input: 12 km 4D NetCDF
              </div>
            </div>

            {/* Stage 1 */}
            <div className={`p-6 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
              isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'
            }`}>
              <div>
                <span className="font-mono text-xs text-stone-500 block mb-2">STAGE 01</span>
                <h3 className={`font-serif italic text-xl mb-3 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                  Spherical Mesh GNN
                </h3>
                <p className={`text-xs leading-relaxed font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Transfers grid nodes to an icosahedral spherical mesh, avoiding planar coordinate distortions. Bipartite message passing groups anomalies into continuous trajectories with 4D bounding boxes.
                </p>
              </div>
              <div className="pt-6 border-t border-dashed border-stone-300 dark:border-stone-800 mt-6 text-[11px] font-mono text-stone-500">
                Output: Trajectory + Margin
              </div>
            </div>

            {/* Stage 2 */}
            <div className={`p-6 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
              isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'
            }`}>
              <div>
                <span className="font-mono text-xs text-stone-500 block mb-2">STAGE 02</span>
                <h3 className={`font-serif italic text-xl mb-3 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                  Diffusion Downscaler
                </h3>
                <p className={`text-xs leading-relaxed font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Downscales cropped hazard footprints from 12 km to 5 km (2.4× ratio) using conditioned residual diffusion. Generates multiple samples for calibrated tail uncertainty.
                </p>
              </div>
              <div className="pt-6 border-t border-dashed border-stone-300 dark:border-stone-800 mt-6 text-[11px] font-mono text-stone-500">
                Resolution: 5 km Grid
              </div>
            </div>

            {/* Stage 3 */}
            <div className={`p-6 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
              isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'
            }`}>
              <div>
                <span className="font-mono text-xs text-stone-500 block mb-2">STAGE 03</span>
                <h3 className={`font-serif italic text-xl mb-3 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                  5 km Geodesic Alerts
                </h3>
                <p className={`text-xs leading-relaxed font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Computes 32-point geodesic circular polygons (5.0 km radius) around convective cores. Categorizes Severe, Moderate, and Low warnings with ISO validity windows.
                </p>
              </div>
              <div className="pt-6 border-t border-dashed border-stone-300 dark:border-stone-800 mt-6 text-[11px] font-mono text-stone-500">
                Serving: REST API &amp; PDF
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. KEY METRICS & VALIDATION BENCHMARKS */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className={`p-8 border ${isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'}`}>
            <div className={`font-serif italic text-4xl sm:text-5xl ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
              51
            </div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mt-2 font-medium">
              Ensemble Members Ingested
            </div>
            <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
              NEPS-G Global Ensemble
            </p>
          </div>

          <div className={`p-8 border ${isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'}`}>
            <div className={`font-serif italic text-4xl sm:text-5xl ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
              2.4&times;
            </div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mt-2 font-medium">
              Super-Resolution Ratio
            </div>
            <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
              12 km &rarr; 5 km Target Grid
            </p>
          </div>

          <div className={`p-8 border ${isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'}`}>
            <div className={`font-serif italic text-4xl sm:text-5xl text-emerald-600`}>
              99.2%
            </div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mt-2 font-medium">
              Mass Conservation Score
            </div>
            <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
              Physical Aggregation Invariant
            </p>
          </div>

          <div className={`p-8 border ${isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'}`}>
            <div className={`font-serif italic text-4xl sm:text-5xl ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
              5.0 km
            </div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mt-2 font-medium">
              Geodesic Alert Envelopes
            </div>
            <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
              Eliminates District-Wide Alert Fatigue
            </p>
          </div>
        </div>
      </section>

      {/* 5. EXPLORE DIRECT CAPABILITIES (ONE-CLICK MODULES) */}
      <section className={`border-t py-24 sm:py-32 transition-colors ${
        isLight ? 'bg-[#f7f7f4] border-stone-200' : 'bg-[#101010] border-[#222222]'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500 font-medium mb-2">
                Operational Modules
              </div>
              <h2 className={`font-serif italic text-3xl sm:text-5xl ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
                Explore Platform Capabilities
              </h2>
            </div>

            <button
              onClick={onGetStarted}
              className={`px-6 py-3 font-medium text-xs uppercase tracking-wider flex items-center gap-2 transition-colors ${
                isLight
                  ? 'bg-stone-900 text-white hover:bg-stone-700'
                  : 'bg-stone-100 text-stone-950 hover:bg-stone-300'
              }`}
            >
              Enter Live Dashboard &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Module 1: Cartography */}
            <div
              onClick={() => onExploreModule('map')}
              className={`p-6 border cursor-pointer transition-all duration-200 hover:-translate-y-1 ${
                isLight ? 'bg-white border-stone-200 hover:border-stone-400' : 'bg-[#141414] border-[#262626] hover:border-stone-500'
              }`}
            >
              <Compass className="w-6 h-6 text-stone-500 mb-4" />
              <h3 className={`font-serif italic text-2xl mb-2 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                Spatial Tracking
              </h3>
              <p className={`text-xs leading-relaxed font-light mb-4 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Inspect icosahedral mesh projections, dynamic storm trajectory flow, rotating weather radar beam sweeps, and 5 km geodesic impact polygons.
              </p>
              <span className="text-[11px] uppercase tracking-wider font-semibold font-mono text-stone-500 flex items-center gap-1">
                Open Cartography &rarr;
              </span>
            </div>

            {/* Module 2: Downscaler */}
            <div
              onClick={() => onExploreModule('downscaler')}
              className={`p-6 border cursor-pointer transition-all duration-200 hover:-translate-y-1 ${
                isLight ? 'bg-white border-stone-200 hover:border-stone-400' : 'bg-[#141414] border-[#262626] hover:border-stone-500'
              }`}
            >
              <Layers className="w-6 h-6 text-stone-500 mb-4" />
              <h3 className={`font-serif italic text-2xl mb-2 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                5 km Downscaler
              </h3>
              <p className={`text-xs leading-relaxed font-light mb-4 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Directly compare coarse 12 km grids with downscaled 5 km convective cores. Verify physical mass conservation and power spectrum retention.
              </p>
              <span className="text-[11px] uppercase tracking-wider font-semibold font-mono text-stone-500 flex items-center gap-1">
                Inspect Physics &rarr;
              </span>
            </div>

            {/* Module 3: Alerts & Radius Search */}
            <div
              onClick={() => onExploreModule('alerts')}
              className={`p-6 border cursor-pointer transition-all duration-200 hover:-translate-y-1 ${
                isLight ? 'bg-white border-stone-200 hover:border-stone-400' : 'bg-[#141414] border-[#262626] hover:border-stone-500'
              }`}
            >
              <ShieldAlert className="w-6 h-6 text-stone-500 mb-4" />
              <h3 className={`font-serif italic text-2xl mb-2 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                Early Warnings
              </h3>
              <p className={`text-xs leading-relaxed font-light mb-4 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Query warnings by location, radius slider, and lead-time window. Generate formal, printable PDF briefing reports with vector sparklines.
              </p>
              <span className="text-[11px] uppercase tracking-wider font-semibold font-mono text-stone-500 flex items-center gap-1">
                Filter Bulletins &rarr;
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM INVITATION CTA */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-24 sm:py-32 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className={`font-serif italic text-4xl sm:text-6xl ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
            Ready to track extreme anomalies in medium range?
          </h2>
          <p className={`text-base sm:text-lg font-light leading-relaxed ${isLight ? 'text-stone-700' : 'text-stone-400'}`}>
            Explore the live prototype operational console, simulated 4-stage pipeline execution, and programmatic REST API.
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className={`px-10 py-4 font-medium text-xs uppercase tracking-[0.16em] flex items-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 shadow-2xl ${
                isLight
                  ? 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-400/60'
                  : 'bg-stone-100 hover:bg-white text-stone-950 shadow-black'
              }`}
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Minimalist Footer for Landing Page */}
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
            Operational &bull; Port 3000
          </div>
        </div>
      </footer>
    </div>
  );
};

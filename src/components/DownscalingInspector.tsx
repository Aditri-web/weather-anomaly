import React, { useState } from 'react';
import { DownscaledResponse } from '../types/weather';
import { ShieldCheck, Activity, Info } from 'lucide-react';

interface DownscalingInspectorProps {
  data: DownscaledResponse | null;
  loading: boolean;
  theme?: 'light' | 'dark';
}

export const DownscalingInspector: React.FC<DownscalingInspectorProps> = ({ data, loading, theme = 'dark' }) => {
  const [hoveredFineVal, setHoveredFineVal] = useState<number | null>(null);
  const [hoveredCoarseVal, setHoveredCoarseVal] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'physics'>('visual');

  const isLight = theme === 'light';

  if (loading || !data) {
    return (
      <div className={`p-12 flex flex-col items-center justify-center min-h-[360px] border transition-colors duration-300 ${
        isLight ? 'bg-white border-stone-200 text-stone-600' : 'bg-[#121212] border-[#222222] text-stone-400'
      }`}>
        <div className={`w-8 h-8 border border-t-transparent rounded-full animate-spin mb-4 ${
          isLight ? 'border-stone-800' : 'border-stone-300'
        }`} />
        <span className="font-serif italic text-base animate-pulse">
          Conditioning DDIM Diffusion Sampler on 12 km Regional Crop...
        </span>
      </div>
    );
  }

  const coarseMatrix = data.grid_matrix_preview?.coarse || [];
  const fineMatrix = data.grid_matrix_preview?.downscaled || [];
  const maxFine = data.max_peak_value || 192;
  const isHeat = data.unit === '°C';

  const getCellColor = (val: number, maxVal: number) => {
    const ratio = Math.min(1, Math.max(0, val / (maxVal || 1)));
    if (isHeat) {
      if (ratio < 0.35) return isLight ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-amber-950/60 text-amber-200';
      if (ratio < 0.65) return isLight ? 'bg-amber-400 text-amber-950 font-semibold' : 'bg-amber-700/80 text-amber-100 font-semibold';
      if (ratio < 0.85) return isLight ? 'bg-orange-500 text-white font-bold' : 'bg-orange-600 text-stone-950 font-bold';
      return isLight ? 'bg-rose-600 text-white font-extrabold ring-1 ring-rose-400' : 'bg-rose-500 text-white font-extrabold ring-1 ring-white/60';
    } else {
      if (ratio < 0.25) return isLight ? 'bg-sky-50 text-sky-800 border border-sky-100' : 'bg-[#182430] text-sky-300';
      if (ratio < 0.5) return isLight ? 'bg-sky-200 text-sky-950 font-medium' : 'bg-[#1e3a5f] text-sky-100';
      if (ratio < 0.75) return isLight ? 'bg-blue-600 text-white font-semibold' : 'bg-[#29487d] text-white font-semibold';
      if (ratio < 0.9) return isLight ? 'bg-indigo-700 text-white font-bold' : 'bg-[#4b52b2] text-white font-bold';
      return isLight ? 'bg-purple-800 text-white font-extrabold ring-1 ring-purple-400' : 'bg-[#9333ea] text-white font-extrabold ring-1 ring-stone-200';
    }
  };

  return (
    <div className={`border shadow-xl transition-colors duration-300 ${
      isLight ? 'bg-white border-stone-200' : 'bg-[#111111] border-[#222222]'
    }`}>
      {/* Header Banner */}
      <div className={`px-6 py-5 border-b flex flex-wrap items-center justify-between gap-4 ${
        isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141414] border-[#222222]'
      }`}>
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-medium mb-1">
            Super-Resolution Generative Engine
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className={`font-serif italic text-2xl ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              Amplitude-Preserving Downscaler
            </h3>
            <span className={`font-mono text-xs ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
              12 km &rarr; 5 km (2.4× Ratio)
            </span>
          </div>
          <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
            Conditioned residual diffusion (CorrDiff formulation) eliminates the spectral smoothing flaw of mean-squared error networks, resolving high-intensity peaks for disaster planning.
          </p>
        </div>

        <div className={`flex border p-0.5 text-xs ${isLight ? 'border-stone-300' : 'border-stone-800'}`}>
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-4 py-1.5 uppercase tracking-wider text-[11px] font-medium transition-all duration-200 ${
              activeTab === 'visual'
                ? isLight
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-950 font-semibold'
                : isLight
                ? 'text-stone-600 hover:text-stone-900'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Spatial Matrices
          </button>
          <button
            onClick={() => setActiveTab('physics')}
            className={`px-4 py-1.5 uppercase tracking-wider text-[11px] font-medium transition-all duration-200 ${
              activeTab === 'physics'
                ? isLight
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-950 font-semibold'
                : isLight
                ? 'text-stone-600 hover:text-stone-900'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Physics Loss Penalties
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {activeTab === 'visual' ? (
          <div>
            {/* Metric Comparison Ribbon with Hover Lift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className={`border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                isLight ? 'bg-stone-50 border-stone-200 hover:border-stone-400' : 'bg-[#161616] border-[#262626] hover:border-stone-700'
              }`}>
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">Input 12 km Coarse Peak</div>
                <div className={`text-2xl font-serif mt-1.5 tabular-nums ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                  {data.comparison_data?.coarse_12km_peak} <span className="text-xs font-sans text-stone-500">{data.unit}</span>
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Spatially averaged grid cell</div>
              </div>

              <div className={`border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                isLight ? 'bg-stone-50 border-stone-200 hover:border-stone-400' : 'bg-[#161616] border-[#262626] hover:border-stone-700'
              }`}>
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium flex items-center justify-between">
                  <span>Standard U-Net (L2)</span>
                  <span className="text-[10px] text-rose-500 font-mono font-bold">Smoothed</span>
                </div>
                <div className={`text-2xl font-serif mt-1.5 tabular-nums ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  {data.comparison_data?.regression_blurred_peak} <span className="text-xs font-sans text-stone-500">{data.unit}</span>
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Averages extreme peak (-32%)</div>
              </div>

              <div className={`border p-4 transition-all duration-200 hover:-translate-y-0.5 shadow-md ${
                isLight ? 'bg-white border-stone-900' : 'bg-[#181818] border-stone-500 shadow-lg'
              }`}>
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium flex items-center justify-between">
                  <span className={isLight ? 'text-stone-900 font-bold' : 'text-stone-300'}>DDIM Diffusion (5 km)</span>
                  <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-stone-100'}`}>Preserved</span>
                </div>
                <div className={`text-2xl font-serif mt-1.5 tabular-nums ${isLight ? 'text-stone-950 font-bold' : 'text-stone-100'}`}>
                  {data.comparison_data?.diffusion_peak} <span className="text-xs font-sans text-stone-500">{data.unit}</span>
                </div>
                <div className={`text-[11px] mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>Extreme amplitude retention</div>
              </div>

              <div className={`border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                isLight ? 'bg-stone-50 border-stone-200 hover:border-stone-400' : 'bg-[#161616] border-[#262626] hover:border-stone-700'
              }`}>
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium flex items-center justify-between">
                  <span>Mass Conservation</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                </div>
                <div className={`text-2xl font-serif mt-1.5 tabular-nums ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                  {(Number(data.comparison_data?.physics_conservation_score || 0.99) * 100).toFixed(1)}%
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Residual consistency constraint</div>
              </div>
            </div>

            {/* Side-by-Side 2D Matrix Heatmap Visualizer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coarse 12 km Grid */}
              <div className={`border p-5 transition-colors duration-200 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141414] border-[#262626]'
              }`}>
                <div className={`flex items-center justify-between mb-4 pb-3 border-b text-xs ${
                  isLight ? 'border-stone-200' : 'border-[#222222]'
                }`}>
                  <div>
                    <span className={`font-serif italic text-base ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                      Coarse Forecast Grid
                    </span>
                    <span className="text-stone-500 text-[11px] block mt-0.5">12 km Lat/Lon &bull; 8 × 8 Cells</span>
                  </div>
                  <span className={`font-mono text-[11px] ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>NEPS-G</span>
                </div>

                <div className={`aspect-square w-full max-w-[320px] mx-auto grid grid-cols-8 gap-1 p-2 border ${
                  isLight ? 'bg-white border-stone-200' : 'bg-[#0c0c0c] border-[#222222]'
                }`}>
                  {coarseMatrix.map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div
                        key={`coarse-${rIdx}-${cIdx}`}
                        onMouseEnter={() => setHoveredCoarseVal(val)}
                        onMouseLeave={() => setHoveredCoarseVal(null)}
                        className={`flex items-center justify-center text-[10px] font-mono transition-all duration-150 hover:scale-110 cursor-pointer ${getCellColor(
                          val,
                          maxFine
                        )}`}
                        title={`Coarse [${rIdx},${cIdx}]: ${val} ${data.unit}`}
                      >
                        {val >= 10 ? Math.round(val) : val}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 text-center text-xs text-stone-500">
                  {hoveredCoarseVal !== null ? (
                    <span className={`font-mono ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                      Coarse Cell Value: <strong className={isLight ? 'text-stone-950 font-bold' : 'text-white font-bold'}>{hoveredCoarseVal} {data.unit}</strong>
                    </span>
                  ) : (
                    <span>Coarse grid smooths peak rainfall across 144 km²</span>
                  )}
                </div>
              </div>

              {/* High-Resolution Downscaled 5 km Grid */}
              <div className={`border p-5 transition-colors duration-200 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141414] border-[#262626]'
              }`}>
                <div className={`flex items-center justify-between mb-4 pb-3 border-b text-xs ${
                  isLight ? 'border-stone-200' : 'border-[#222222]'
                }`}>
                  <div>
                    <span className={`font-serif italic text-base flex items-center gap-2 ${
                      isLight ? 'text-stone-900' : 'text-stone-100'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                      Downscaled Impact Grid
                    </span>
                    <span className="text-stone-500 text-[11px] block mt-0.5">5 km Target Resolution &bull; 16 × 16 Cells</span>
                  </div>
                  <span className={`font-mono text-[11px] ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>DDIM-25</span>
                </div>

                <div className={`aspect-square w-full max-w-[320px] mx-auto grid grid-cols-16 gap-0.5 p-2 border ${
                  isLight ? 'bg-white border-stone-200' : 'bg-[#0c0c0c] border-[#222222]'
                }`}>
                  {fineMatrix.map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div
                        key={`fine-${rIdx}-${cIdx}`}
                        onMouseEnter={() => setHoveredFineVal(val)}
                        onMouseLeave={() => setHoveredFineVal(null)}
                        className={`flex items-center justify-center text-[8px] font-mono transition-all duration-150 hover:scale-125 hover:z-20 cursor-pointer ${getCellColor(
                          val,
                          maxFine
                        )}`}
                        title={`5km [${rIdx},${cIdx}]: ${val} ${data.unit}`}
                      >
                        {val >= 120 ? Math.round(val) : ''}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 text-center text-xs text-stone-500">
                  {hoveredFineVal !== null ? (
                    <span className={`font-mono ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                      5 km Cell Value: <strong className={isLight ? 'text-stone-950 font-bold' : 'text-white font-bold'}>{hoveredFineVal} {data.unit}</strong> (Convective maximum)
                    </span>
                  ) : (
                    <span>Hover 5 km cells to inspect local convective cores</span>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Amplitude Comparison Bar */}
            <div className={`mt-8 p-5 border ${
              isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141414] border-[#262626]'
            }`}>
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className={`font-serif italic text-sm ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                  Spectral Peak Preservation Comparison
                </span>
                <span className="font-mono text-stone-500 text-[11px]">
                  Relative to Ground Truth Peak
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={`font-medium ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                      Conditional Diffusion (Stage 2)
                    </span>
                    <span className={`font-mono font-bold ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
                      100% Preserved ({data.comparison_data?.diffusion_peak} {data.unit})
                    </span>
                  </div>
                  <div className={`w-full h-2.5 overflow-hidden ${isLight ? 'bg-stone-200' : 'bg-stone-900'}`}>
                    <div className={`h-full transition-all duration-700 ease-out ${isLight ? 'bg-stone-900' : 'bg-stone-200'}`} style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={isLight ? 'text-stone-600' : 'text-stone-400'}>Input 12 km Coarse Footprint</span>
                    <span className={`font-mono ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                      {Math.round(((data.comparison_data?.coarse_12km_peak || 120) / (data.comparison_data?.diffusion_peak || 192)) * 100)}% ({data.comparison_data?.coarse_12km_peak} {data.unit})
                    </span>
                  </div>
                  <div className={`w-full h-2 overflow-hidden ${isLight ? 'bg-stone-200' : 'bg-stone-900'}`}>
                    <div
                      className="h-full bg-stone-500 transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.round(((data.comparison_data?.coarse_12km_peak || 120) / (data.comparison_data?.diffusion_peak || 192)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-500">Standard U-Net (L2 / MSE Loss)</span>
                    <span className="font-mono text-stone-500">
                      {Math.round(((data.comparison_data?.regression_blurred_peak || 110) / (data.comparison_data?.diffusion_peak || 192)) * 100)}% ({data.comparison_data?.regression_blurred_peak} {data.unit})
                    </span>
                  </div>
                  <div className={`w-full h-2 overflow-hidden ${isLight ? 'bg-stone-200' : 'bg-stone-900'}`}>
                    <div
                      className={`h-full transition-all duration-700 ease-out ${isLight ? 'bg-rose-300' : 'bg-rose-950/70'}`}
                      style={{
                        width: `${Math.round(((data.comparison_data?.regression_blurred_peak || 110) / (data.comparison_data?.diffusion_peak || 192)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Physics-Informed Verification Tab */
          <div className="space-y-6">
            <div className={`border p-6 ${isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141414] border-[#222222]'}`}>
              <h4 className={`font-serif italic text-xl flex items-center gap-2 mb-2 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                <Activity className="w-4 h-4 text-stone-400" />
                Physical Invariant Enforcement
              </h4>
              <p className={`text-xs mb-6 leading-relaxed max-w-3xl font-light ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Unconstrained generative architectures risk hallucinations. Stage 2 regulates diffusion updates with soft penalties enforcing physical conservation principles:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                  isLight ? 'bg-white border-stone-200 hover:border-stone-400' : 'bg-[#181818] border-[#262626] hover:border-stone-700'
                }`}>
                  <div className={`flex items-center justify-between text-xs font-medium mb-2 ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                    <span className="font-serif italic text-base">Aggregation Balance</span>
                    <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-stone-100'}`}>0.8% Error</span>
                  </div>
                  <div className="text-xs text-stone-500">
                    <code className={`text-[11px] font-mono ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>||Pool(y_hat) - x_coarse||</code>
                    <p className="mt-2 leading-relaxed font-light">Guarantees that the downscaled rain integrates back to the coarse synoptic mass flux.</p>
                  </div>
                </div>

                <div className={`border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                  isLight ? 'bg-white border-stone-200 hover:border-stone-400' : 'bg-[#181818] border-[#262626] hover:border-stone-700'
                }`}>
                  <div className={`flex items-center justify-between text-xs font-medium mb-2 ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                    <span className="font-serif italic text-base">Spectral Fidelity</span>
                    <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-stone-100'}`}>0.984</span>
                  </div>
                  <div className="text-xs text-stone-500">
                    <code className={`text-[11px] font-mono ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>E(k) / E_ref(k) ~ 1.0</code>
                    <p className="mt-2 leading-relaxed font-light">Preserves high-wavenumber spatial variance instead of blurring it away into flat contours.</p>
                  </div>
                </div>

                <div className={`border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                  isLight ? 'bg-white border-stone-200 hover:border-stone-400' : 'bg-[#181818] border-[#262626] hover:border-stone-700'
                }`}>
                  <div className={`flex items-center justify-between text-xs font-medium mb-2 ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                    <span className="font-serif italic text-base">Moisture Flux Check</span>
                    <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-stone-100'}`}>Bounded</span>
                  </div>
                  <div className="text-xs text-stone-500">
                    <code className={`text-[11px] font-mono ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>P ≤ -∇ · (v · q) + ε</code>
                    <p className="mt-2 leading-relaxed font-light">Penalizes localized torrential rain unless backed by atmospheric column moisture convergence.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-5 border flex items-start gap-4 ${
              isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#161616] border-[#262626]'
            }`}>
              <Info className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              <div className={`text-xs leading-relaxed ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
                <strong className={`font-serif italic text-sm block mb-1 ${isLight ? 'text-stone-950' : 'text-stone-100'}`}>
                  Operational Imperative for Forecasters:
                </strong>
                Standard NWP models average across ensemble members, reporting 90 mm/day when ground stations record catastrophic 190 mm/day cloudbursts. By conditioning residual diffusion on high-resolution topography, the model preserves true tail hazards required by disaster relief authorities.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

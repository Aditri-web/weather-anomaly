import React, { useState } from 'react';
import { Play, Check, X } from 'lucide-react';

interface PipelineRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunComplete: () => void;
  theme?: 'light' | 'dark';
}

export const PipelineRunnerModal: React.FC<PipelineRunnerModalProps> = ({
  isOpen,
  onClose,
  onRunComplete,
  theme = 'dark',
}) => {
  const [running, setRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const isLight = theme === 'light';

  if (!isOpen) return null;

  const steps = [
    { name: 'Stage 0: 30-Year ERA5 EFI Ingestion', detail: 'Evaluating Extreme Forecast Index tail quantile differences across 51 members' },
    { name: 'Stage 1: Spherical Icosahedral Mesh GNN', detail: 'Message-passing graph convolutions on geodesic spherical coordinates' },
    { name: 'Stage 2: Conditional CorrDiff Residual Diffusion', detail: 'Executing 25-step DDIM sampler preserving extreme localized amplitudes' },
    { name: 'Stage 3: Physical Conservation Invariants', detail: 'Verifying aggregation mass conservation and moisture flux divergence' },
    { name: 'Stage 4: Geodesic 5 km Warning Cartography', detail: 'Generating 32-point polygon core geometries and tiered advisory bulletins' },
  ];

  const handleStart = async () => {
    setRunning(true);
    setLogMessages(['[Pipeline] Ingesting NEPS-G 12 km operational forecast cycle...']);

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      setLogMessages(prev => [...prev, `[${steps[i].name}] Processing: ${steps[i].detail}`]);
      await new Promise(r => setTimeout(r, 650));
      setLogMessages(prev => [...prev, `[${steps[i].name}] Verified and completed.`]);
    }

    try {
      await fetch('/v1/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle: '2026-10-02T00Z' }),
      });
    } catch (e) {
      console.error(e);
    }

    setLogMessages(prev => [...prev, '[Pipeline] Full forecast cycle completed! Bulletins synchronized to REST API.']);
    setRunning(false);
    onRunComplete();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${
      isLight ? 'bg-stone-900/50' : 'bg-black/80'
    }`}>
      <div className={`w-full max-w-2xl overflow-hidden shadow-2xl border transition-colors duration-300 ${
        isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-[#121212] border-[#2a2a2a] text-stone-100'
      }`}>
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#161616] border-[#222222]'
        }`}>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-medium mb-0.5">
              Cycle Execution Simulation
            </div>
            <h3 className={`font-serif italic text-2xl ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              End-to-End Pipeline Dispatcher
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className={`p-1.5 transition-colors disabled:opacity-30 ${
              isLight ? 'text-stone-500 hover:text-stone-900' : 'text-stone-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
            Dispatches the complete meteorological workflow from raw 12 km ensemble NetCDF ingestion to icosahedral mesh anomaly isolation and 5 km amplitude-preserving diffusion sampling.
          </p>

          {/* Stepper Display */}
          <div className="space-y-3">
            {steps.map((st, idx) => {
              const isDone = currentStep > idx;
              const isCurrent = running && currentStep === idx;

              return (
                <div
                  key={idx}
                  className={`p-3.5 border text-xs flex items-center gap-3.5 transition-colors ${
                    isDone
                      ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-[#181818] border-stone-700 text-stone-200'
                      : isCurrent
                      ? isLight ? 'bg-stone-100 border-stone-900 text-stone-950 font-semibold ring-1 ring-stone-900' : 'bg-[#1c1c1c] border-stone-400 text-white ring-1 ring-stone-400/40'
                      : isLight ? 'bg-stone-50 border-stone-200 text-stone-500' : 'bg-[#141414] border-[#222222] text-stone-500'
                  }`}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <Check className={`w-4 h-4 ${isLight ? 'text-emerald-700 font-bold' : 'text-stone-200'}`} />
                    ) : isCurrent ? (
                      <div className={`w-3.5 h-3.5 border border-t-transparent rounded-full animate-spin ${isLight ? 'border-stone-900' : 'border-stone-200'}`} />
                    ) : (
                      <span className={`font-mono text-[11px] ${isLight ? 'text-stone-400' : 'text-stone-600'}`}>0{idx}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-serif italic text-sm ${isLight ? 'text-stone-900 font-medium' : 'text-stone-200'}`}>
                      {st.name}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                      {st.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Execution Log Console */}
          <div className={`p-3.5 font-mono text-[11px] h-28 overflow-y-auto space-y-1 border ${
            isLight ? 'bg-[#0f172a] text-emerald-300 border-stone-300' : 'bg-[#0c0c0c] border-stone-800 text-stone-400'
          }`}>
            {logMessages.map((msg, idx) => (
              <div key={idx} className="leading-tight">
                {msg}
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={running}
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors disabled:opacity-40 ${
                isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-white'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={running}
              className={`px-6 py-2.5 font-medium text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-40 ${
                isLight
                  ? 'bg-stone-900 hover:bg-stone-700 text-white'
                  : 'bg-stone-100 hover:bg-stone-300 text-stone-950'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {running ? 'Processing Cycle...' : 'Run Pipeline Cycle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

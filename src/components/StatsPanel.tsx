import React from 'react';
import { Mesh, MeshType } from '../types';
import { getMeshStats } from '../simplifier';
import { Info, HelpCircle } from 'lucide-react';

interface StatsPanelProps {
  currentMesh: Mesh;
  initialMesh: Mesh;
  selectedMeshType: MeshType;
  historyLength: number;
  currentStep: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  currentMesh,
  initialMesh,
  selectedMeshType,
  historyLength,
  currentStep,
}) => {
  const current = getMeshStats(currentMesh);
  const initial = getMeshStats(initialMesh);

  // Compute percentage calculations
  const vPercentage = (current.vCount / initial.vCount) * 100;
  const ePercentage = (current.eCount / initial.eCount) * 100;
  const fPercentage = (current.fCount / initial.fCount) * 100;

  // Euler Characteristic: Chi = V - E + F
  const chi = current.vCount - current.eCount + current.fCount;

  // Expected Euler Characteristic depending on shape topology (under topology-preserving collapse)
  const getExpectedChi = () => {
    switch (selectedMeshType) {
      case 'sphere':
        return { value: 2, desc: 'Closed genus-0 manifold (Sphere/Icosahedron)' };
      case 'torus':
        return { value: 0, desc: 'Closed genus-1 manifold (Torus)' };
      case 'terrain':
        return { value: 1, desc: 'Open boundary disk sheet (Terrain Grid)' };
      case 'cylinder':
        return { value: 2, desc: 'Closed genus-0 cylinder manifold' };
      default:
        return { value: 2, desc: 'Genus-0 manifold' };
    }
  };

  const expectedChi = getExpectedChi();
  const isEulerStable = chi === expectedChi.value;

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl text-slate-100 flex flex-col gap-6">
      {/* Panel Headers */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase font-mono">
          Geometric & Topological Live Stats
        </h3>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
          Step {currentStep} / {historyLength - 1} Collapses
        </span>
      </div>

      {/* Grid of Counters */}
      <div className="grid grid-cols-3 gap-4">
        {/* Vertices Segment */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col gap-1 text-center sm:text-left">
          <span className="text-[11px] text-slate-400 font-mono tracking-wide uppercase">Vertices (V)</span>
          <div className="flex items-baseline justify-center sm:justify-start gap-1.5 mt-1">
            <span id="counter-vertices" className="text-3xl font-semibold tracking-tight text-sky-400 font-sans">
              {current.vCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / {initial.vCount}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800/60 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-sky-400 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${vPercentage}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 text-left">
            {vPercentage.toFixed(1)}% Active
          </span>
        </div>

        {/* Edges Segment */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col gap-1 text-center sm:text-left">
          <span className="text-[11px] text-slate-400 font-mono tracking-wide uppercase">Edges (E)</span>
          <div className="flex items-baseline justify-center sm:justify-start gap-1.5 mt-1">
            <span id="counter-edges" className="text-3xl font-semibold tracking-tight text-teal-400 font-sans">
              {current.eCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / {initial.eCount}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800/60 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-teal-400 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${ePercentage}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 text-left">
            {ePercentage.toFixed(1)}% Active
          </span>
        </div>

        {/* Faces Segment */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col gap-1 text-center sm:text-left">
          <span className="text-[11px] text-slate-400 font-mono tracking-wide uppercase">Triangles (F)</span>
          <div className="flex items-baseline justify-center sm:justify-start gap-1.5 mt-1">
            <span id="counter-faces" className="text-3xl font-semibold tracking-tight text-indigo-400 font-sans">
              {current.fCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / {initial.fCount}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800/60 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-indigo-400 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${fPercentage}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 text-left">
            {fPercentage.toFixed(1)}% Active
          </span>
        </div>
      </div>

      {/* Advanced Geometric Theorem Highlight (Euler Characteristic) */}
      <div className="bg-slate-950/50 rounded-xl border border-slate-800/85 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg mt-0.5 ${isEulerStable ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <Info size={18} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wide">
                Euler Characteristic Invariance
              </h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                &chi; = V - E + F
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-normal">
              Euler characteristic remains invariant (&chi; = {expectedChi.value}) during topological transformations. Current:
              <span className="text-slate-200 font-mono font-bold mx-1">
                {current.vCount} - {current.eCount} + {current.fCount} = {chi}
              </span>.
            </p>
            <div className="text-[11px] text-slate-500 font-mono leading-tight mt-1">
              Topological shape: <span className="text-indigo-400">{expectedChi.desc}</span>
            </div>
          </div>
        </div>

        {/* Badge of stability */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">Topology State</span>
          <span className={`text-xs px-2.5 py-1 rounded-md font-mono mt-1 font-semibold ${
            isEulerStable 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {isEulerStable ? '● Preserved' : '▲ Boundary Altered'}
          </span>
        </div>
      </div>
    </div>
  );
};

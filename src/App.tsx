import React, { useState, useMemo, useEffect, useRef } from 'react';
import { generateMesh } from './meshGenerator';
import { Mesh, MeshType } from './types';
import { MeshRenderer } from './components/MeshRenderer';
import {
  Layers,
  Sliders,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
  Activity,
  HelpCircle
} from 'lucide-react';

export default function App() {
  // 1. Mesh Selection State (Sphere is loaded immediately)
  const [meshType, setMeshType] = useState<MeshType>('sphere');

  // 2. Simplification level (0 = High, 1 = Medium, 2 = Low)
  const [sliderVal, setSliderVal] = useState<number>(0);

  // 3. Renderer styling options
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showVertices, setShowVertices] = useState<boolean>(true);

  // 4. Hover states
  const [hoveredVertexId, setHoveredVertexId] = useState<number | null>(null);
  const [hoveredFaceId, setHoveredFaceId] = useState<number | null>(null);

  // Map slider numeric value to resolution string
  const resolution = useMemo(() => {
    if (sliderVal === 0) return 'high';
    if (sliderVal === 1) return 'medium';
    return 'low';
  }, [sliderVal]);

  // Generate selected active mesh
  const activeMesh = useMemo(() => {
    return generateMesh(meshType, resolution);
  }, [meshType, resolution]);

  // Calculate live counts
  const stats = useMemo(() => {
    const vCount = activeMesh.vertices.filter(v => v.active).length;
    const fCount = activeMesh.faces.filter(f => f.active).length;
    const eCount = activeMesh.edges.filter(e => e.active).length;
    return { vCount, eCount, fCount };
  }, [activeMesh]);

  // Euler Characteristic computation: Chi = V - E + F
  const chi = useMemo(() => {
    return stats.vCount - stats.eCount + stats.fCount;
  }, [stats]);

  // Get human-readable description of current mesh
  const getResolutionDescription = () => {
    if (resolution === 'high') {
      return {
        title: 'High Detail Subdivided Mesh',
        desc: 'Maximum topological fidelity with a dense vertex arrangement, ideal for smooth-shaded graphics.',
      };
    }
    if (resolution === 'medium') {
      return {
        title: 'Medium Detail Decimated Mesh',
        desc: 'Balanced geometry with optimized edge distribution, preserving primary curvatures with fewer polygons.',
      };
    }
    return {
      title: 'Low-Poly Simplified Mesh',
      desc: 'Base polyhedron wireframe. Extremely lightweight and optimized, revealing raw polygonal topology.',
    };
  };

  const resDesc = getResolutionDescription();

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 1. Navbar Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 shadow-cyan-500/5 shadow-inner">
            <Layers className="text-cyan-400 animate-pulse" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-2">
              3D Mesh Simplification Lab
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Interactive Viewport • Real-time Geometric Decimation & Euler Invariance
            </p>
          </div>
        </div>

        {/* Selected Shape Selector */}
        <div id="mesh-selector-group" className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl self-stretch sm:self-auto overflow-x-auto gap-1">
          {[
            { id: 'sphere', label: 'Sphere' },
            { id: 'torus', label: 'Torus (Donut)' },
            { id: 'terrain', label: 'Mountain Grid' },
            { id: 'cylinder', label: 'Cylinder' },
          ].map((item) => (
            <button
              id={`btn-mesh-${item.id}`}
              key={item.id}
              onClick={() => {
                setMeshType(item.id as MeshType);
                setHoveredVertexId(null);
                setHoveredFaceId(null);
              }}
              className={`text-xs px-4 py-2 rounded-lg font-mono tracking-wide transition-all duration-200 shrink-0 whitespace-nowrap ${
                meshType === item.id
                  ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Layout Viewport Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        
        {/* LEFT COLUMN: 3D Viewport & Interactive Slider Underneath (7 Columns) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* A. 3D Viewport Canvas */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 h-[480px] lg:h-[500px] overflow-hidden relative shadow-2xl">
            <MeshRenderer
              mesh={activeMesh}
              showWireframe={showWireframe}
              showVertices={showVertices}
              highlightedFaces={new Set<number>()}
              onHoverVertex={setHoveredVertexId}
              onHoverFace={setHoveredFaceId}
              hoveredVertexId={hoveredVertexId}
              hoveredFaceId={hoveredFaceId}
            />
          </div>

          {/* B. SIMPLIFICATION SLIDER (DIRECTLY UNDER THE VIEWPORT) */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="text-cyan-400" size={18} />
                <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase font-mono">
                  Simplification Slider
                </h3>
              </div>
              <span className="text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 px-2.5 py-0.5 rounded-full capitalize">
                Level: {resolution}
              </span>
            </div>

            {/* Slider Range Control snapping to 3 levels */}
            <div className="relative pt-2 pb-1">
              <input
                id="simplification-slider"
                type="range"
                min="0"
                max="2"
                step="1"
                value={sliderVal}
                onChange={(e) => {
                  setSliderVal(parseInt(e.target.value));
                  setHoveredVertexId(null);
                  setHoveredFaceId(null);
                }}
                className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 transition-all focus:outline-none"
              />
              
              {/* Ticks Labeling */}
              <div className="flex justify-between text-xs text-slate-400 font-mono mt-3 px-1 select-none">
                <button 
                  onClick={() => setSliderVal(0)}
                  className={`flex flex-col items-start transition-all ${sliderVal === 0 ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'}`}
                >
                  <span>Level 1</span>
                  <span className="text-[10px] text-slate-500">High Detail</span>
                </button>
                <button 
                  onClick={() => setSliderVal(1)}
                  className={`flex flex-col items-center transition-all ${sliderVal === 1 ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'}`}
                >
                  <span>Level 2</span>
                  <span className="text-[10px] text-slate-500">Medium Detail</span>
                </button>
                <button 
                  onClick={() => setSliderVal(2)}
                  className={`flex flex-col items-end transition-all ${sliderVal === 2 ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'}`}
                >
                  <span>Level 3</span>
                  <span className="text-[10px] text-slate-500">Low Poly</span>
                </button>
              </div>
            </div>

            {/* Active stage detail prompt */}
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-850 flex gap-2 w-full mt-1">
              <Sparkles className="text-cyan-400 shrink-0 mt-0.5" size={14} />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 font-mono">{resDesc.title}</span>
                <span className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{resDesc.desc}</span>
              </div>
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: Massive Counters, Styling & Info Panel (5 Columns) */}
        <section className="lg:col-span-5 flex flex-col gap-6">

          {/* A. MASSIVE DYNAMIC COUNTERS PANEL */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <Activity className="text-cyan-400" size={16} />
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase font-mono">
                Geometric Complexity Metrics
              </h3>
            </div>

            {/* Vertices Count */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-sky-950/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest block">
                  Vertices Count
                </span>
                <span className="text-slate-500 text-[11px] font-mono">Position vectors in 3D scene</span>
              </div>
              <span id="counter-vertices" className="text-4xl md:text-5xl font-extrabold tracking-tight text-sky-400 font-mono">
                {stats.vCount}
              </span>
            </div>

            {/* Edges Count */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-teal-950/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest block">
                  Edges Count
                </span>
                <span className="text-slate-500 text-[11px] font-mono">Topological connections</span>
              </div>
              <span id="counter-edges" className="text-4xl md:text-5xl font-extrabold tracking-tight text-teal-400 font-mono">
                {stats.eCount}
              </span>
            </div>

            {/* Faces Count */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-950/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest block">
                  Faces Count (Triangles)
                </span>
                <span className="text-slate-500 text-[11px] font-mono">Planes rendering the surface</span>
              </div>
              <span id="counter-faces" className="text-4xl md:text-5xl font-extrabold tracking-tight text-cyan-400 font-mono">
                {stats.fCount}
              </span>
            </div>
          </div>

          {/* B. OVERLAY TOGGLES & LIGHT CONTROLS */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Eye className="text-slate-400" size={16} />
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase font-mono">
                Visibility Toggles
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Wireframe Button toggle */}
              <button
                id="toggle-wireframe"
                onClick={() => setShowWireframe(!showWireframe)}
                className={`flex items-center justify-center gap-2.5 text-xs py-3 rounded-xl border font-mono transition-colors ${
                  showWireframe
                    ? 'bg-slate-800 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${showWireframe ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                Wireframe Lines
              </button>

              {/* Vertices Button toggle */}
              <button
                id="toggle-vertices"
                onClick={() => setShowVertices(!showVertices)}
                className={`flex items-center justify-center gap-2.5 text-xs py-3 rounded-xl border font-mono transition-colors ${
                  showVertices
                    ? 'bg-slate-800 border-sky-500/40 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${showVertices ? 'bg-sky-400' : 'bg-slate-600'}`} />
                Vertex Points
              </button>
            </div>
          </div>

          {/* C. MATHEMATICAL EULER CHARACTERISTIC CARD */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Info size={16} className="text-cyan-400" />
              <span className="text-xs font-bold tracking-wide uppercase font-mono">
                Euler Characteristic (&chi;)
              </span>
            </div>
            
            <p className="text-xs text-slate-400 leading-normal">
              A topological invariant for closed manifolds that characterizes polyhedra regardless of their subdivision levels:
            </p>

            <div className="bg-slate-950 flex items-center justify-around p-3.5 rounded-xl border border-slate-850 font-mono text-sm mt-1">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500">Formula</span>
                <span className="text-slate-200 text-xs font-bold mt-0.5">V - E + F</span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500">Live Equation</span>
                <span className="text-cyan-400 font-bold text-xs mt-0.5">
                  {stats.vCount} - {stats.eCount} + {stats.fCount}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500">Result</span>
                <span className="text-emerald-400 font-extrabold text-sm mt-0.5">&chi; = {chi}</span>
              </div>
            </div>
          </div>

        </section>

      </main>

      {/* 3. FOOTER EXPLANATION PANEL */}
      <footer className="border-t border-slate-900 bg-slate-950/70 p-6 text-center select-none">
        <p className="text-xs text-slate-500 font-mono">
          Interactive Computer Graphics Laboratory • Use mouse click and drag to orbit camera around the origin (0, 0, 6) in real time.
        </p>
      </footer>
    </div>
  );
}

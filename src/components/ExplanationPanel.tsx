import React, { useState } from 'react';
import { BookOpen, Box, ToggleLeft, HelpCircle } from 'lucide-react';

export const ExplanationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basics' | 'simplification'>('basics');

  const topicsBasics = [
    {
      title: "Vertices (V)",
      definition: "A vertex (plural: vertices) is a point in 3D coordinate space.",
      math: "represented as a 3-element vector: P = (x, y, z)",
      info: "It holds spatial coordinates and optional properties like surface normals, texture coordinates (UVs), and vertex colors. In a mesh, vertices define the corner coordinates of triangles.",
    },
    {
      title: "Edges (E)",
      definition: "An edge is a straight line segment connecting two vertices.",
      math: "represented as an index pair: e = {v_i, v_j}",
      info: "Edges define the skeletal connections on a mesh surface. Together, the set of vertices and edges form the mesh's connectivity graph.",
    },
    {
      title: "Faces (F)",
      definition: "A face is a flat, closed polygon bounded by a loop of shared edges.",
      math: "represented as a list of indices: f = (v1, v2, v3)",
      info: "Most real-time graphics engines utilize purely triangular faces (triangles) because they are guaranteed to be flat, convex, and computationally cheap to rasterize in parallel on standard GPUs.",
    },
    {
      title: "What is a Triangle Mesh?",
      definition: "An organized collection of connected vertices, edges, and triangular faces that approximates the surface of a 3D geometric shape.",
      math: "defined as a tuple: M = (V, E, F)",
      info: "It represents boundary representations in computer graphics. Dense meshes provide highly photorealistic smoothness but impose massive graphics memory and GPU processing loads.",
    },
  ];

  const topicsSimplification = [
    {
      title: "What is Mesh Simplification?",
      info: "Mesh Simplification (or polygon reduction) is the computational process of reducing the number of vertices and triangles in a 3D model while preserving its original visual appearance, silhouette, volume, and texture mappings as closely as possible.",
    },
    {
      title: "What is Edge Collapse?",
      info: "Edge Collapse (or edge contraction) is the fundamental atomic operator used in most decimation algorithms. Given an edge connecting two adjacent vertices (u, v), the operator merges vertex v into vertex u (or both to a midpoint), and replaces all references of vertex v with u in the mesh connectivity lists.",
      consequence: "An edge collapse reduces: 1 Vertex, 3 Edges, and 2 Triangles from the active mesh structure, while maintaining topological continuity.",
    },
    {
      title: "Why is Mesh Simplification useful?",
      list: [
        "Level of Detail (LOD): Objects far from the camera can be rendered with extremely low-poly meshes, saving precious GPU rasterization and vertex buffer cycles.",
        "Mobile & Web Constraints: Devices with low-memory or low-power GPUs benefit immensely from lighter geometry assets.",
        "Rapid Web Delivery: Smaller mesh sizes dramatically reduce file download times in web applications (e.g., WebGL, e-commerce, virtual tours).",
        "Physics Simulators: Simplifying collision meshes speeds up fast distance fields and contact collision approximations.",
      ],
    },
  ];

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl text-slate-100 flex flex-col gap-6">
      {/* Header Topic Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="text-indigo-400" size={18} />
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase font-mono">
            Interactive Learning Guide
          </h3>
        </div>

        {/* Custom Tab Toggles */}
        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            id="tab-basics-toggle"
            onClick={() => setActiveTab('basics')}
            className={`text-xs font-mono px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'basics'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mesh Elements
          </button>
          <button
            id="tab-simplification-toggle"
            onClick={() => setActiveTab('simplification')}
            className={`text-xs font-mono px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'simplification'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Edge Collapse
          </button>
        </div>
      </div>

      {/* Content Renderers */}
      {activeTab === 'basics' ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            A 3D polygonal model is mathematically defined as a <strong>graph</strong> of points in space linked by straight paths and closed loops. Familiarize yourself with the basic building blocks below:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
            {topicsBasics.map((topic, i) => (
              <div
                key={i}
                className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-2 hover:border-slate-700/60 transition-all"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold font-mono text-indigo-300">
                    {topic.title}
                  </h4>
                  <span className="text-[9px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {topic.math}
                  </span>
                </div>
                <p className="text-[12px] font-sans text-slate-200 font-medium leading-normal">
                  {topic.definition}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/30 p-2 rounded-lg border border-slate-900/50">
                  {topic.info}
                </p>
              </div>
            ))}
          </div>

          {/* Core Topology Formula Card */}
          <div className="bg-gradient-to-r from-indigo-950/20 to-slate-900/40 p-3 rounded-lg border border-indigo-900/30 text-xs text-slate-400 leading-normal flex items-center gap-3">
            <span className="bg-indigo-500/10 text-indigo-400 p-2 rounded-md font-bold font-mono select-none">
              &chi; = V - E + F
            </span>
            <p>
              <strong>Euler Formula:</strong> For any simple, closed, genus-0 mesh topological surface (like our icosahedron sphere), the alternating sum of vertices, edges, and faces is bound to equal exactly <strong>2</strong>. This is a topological invariant of the surface and does not change when vertices slide or contract!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            In standard Computer Graphics pipelines, complex models easily reach millions of polygons. Real-time rendering requires automated algorithms to simplify geometry while preserving key details.
          </p>

          <div className="flex flex-col gap-4 mt-1?.">
            {topicsSimplification.map((topic, i) => (
              <div
                key={i}
                className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-2"
              >
                <h4 className="text-xs font-bold font-mono text-emerald-400">
                  {topic.title}
                </h4>
                <p className="text-[12px] text-slate-200 leading-normal">
                  {topic.info}
                </p>
                
                {topic.consequence && (
                  <div className="text-[11px] bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    {topic.consequence}
                  </div>
                )}

                {topic.list && (
                  <ul className="list-disc pl-4 flex flex-col gap-1.5 mt-1">
                    {topic.list.map((item, idx) => {
                      const [label, desc] = item.split(': ');
                      return (
                        <li key={idx} className="text-xs text-slate-400 leading-normal">
                          <strong className="text-slate-300 font-medium font-sans">{label}:</strong> {desc}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
            <h5 className="text-[11px] font-bold font-mono text-slate-400 uppercase tracking-wide">
              Pedagogical Insights for the demo
            </h5>
            <ol className="list-decimal pl-4 flex flex-col gap-1 text-[11px] text-slate-500 leading-normal">
              <li>Our algorithm calculates the 3D distances of all skeletal edges and prioritizes **shortest edge lengths** first to protect global surface volume profiles.</li>
              <li>A red colored highlighting beam outlines the current next collapse candidate in the 3D visualizer stage dynamically.</li>
              <li>Toggle **Wireframe** or **Vertices** modes to visually witness the triangles changing density as you adjust the slider.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

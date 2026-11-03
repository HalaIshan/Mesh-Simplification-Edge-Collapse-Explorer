import React, { useRef, useState, useEffect } from 'react';
import { Mesh, Vertex, Face, Edge } from '../types';
import { getCollapseCandidates } from '../simplifier';
import { Play, Pause, RotateCw, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface MeshRendererProps {
  mesh: Mesh;
  showWireframe: boolean;
  showVertices: boolean;
  highlightedFaces: Set<number>;
  onHoverVertex: (vId: number | null) => void;
  onHoverFace: (fId: number | null) => void;
  hoveredVertexId: number | null;
  hoveredFaceId: number | null;
}

export const MeshRenderer: React.FC<MeshRendererProps> = ({
  mesh,
  showWireframe,
  showVertices,
  highlightedFaces,
  onHoverVertex,
  onHoverFace,
  hoveredVertexId,
  hoveredFaceId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rotation parameters
  const [yaw, setYaw] = useState<number>(0.6); // Radians
  const [pitch, setPitch] = useState<number>(-0.4); // Radians
  const [zoom, setZoom] = useState<number>(1.0);
  const [isRotating, setIsRotating] = useState<boolean>(true);

  // Drag interaction states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartAngles = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });

  // Next collapse candidate (for visual highlighting) - calculated on-the-fly dynamically
  const nextEdge = React.useMemo(() => {
    const candidates = getCollapseCandidates(mesh);
    return candidates.length > 0 ? { v1: candidates[0].v1, v2: candidates[0].v2 } : null;
  }, [mesh]);

  // Keep track of dimensions
  const [dimensions, setDimensions] = useState({ width: 500, height: 450 });

  // Update canvas sizing dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: Math.max(height, 350),
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle auto-rotation loop
  useEffect(() => {
    if (!isRotating || isDragging) return;

    let animFrameId: number;
    const tick = () => {
      setYaw((prev) => (prev + 0.006) % (Math.PI * 2));
      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [isRotating, isDragging]);

  // Handlers for mouse drag rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartAngles.current = { yaw, pitch };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Handle drag rotation
    if (isDragging) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      
      // Map pixel delta to rotation angle
      const sensitivity = 0.008;
      const nextYaw = (dragStartAngles.current.yaw + dx * sensitivity) % (Math.PI * 2);
      // Clamp pitch to avoid screen flipping (from -PI/2 to PI/2)
      const nextPitch = Math.max(
        -Math.PI / 2.1,
        Math.min(Math.PI / 2.1, dragStartAngles.current.pitch + dy * sensitivity)
      );

      setYaw(nextYaw);
      setPitch(nextPitch);
      return;
    }

    // 2. Handle interactive hover detection (Vertex & Face under mouse cursor)
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    detectHoverElement(mouseX, mouseY);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch Support for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragStartAngles.current = { yaw, pitch };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStartPos.current.x;
      const dy = e.touches[0].clientY - dragStartPos.current.y;
      const sensitivity = 0.01;
      const nextYaw = (dragStartAngles.current.yaw + dx * sensitivity) % (Math.PI * 2);
      const nextPitch = Math.max(
        -Math.PI / 2.1,
        Math.min(Math.PI / 2.1, dragStartAngles.current.pitch + dy * sensitivity)
      );
      setYaw(nextYaw);
      setPitch(nextPitch);
    }
  };

  // Temporary holder for projecting coordinates used during rendering and hover detection
  const projectedVerticesRef = useRef<{ id: number; px: number; py: number; camZ: number; active: boolean }[]>([]);

  // Projection math
  const getProjectedCoords = () => {
    const { width, height } = dimensions;
    const zoomScale = Math.min(width, height) * 2.8 * zoom;
    const cameraDistance = 6.0; // Put camera at 6.0 looking at the origin

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    return mesh.vertices.map((v) => {
      if (!v.active) {
        return { id: v.id, px: 0, py: 0, camZ: 0, active: false };
      }

      // Step 1: Rotate around Y-axis (Yaw)
      const x1 = v.x * cosY - v.z * sinY;
      const z1 = v.x * sinY + v.z * cosY;
      const y1 = v.y;

      // Step 2: Rotate around X-axis (Pitch)
      const x2 = x1;
      const y2 = y1 * cosP - z1 * sinP;
      const z2 = y1 * sinP + z1 * cosP;

      // Camera coordinates (Perspective Projection)
      const camZ = z2 + cameraDistance;

      // Projection equations
      const px = (x2 * zoomScale) / camZ + width / 2;
      const py = (y2 * zoomScale) / camZ + height / 2;

      return {
        id: v.id,
        px,
        py,
        camZ,
        active: true,
      };
    });
  };

  // Detection logic for hovering elements
  const detectHoverElement = (mx: number, my: number) => {
    const proj = projectedVerticesRef.current;
    if (proj.length === 0) return;

    // 1. Detect Vertex hover (within 8px circle)
    let hoveredVIdx: number | null = null;
    let minVDist = 8; // threshold in pixels

    for (const pv of proj) {
      if (!pv.active) continue;
      const dist = Math.sqrt((pv.px - mx) ** 2 + (pv.py - my) ** 2);
      if (dist < minVDist) {
        minVDist = dist;
        hoveredVIdx = pv.id;
      }
    }

    if (hoveredVIdx !== null) {
      onHoverVertex(hoveredVIdx);
      onHoverFace(null);
      return;
    } else {
      onHoverVertex(null);
    }

    // 2. Detect Face hover (point-in-triangle raycast checking)
    // To do this, we sort faces by average depth, and check intersections.
    // The closest face under mouse cursor is the hovered details!
    const activeFaces = mesh.faces.filter((f) => f.active);
    
    // Sort active faces back to front (just like Painter's algorithm)
    const sortedFaces = activeFaces
      .map((face) => {
        const p1 = proj[face.v1];
        const p2 = proj[face.v2];
        const p3 = proj[face.v3];
        if (!p1 || !p2 || !p3) {
          return { face, avgZ: 999999 };
        }
        const avgZ = (p1.camZ + p2.camZ + p3.camZ) / 3;
        return { face, avgZ };
      })
      .filter((item) => item.avgZ < 999999)
      .sort((a, b) => a.avgZ - b.avgZ); // Ascending avgZ (closest first)

    // Raycast: check if point (mx, my) is inside triangle (p1, p2, p3)
    const isPointInTriangle = (
      px: number, py: number,
      x1: number, y1: number,
      x2: number, y2: number,
      x3: number, y3: number
    ) => {
      const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
      const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
      const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);

      const has_neg = d1 < 0 || d2 < 0 || d3 < 0;
      const has_pos = d1 > 0 || d2 > 0 || d3 > 0;

      return !(has_neg && has_pos);
    };

    let hoveredFIdx: number | null = null;
    for (const item of sortedFaces) {
      const f = item.face;
      const p1 = proj[f.v1];
      const p2 = proj[f.v2];
      const p3 = proj[f.v3];

      if (!p1 || !p2 || !p3) continue;

      if (isPointInTriangle(mx, my, p1.px, p1.py, p2.px, p2.py, p3.px, p3.py)) {
        hoveredFIdx = f.id;
        break; // Closest face gets selection first
      }
    }

    onHoverFace(hoveredFIdx);
  };

  // Main Render Action
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Dynamic clean background
    ctx.fillStyle = '#0a0a0f'; // Dark space/charcoal black
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Calculate projections and keep copy for mouse events mapping
    const proj = getProjectedCoords();
    projectedVerticesRef.current = proj;

    // Sort faces (Painter's algorithm)
    const activeFaces = mesh.faces.filter((f) => f.active);
    const facesWithDepth = activeFaces
      .map((face) => {
        const p1 = proj[face.v1];
        const p2 = proj[face.v2];
        const p3 = proj[face.v3];
        if (!p1 || !p2 || !p3) {
          return { face, avgZ: -999999 };
        }
        const avgZ = (p1.camZ + p2.camZ + p3.camZ) / 3;
        return { face, avgZ };
      })
      .filter((item) => item.avgZ > -999999);

    // Sort to draw furthest faces first (descending average CamZ)
    facesWithDepth.sort((a, b) => b.avgZ - a.avgZ);

    // Light source vector in world space
    const lightVector = { x: 0.8, y: 1.0, z: 0.5 };
    const lenLight = Math.sqrt(lightVector.x ** 2 + lightVector.y ** 2 + lightVector.z ** 2);
    const lv = { x: lightVector.x / lenLight, y: lightVector.y / lenLight, z: lightVector.z / lenLight };

    // Draw faces
    facesWithDepth.forEach(({ face }) => {
      const p1 = proj[face.v1];
      const p2 = proj[face.v2];
      const p3 = proj[face.v3];

      if (!p1 || !p2 || !p3) return;

      // Retrieve original 3D coordinates to calculate flat-shading lighting normals
      const v1 = mesh.vertices[face.v1];
      const v2 = mesh.vertices[face.v2];
      const v3 = mesh.vertices[face.v3];

      if (!v1 || !v2 || !v3) return;

      // Face Vector A (v2 - v1), B (v3 - v1)
      const ax = v2.x - v1.x;
      const ay = v2.y - v1.y;
      const az = v2.z - v1.z;
      const bx = v3.x - v1.x;
      const by = v3.y - v1.y;
      const bz = v3.z - v1.z;

      // Normal vector cross product (A x B)
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const lenN = Math.sqrt(nx * nx + ny * ny + nz * nz);
      
      let intensity = 0.45; // Default ambient lighting
      if (lenN > 0.000001) {
        const nnx = nx / lenN;
        const nny = ny / lenN;
        const nnz = nz / lenN;

        // Simple diffuse Term (Dot product of Normal and Light source)
        const dot = nnx * lv.x + nny * lv.y + nnz * lv.z;
        // Two-sided lighting (helps see inner parts of wireframes or terrains)
        intensity = 0.3 + 0.6 * Math.max(0, dot) + 0.1 * Math.max(0, -dot);
      }

      // Check if face is currently hovered or highlighted
      const isHovered = hoveredFaceId === face.id;
      const isHighlighted = highlightedFaces.has(face.id);

      // Determine face coloring
      let fillColor = '';
      if (isHovered) {
        // Bright amber
        fillColor = `rgba(249, 115, 22, ${0.75 + intensity * 0.25})`;
      } else if (isHighlighted) {
        // Vibrant neon purple for visual tracking during collapses
        fillColor = `rgba(168, 85, 247, ${0.65 + intensity * 0.3})`;
      } else {
        // High visibility bright material color
        // Saturated, clear and luminous teal/cyan HSL
        const brightness = Math.round(40 + intensity * 35);
        fillColor = `hsl(194, 85%, ${brightness}%)`;
      }

      // Draw filled paths
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.lineTo(p3.px, p3.py);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Draw wireframes
      if (showWireframe) {
        ctx.lineWidth = isHovered ? 2.0 : 1.0;
        ctx.strokeStyle = isHovered
          ? 'rgba(251, 191, 36, 1.0)' // Amber yellow
          : isHighlighted
          ? 'rgba(224, 204, 250, 1.0)'
          : 'rgba(255, 255, 255, 0.55)'; // High-contrast clean white wire overlay
        ctx.stroke();
      }
    });

    // Highlight the "Next Edge Collapse Candidate" in bright blinking/neon coral
    if (nextEdge) {
      const p1 = proj[nextEdge.v1];
      const p2 = proj[nextEdge.v2];

      if (p1 && p2 && p1.active && p2.active) {
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineWidth = 4.0;
        ctx.strokeStyle = '#ef4444'; // Glowing bright red
        ctx.stroke();

        // Pulsing radial aura at edge points
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p1.px, p1.py, 5.5, 0, 2 * Math.PI);
        ctx.arc(p2.px, p2.py, 5.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw active vertices as points
    if (showVertices) {
      proj.forEach((pv) => {
        if (!pv.active) return;

        const isHovered = hoveredVertexId === pv.id;
        const size = isHovered ? 6 : Math.max(2.0, 5.0 / (pv.camZ * 0.45));
        
        ctx.beginPath();
        ctx.arc(pv.px, pv.py, size, 0, 2 * Math.PI);

        if (isHovered) {
          ctx.fillStyle = '#f0abfc'; // Pink hover
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (nextEdge && (pv.id === nextEdge.v1 || pv.id === nextEdge.v2)) {
          ctx.fillStyle = '#f87171'; // Coral vertices
        } else {
          ctx.fillStyle = '#38bdf8'; // Cyan dot
        }
        ctx.fill();
      });
    }

    // Draw Hover Overlays (Text info labels rendered directly in 3D space!)
    if (hoveredVertexId !== null) {
      const pv = proj[hoveredVertexId];
      if (pv && pv.active) {
        const vNode = mesh.vertices[hoveredVertexId];
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; // Deep Slate
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        
        const text = `ID: v${vNode.id} [${vNode.x.toFixed(2)}, ${vNode.y.toFixed(2)}, ${vNode.z.toFixed(2)}]`;
        ctx.font = '500 11px font-mono, Courier New';
        const txtWidth = ctx.measureText(text).width;

        // Draw bubble with standard safety rect path to avoid modern browser roundRect crash
        ctx.beginPath();
        ctx.rect(pv.px + 10, pv.py - 25, txtWidth + 14, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(text, pv.px + 17, pv.py - 11);
      }
    }

    // Draw Hover Overlays (Text info labels rendered directly in 3D space!)
    if (hoveredFaceId !== null) {
      const fNode = mesh.faces[hoveredFaceId];
      if (fNode && fNode.active) {
        const p1 = proj[fNode.v1];
        const p2 = proj[fNode.v2];
        const p3 = proj[fNode.v3];

        if (p1 && p2 && p3) {
          const cx = (p1.px + p2.px + p3.px) / 3;
          const cy = (p1.py + p2.py + p3.py) / 3;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; // Deep Slate
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;

          const text = `Face: f${fNode.id} (v${fNode.v1}, v${fNode.v2}, v${fNode.v3})`;
          ctx.font = '500 11px font-mono, Courier New';
          const txtWidth = ctx.measureText(text).width;

          ctx.beginPath();
          ctx.rect(cx + 10, cy - 20, txtWidth + 14, 20);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fde047';
          ctx.fillText(text, cx + 17, cy - 6);
        }
      }
    }
  }, [dimensions, mesh, yaw, pitch, zoom, showWireframe, showVertices, hoveredVertexId, hoveredFaceId, highlightedFaces, nextEdge]);

  // Adjust zoom controls
  const increaseZoom = () => setZoom(z => Math.min(2.0, z + 0.15));
  const decreaseZoom = () => setZoom(z => Math.max(0.4, z - 0.15));
  const resetCamera = () => {
    setYaw(0.6);
    setPitch(-0.4);
    setZoom(1.0);
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-[#0d0d11] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden" ref={containerRef}>
      {/* 3D Render Canvas */}
      <canvas
        id="cg-mesh-canvas"
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUpOrLeave}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Embedded Render Overlays */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-slate-950/74 backdrop-blur-md px-3 py-1 rounded-md border border-slate-800 text-xs text-slate-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Camera Yaw: {yaw.toFixed(2)} rad | Pitch: {pitch.toFixed(2)} rad
        </div>
        {nextEdge && (
          <div className="flex items-center gap-1.5 bg-red-950/42 backdrop-blur-md px-3 py-1 rounded-md border border-red-900/60 text-xs text-red-200 font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            Shortest Edge: v{nextEdge.v1} - v{nextEdge.v2} (Next Collapse Target)
          </div>
        )}
      </div>

      {/* Bottom Floating Control Panel */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/80 backdrop-blur-lg border border-slate-800/80 px-4 py-2.5 rounded-xl shadow-2xl select-none scale-90 sm:scale-100">
        <button
          id="btn-rotate-toggle"
          onClick={() => setIsRotating(!isRotating)}
          className={`flex items-center justify-center p-2 rounded-lg text-slate-300 transition-colors ${
            isRotating ? 'bg-indigo-600/25 border border-indigo-500/40 text-indigo-300' : 'hover:bg-slate-800 border border-transparent'
          }`}
          title={isRotating ? "Pause Orbit" : "Play Orbit"}
        >
          {isRotating ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <span className="w-px h-5 bg-slate-800" />

        <button
          id="btn-zoom-in"
          onClick={increaseZoom}
          className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-850 text-slate-300 border border-transparent transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>

        <button
          id="btn-zoom-out"
          onClick={decreaseZoom}
          className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-850 text-slate-300 border border-transparent transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <button
          id="btn-reset-cam"
          onClick={resetCamera}
          className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-850 text-slate-300 border border-transparent transition-colors"
          title="Reset Camera Angle"
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </div>
  );
};

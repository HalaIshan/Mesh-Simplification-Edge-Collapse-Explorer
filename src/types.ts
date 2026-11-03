export interface Vertex {
  id: number;
  x: number;
  y: number;
  z: number;
  ox: number; // original coordinates
  oy: number;
  oz: number;
  active: boolean;
}

export interface Face {
  id: number;
  v1: number; // vertex index 1
  v2: number; // vertex index 2
  v3: number; // vertex index 3
  active: boolean;
}

export interface Edge {
  id: number;
  v1: number; // vertex index A (v1 < v2)
  v2: number; // vertex index B
  active: boolean;
}

export interface Mesh {
  vertices: Vertex[];
  faces: Face[];
  edges: Edge[];
}

export interface CollapseSnapshot {
  stepIndex: number;
  meshState: Mesh;
  collapsedEdge: { v1: number; v2: number } | null;
  activeVertexCount: number;
  activeEdgeCount: number;
  activeFaceCount: number;
  description: string;
}

export type MeshType = 'sphere' | 'torus' | 'terrain' | 'cylinder';

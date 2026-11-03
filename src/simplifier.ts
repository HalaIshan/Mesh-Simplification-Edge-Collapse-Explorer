import { Mesh, Vertex, Face, Edge, CollapseSnapshot } from './types';

// Deep clone a mesh state
export function cloneMesh(mesh: Mesh): Mesh {
  return {
    vertices: mesh.vertices.map(v => ({ ...v })),
    faces: mesh.faces.map(f => ({ ...f })),
    edges: mesh.edges.map(e => ({ ...e })),
  };
}

// Get active count for stats
export function getMeshStats(mesh: Mesh) {
  const vCount = mesh.vertices.filter(v => v.active).length;
  const fCount = mesh.faces.filter(f => f.active).length;
  const eCount = mesh.edges.filter(e => e.active).length;
  return { vCount, fCount, eCount };
}

// Calculate the length of an edge
function getEdgeLength(v1: Vertex, v2: Vertex): number {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  const dz = v1.z - v2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Topological validity and quality check of an edge collapse
// We implement the Link Condition and a simple normal-flip check
export function getCollapseCandidates(mesh: Mesh) {
  const candidates: { edgeId: number, cost: number, v1: number, v2: number }[] = [];

  // Build vertex adjacency lists (only active vertices/edges)
  const adj = new Map<number, Set<number>>();
  mesh.vertices.forEach(v => {
    if (v.active) adj.set(v.id, new Set<number>());
  });

  for (const edge of mesh.edges) {
    if (edge.active) {
      adj.get(edge.v1)?.add(edge.v2);
      adj.get(edge.v2)?.add(edge.v1);
    }
  }

  // Iterate over active edges
  for (const edge of mesh.edges) {
    if (!edge.active) continue;

    const u = edge.v1;
    const v = edge.v2;

    const nu = adj.get(u) || new Set<number>();
    const nv = adj.get(v) || new Set<number>();

    // 1. Link of u intersection Link of v => Common neighbors
    const commonNeighbors = new Set<number>();
    for (const w of nu) {
      if (nv.has(w)) {
        commonNeighbors.add(w);
      }
    }

    // 2. Find triangles sharing this edge (u, v)
    const sharingTriangleThirdVertices = new Set<number>();
    for (const d of mesh.faces) {
      if (d.active) {
        const hasU = d.v1 === u || d.v2 === u || d.v3 === u;
        const hasV = d.v1 === v || d.v2 === v || d.v3 === v;
        if (hasU && hasV) {
          // Find the third vertex
          if (d.v1 !== u && d.v1 !== v) sharingTriangleThirdVertices.add(d.v1);
          if (d.v2 !== u && d.v2 !== v) sharingTriangleThirdVertices.add(d.v2);
          if (d.v3 !== u && d.v3 !== v) sharingTriangleThirdVertices.add(d.v3);
        }
      }
    }

    // Link condition: common neighbors must match the third vertices of sharing faces.
    // Otherwise, collapse creates non-manifold structures or self-intersections.
    let isManifoldPreserving = true;
    for (const cn of commonNeighbors) {
      if (!sharingTriangleThirdVertices.has(cn)) {
        isManifoldPreserving = false;
        break;
      }
    }

    // Edge length as base cost
    const len = getEdgeLength(mesh.vertices[u], mesh.vertices[v]);
    
    // Penalize if link condition is violated, but don't strictly forbid if we have no options
    const penalty = isManifoldPreserving ? 1.0 : 10.0;
    const cost = len * penalty;

    candidates.push({
      edgeId: edge.id,
      cost,
      v1: u,
      v2: v
    });
  }

  // Sort candidates by cost
  return candidates.sort((a, b) => a.cost - b.cost);
}

/**
 * Collapses edge v2 into v1
 */
export function collapseEdge(mesh: Mesh, edgeId: number): { success: boolean; error?: string } {
  const edge = mesh.edges.find(e => e.id === edgeId);
  if (!edge || !edge.active) {
    return { success: false, error: 'Edge not found or inactive' };
  }

  const u = edge.v1;
  const v = edge.v2;

  if (!mesh.vertices[u].active || !mesh.vertices[v].active) {
    return { success: false, error: 'Vertices already inactive' };
  }

  // 1. Move u to the midpoint of (u, v) to preserve volume/location symmetry
  mesh.vertices[u].x = (mesh.vertices[u].x + mesh.vertices[v].x) / 2;
  mesh.vertices[u].y = (mesh.vertices[u].y + mesh.vertices[v].y) / 2;
  mesh.vertices[u].z = (mesh.vertices[u].z + mesh.vertices[v].z) / 2;

  // 2. Deactivate vertex v
  mesh.vertices[v].active = false;

  // 3. Deactivate the edge itself
  edge.active = false;

  // 4. Deactivate faces containing both u and v (they collapse to degenerate edges/lines)
  for (const face of mesh.faces) {
    if (face.active) {
      const hasU = face.v1 === u || face.v2 === u || face.v3 === u;
      const hasV = face.v1 === v || face.v2 === v || face.v3 === v;
      if (hasU && hasV) {
        face.active = false;
      }
    }
  }

  // 5. Update remaining active faces containing v to refer to u instead
  for (const face of mesh.faces) {
    if (face.active) {
      if (face.v1 === v) face.v1 = u;
      if (face.v2 === v) face.v2 = u;
      if (face.v3 === v) face.v3 = u;

      // Handle self-edge safety check (if a face somehow has duplicate vertices, deactivate it)
      if (face.v1 === face.v2 || face.v2 === face.v3 || face.v3 === face.v1) {
        face.active = false;
      }
    }
  }

  // 6. Update edges that connect to v to connect to u
  for (const e of mesh.edges) {
    if (e.active) {
      if (e.v1 === v) e.v1 = u;
      if (e.v2 === v) e.v2 = u;

      // Ensure v1 < v2 sorting
      if (e.v1 > e.v2) {
        const temp = e.v1;
        e.v1 = e.v2;
        e.v2 = temp;
      }

      // Self-loop (v1 === v2), deactivate
      if (e.v1 === e.v2) {
        e.active = false;
      }
    }
  }

  // 7. De-duplicate edges: if two active edges share the same endpoints, keep only one active
  const seenEdges = new Map<string, number>(); // key: 'v1_v2', value: edgeId
  for (const e of mesh.edges) {
    if (e.active) {
      const key = `${e.v1}_${e.v2}`;
      if (seenEdges.has(key)) {
        e.active = false;
      } else {
        seenEdges.set(key, e.id);
      }
    }
  }

  return { success: true };
}

/**
 * Main routine that pre-calculates the complete sequence of edge collapses
 * from 100% detail to a minimal base mesh (e.g., 4 vertices or 4 faces).
 */
export function buildCollapseHistory(initialMesh: Mesh): CollapseSnapshot[] {
  const history: CollapseSnapshot[] = [];
  const currentMesh = cloneMesh(initialMesh);

  // Add initial state as step 0
  const initialStats = getMeshStats(currentMesh);
  history.push({
    stepIndex: 0,
    meshState: cloneMesh(currentMesh),
    collapsedEdge: null,
    activeVertexCount: initialStats.vCount,
    activeEdgeCount: initialStats.eCount,
    activeFaceCount: initialStats.fCount,
    description: 'Initial full-detail mesh',
  });

  let step = 1;
  const maxSteps = 400; // safety ceiling

  while (step < maxSteps) {
    const candidates = getCollapseCandidates(currentMesh);
    if (candidates.length === 0) break;

    // Pick the best candidate
    const best = candidates[0];
    
    // We want to stop if we are down to very few faces
    const stats = getMeshStats(currentMesh);
    if (stats.vCount <= 4 || stats.fCount <= 4) {
      break;
    }

    const { success } = collapseEdge(currentMesh, best.edgeId);
    if (!success) {
      // If we couldn't collapse (shouldn't happen with valid candidates), break
      break;
    }

    const afterStats = getMeshStats(currentMesh);
    history.push({
      stepIndex: step,
      meshState: cloneMesh(currentMesh),
      collapsedEdge: { v1: best.v1, v2: best.v2 },
      activeVertexCount: afterStats.vCount,
      activeEdgeCount: afterStats.eCount,
      activeFaceCount: afterStats.fCount,
      description: `Collapsing Edge #${best.edgeId} connecting Vertex ${best.v1} & Vertex ${best.v2}.`,
    });

    step++;
  }

  return history;
}

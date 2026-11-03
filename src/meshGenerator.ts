import { Mesh, Vertex, Face, Edge, MeshType } from './types';

// Helper to construct edges from faces
export function buildEdgesFromFaces(verticesCount: number, faces: Face[]): Edge[] {
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  let edgeId = 0;

  for (const face of faces) {
    const pairs = [
      [face.v1, face.v2],
      [face.v2, face.v3],
      [face.v3, face.v1],
    ];

    for (const [a, b] of pairs) {
      const v1 = Math.min(a, b);
      const v2 = Math.max(a, b);
      const key = `${v1}_${v2}`;

      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          id: edgeId++,
          v1,
          v2,
          active: true,
        });
      }
    }
  }

  return edges;
}

// 1. Sphere Generator (Icosahedron subdivided 0, 1, or 2 levels)
export function generateSphere(detail: 'high' | 'medium' | 'low' = 'high'): Mesh {
  const t = (1.0 + Math.sqrt(5.0)) / 2.0;

  // Let's define the 12 base icosahedron vertices
  const baseCoords = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
  ];

  let rawVertices = baseCoords.map(([x, y, z]) => {
    const len = Math.sqrt(x * x + y * y + z * z);
    // scale to radius 0.65 for display
    const scale = 0.65;
    return [ (x / len) * scale, (y / len) * scale, (z / len) * scale ];
  });

  let rawFaces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  // Perform Subdivision up to specified levels
  const subdivisions = detail === 'high' ? 2 : detail === 'medium' ? 1 : 0;
  for (let s = 0; s < subdivisions; s++) {
    const newFaces: number[][] = [];
    const midpointCache = new Map<string, number>();

    const getMidpoint = (p1: number, p2: number): number => {
      const v1 = Math.min(p1, p2);
      const v2 = Math.max(p1, p2);
      const key = `${v1}_${v2}`;
      
      if (midpointCache.has(key)) {
        return midpointCache.get(key)!;
      }

      const c1 = rawVertices[p1];
      const c2 = rawVertices[p2];
      const mx = (c1[0] + c2[0]) / 2;
      const my = (c1[1] + c2[1]) / 2;
      const mz = (c1[2] + c2[2]) / 2;

      // Project back to sphere
      const len = Math.sqrt(mx * mx + my * my + mz * mz);
      const scale = 0.65;
      const nx = (mx / len) * scale;
      const ny = (my / len) * scale;
      const nz = (mz / len) * scale;

      rawVertices.push([nx, ny, nz]);
      const newIdx = rawVertices.length - 1;
      midpointCache.set(key, newIdx);
      return newIdx;
    };

    for (const face of rawFaces) {
      const a = face[0];
      const b = face[1];
      const c = face[2];

      const mab = getMidpoint(a, b);
      const mbc = getMidpoint(b, c);
      const mca = getMidpoint(c, a);

      newFaces.push([a, mab, mca]);
      newFaces.push([b, mbc, mab]);
      newFaces.push([c, mca, mbc]);
      newFaces.push([mab, mbc, mca]);
    }

    rawFaces = newFaces;
  }

  // Create proper Vertex and Face lists
  const vertices: Vertex[] = rawVertices.map((coords, index) => ({
    id: index,
    x: coords[0],
    y: coords[1],
    z: coords[2],
    ox: coords[0],
    oy: coords[1],
    oz: coords[2],
    active: true,
  }));

  const faces: Face[] = rawFaces.map((f, index) => ({
    id: index,
    v1: f[0],
    v2: f[1],
    v3: f[2],
    active: true,
  }));

  const edges = buildEdgesFromFaces(vertices.length, faces);

  return { vertices, faces, edges };
}

// 2. Torus Generator
export function generateTorus(detail: 'high' | 'medium' | 'low' = 'high'): Mesh {
  const R = 0.55; // Major radius
  const r = 0.22; // Minor radius
  const radialSegments = detail === 'high' ? 16 : detail === 'medium' ? 10 : 6;
  const tubularSegments = detail === 'high' ? 16 : detail === 'medium' ? 10 : 6;

  const vertices: Vertex[] = [];
  const faces: Face[] = [];
  let vId = 0;

  for (let i = 0; i < radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let j = 0; j < tubularSegments; j++) {
      const v = (j / tubularSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const x = (R + r * cosV) * cosU;
      const y = r * sinV;
      const z = (R + r * cosV) * sinU;

      vertices.push({
        id: vId++,
        x,
        y,
        z,
        ox: x,
        oy: y,
        oz: z,
        active: true,
      });
    }
  }

  let fId = 0;
  for (let i = 0; i < radialSegments; i++) {
    const nextI = (i + 1) % radialSegments;

    for (let j = 0; j < tubularSegments; j++) {
      const nextJ = (j + 1) % tubularSegments;

      const v00 = i * tubularSegments + j;
      const v10 = nextI * tubularSegments + j;
      const v01 = i * tubularSegments + nextJ;
      const v11 = nextI * tubularSegments + nextJ;

      // Triangle 1
      faces.push({
        id: fId++,
        v1: v00,
        v2: v01,
        v3: v10,
        active: true,
      });

      // Triangle 2
      faces.push({
        id: fId++,
        v1: v10,
        v2: v01,
        v3: v11,
        active: true,
      });
    }
  }

  const edges = buildEdgesFromFaces(vertices.length, faces);

  return { vertices, faces, edges };
}

// 3. Terrain Grid Generator
export function generateTerrain(detail: 'high' | 'medium' | 'low' = 'high'): Mesh {
  const gridCount = detail === 'high' ? 14 : detail === 'medium' ? 8 : 4;
  const vertices: Vertex[] = [];
  const faces: Face[] = [];
  let vId = 0;

  // Generate grid vertices
  for (let r = 0; r < gridCount; r++) {
    const z = -0.65 + (r / (gridCount - 1)) * 1.3;

    for (let c = 0; c < gridCount; c++) {
      const x = -0.65 + (c / (gridCount - 1)) * 1.3;

      // Height function: mountain peak in the center + wavy features
      const dist = Math.sqrt(x * x + z * z);
      const height = 0.38 * Math.cos(4.0 * dist) * Math.exp(-2.2 * dist * dist) + 0.05 * Math.sin(6 * x) * Math.cos(6 * z);

      vertices.push({
        id: vId++,
        x,
        y: height,
        z,
        ox: x,
        oy: height,
        oz: z,
        active: true,
      });
    }
  }

  // Generate grid indices
  let fId = 0;
  for (let r = 0; r < gridCount - 1; r++) {
    for (let c = 0; c < gridCount - 1; c++) {
      const v00 = r * gridCount + c;
      const v01 = r * gridCount + (c + 1);
      const v10 = (r + 1) * gridCount + c;
      const v11 = (r + 1) * gridCount + (c + 1);

      // Triangle 1
      faces.push({
        id: fId++,
        v1: v00,
        v2: v01,
        v3: v10,
        active: true,
      });

      // Triangle 2
      faces.push({
        id: fId++,
        v1: v10,
        v2: v01,
        v3: v11,
        active: true,
      });
    }
  }

  const edges = buildEdgesFromFaces(vertices.length, faces);

  return { vertices, faces, edges };
}

// 4. Cylinder Generator
export function generateCylinder(detail: 'high' | 'medium' | 'low' = 'high'): Mesh {
  const sectors = detail === 'high' ? 20 : detail === 'medium' ? 10 : 5;
  const radius = 0.35;
  const halfHeight = 0.45;

  const vertices: Vertex[] = [];
  const faces: Face[] = [];
  let vId = 0;

  // 1. Bottom Cap Center
  const bottomCenterId = vId++;
  vertices.push({
    id: bottomCenterId,
    x: 0,
    y: -halfHeight,
    z: 0,
    ox: 0,
    oy: -halfHeight,
    oz: 0,
    active: true,
  });

  // 2. Bottom Ring Vertices
  const bottomRingStart = vId;
  for (let i = 0; i < sectors; i++) {
    const theta = (i / sectors) * Math.PI * 2;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    vertices.push({
      id: vId++,
      x,
      y: -halfHeight,
      z,
      ox: x,
      oy: -halfHeight,
      oz: z,
      active: true,
    });
  }

  // 3. Top Ring Vertices
  const topRingStart = vId;
  for (let i = 0; i < sectors; i++) {
    const theta = (i / sectors) * Math.PI * 2;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    vertices.push({
      id: vId++,
      x,
      y: halfHeight,
      z,
      ox: x,
      oy: halfHeight,
      oz: z,
      active: true,
    });
  }

  // 4. Top Cap Center
  const topCenterId = vId++;
  vertices.push({
    id: topCenterId,
    x: 0,
    y: halfHeight,
    z: 0,
    ox: 0,
    oy: halfHeight,
    oz: 0,
    active: true,
  });

  let fId = 0;

  // Let's build Bottom Cap Faces (clockwise)
  for (let i = 0; i < sectors; i++) {
    const nextI = (i + 1) % sectors;
    const vCurr = bottomRingStart + i;
    const vNext = bottomRingStart + nextI;

    faces.push({
      id: fId++,
      v1: bottomCenterId,
      v2: vNext,
      v3: vCurr,
      active: true,
    });
  }

  // Let's build Top Cap Faces (counter-clockwise)
  for (let i = 0; i < sectors; i++) {
    const nextI = (i + 1) % sectors;
    const vCurr = topRingStart + i;
    const vNext = topRingStart + nextI;

    faces.push({
      id: fId++,
      v1: topCenterId,
      v2: vCurr,
      v3: vNext,
      active: true,
    });
  }

  // Let's build Side Faces
  for (let i = 0; i < sectors; i++) {
    const nextI = (i + 1) % sectors;

    const bCurr = bottomRingStart + i;
    const bNext = bottomRingStart + nextI;
    const tCurr = topRingStart + i;
    const tNext = topRingStart + nextI;

    faces.push({
      id: fId++,
      v1: bCurr,
      v2: bNext,
      v3: tCurr,
      active: true,
    });

    faces.push({
      id: fId++,
      v1: bNext,
      v2: tNext,
      v3: tCurr,
      active: true,
    });
  }

  const edges = buildEdgesFromFaces(vertices.length, faces);

  return { vertices, faces, edges };
}

// Main Selector
export function generateMesh(type: MeshType, detail: 'high' | 'medium' | 'low' = 'high'): Mesh {
  switch (type) {
    case 'sphere':
      return generateSphere(detail);
    case 'torus':
      return generateTorus(detail);
    case 'terrain':
      return generateTerrain(detail);
    case 'cylinder':
      return generateCylinder(detail);
  }
}

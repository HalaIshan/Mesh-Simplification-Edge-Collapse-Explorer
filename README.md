# 3D Mesh Simplification Lab

An interactive 3D explorer for understanding how triangle meshes are built – and what happens to them when they are simplified. Switch between detail levels and watch the vertex, edge, and face counts change live, together with the **Euler characteristic**.

**[▶ Try the live demo](https://mesh-simplification-edge-collapse-explorer-567315771351.europe-west2.run.app)**

Made for the **Computer Graphics** course at the University of Haifa (2026) and shared with the class on the course Discord. This demo was built with Google AI Studio.

## Features

- **4 shapes:** sphere, torus, mountain grid, and cylinder
- **3 levels of detail** with a slider: high detail, medium detail, and low poly
- **Live mesh statistics:** vertex, edge, and face (triangle) counts
- **Euler characteristic (χ = V − E + F)** calculated live – it stays the same for a shape at every level of detail (for example, χ = 2 for a sphere), showing that it depends only on the shape's topology
- **Next collapse target:** highlights the shortest edge – the one an edge-collapse simplification would remove next
- Toggle wireframe lines and vertex points, and rotate the camera

## Under the Hood

[`src/simplifier.ts`](src/simplifier.ts) contains an **edge-collapse** implementation: it ranks edges by length and checks each collapse with the **link condition** and a **normal-flip test**, so that simplifying the mesh does not break its topology or flip faces.

## Running Locally

Requires Node.js.

    npm install
    npm run dev

## Tech Stack

React · TypeScript · Vite · Tailwind CSS

---

Developed by **Hala Ishan** · Computer Graphics, University of Haifa

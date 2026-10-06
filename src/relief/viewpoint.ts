import type { Rng } from "../model/generate";
import { EXAGGERATION, FOV, eyeElevation, type Viewpoint } from "./render3d";
import { GRID_NODES, directionHeading, nodePosition } from "./grid";
import { MAP_SIZE, heightAt, type Landform, type Terrain } from "./terrain";

/** Poids d'un repère visible selon sa nature : les grandes formes comptent le plus. */
const LANDMARK_WEIGHT: Record<Landform["kind"], number> = {
  hill: 3,
  ridge: 1.5,
  valley: 1,
  reentrant: 0.8,
  knoll: 0.6,
  depression: 0.3,
};

function angleDiff(a: number, b: number): number {
  const d =
    ((((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return Math.abs(d);
}

/** Direction (0 = nord, sens horaire) du point (x2, y2) vu depuis (x1, y1). */
export function headingTo(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.atan2(x2 - x1, -(y2 - y1));
}

/** Vrai si le point cible est visible depuis l'œil (pas de relief entre les deux). */
function visible(
  t: Terrain,
  v: Viewpoint,
  x: number,
  y: number,
  targetZ: number,
): boolean {
  const eyeZ = eyeElevation(t, v.x, v.y);
  const steps = 40;
  for (let s = 1; s < steps; s++) {
    const f = s / steps;
    const z = eyeZ + (targetZ - eyeZ) * f;
    if (heightAt(t, v.x + (x - v.x) * f, v.y + (y - v.y) * f) * EXAGGERATION > z)
      return false;
  }
  return true;
}

/**
 * Note la lisibilité d'un point de vue : repères marquants dans le champ, visibles et
 * à bonne distance, horizon dégagé et varié.
 */
function score(t: Terrain, v: Viewpoint): number {
  let landmarks = 0;
  let hills = 0;
  for (const l of t.landforms) {
    const d = Math.hypot(l.x - v.x, l.y - v.y);
    if (d < 70 || d > 600) continue;
    if (angleDiff(headingTo(v.x, v.y, l.x, l.y), v.heading) > FOV * 0.42)
      continue;
    // Pour un creux, on vérifie qu'on en voit le fond ; pour une bosse, le sommet.
    const z = (heightAt(t, l.x, l.y) + (l.amplitude > 0 ? 1 : 0.5)) * EXAGGERATION;
    if (!visible(t, v, l.x, l.y, z)) continue;
    landmarks += LANDMARK_WEIGHT[l.kind];
    if (l.kind === "hill") hills++;
  }
  if (hills === 0) return 0;

  // Horizon : angle d'élévation maximal par rayon, et distance à laquelle il est atteint.
  const eyeZ = eyeElevation(t, v.x, v.y);
  const rays = 15;
  const elevations: number[] = [];
  let blocked = 0;
  for (let r = 0; r < rays; r++) {
    const a = v.heading + FOV * (r / (rays - 1) - 0.5);
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    let best = -Infinity;
    let bestDistance = 0;
    for (let d = 10; d < 700; d += 10) {
      const e = (heightAt(t, v.x + dx * d, v.y + dy * d) * EXAGGERATION - eyeZ) / d;
      if (e > best) {
        best = e;
        bestDistance = d;
      }
    }
    elevations.push(best);
    if (bestDistance < 60) blocked++;
  }
  // Un regard collé à une pente ne montre rien.
  if (blocked > rays / 3) return 0;
  const mean = elevations.reduce((a, b) => a + b, 0) / rays;
  const spread = Math.sqrt(
    elevations.reduce((a, b) => a + (b - mean) ** 2, 0) / rays,
  );

  return landmarks + Math.min(2, spread * 40);
}

/** Choisit un point de vue lisible parmi les nœuds de la grille et les huit directions. */
export function pickViewpoint(t: Terrain, rng: Rng = Math.random): Viewpoint {
  const candidates: { v: Viewpoint; score: number }[] = [];
  for (let col = 0; col < GRID_NODES; col++) {
    for (let row = 0; row < GRID_NODES; row++) {
      for (let direction = 0; direction < 8; direction++) {
        const v: Viewpoint = {
          ...nodePosition(col, row),
          heading: directionHeading(direction),
        };
        // Regarder vers l'extérieur de la carte montrerait surtout la marge non cartographiée.
        const ahead = 250;
        const ax = v.x + Math.sin(v.heading) * ahead;
        const ay = v.y - Math.cos(v.heading) * ahead;
        if (ax < 0 || ax > MAP_SIZE || ay < 0 || ay > MAP_SIZE) continue;
        candidates.push({ v, score: score(t, v) });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  // Un tirage parmi les meilleurs, pour ne pas toujours viser la même colline.
  const top = candidates.slice(
    0,
    Math.max(1, Math.ceil(candidates.length * 0.08)),
  );
  return top[Math.floor(rng() * top.length)].v;
}

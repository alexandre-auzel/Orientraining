import type { Rng } from "../model/generate";

/** Côté de la zone cartographiée, en mètres. */
export const MAP_SIZE = 900;
/** Terrain généré autour de la carte, pour que la vue 3D ne s'arrête pas net au bord. */
export const MARGIN = 300;
/** Pas de la grille d'altitudes, en mètres. */
export const CELL = 5;
/** Équidistance des courbes, en mètres. */
export const CONTOUR_INTERVAL = 5;
/** Une courbe sur cinq est maîtresse. */
export const INDEX_EVERY = 5;

export type LandformKind =
  | "hill"
  | "knoll"
  | "ridge"
  | "valley"
  | "reentrant"
  | "depression";

/** Forme de relief posée par le générateur. Sert aussi à choisir un point de vue lisible. */
export interface Landform {
  kind: LandformKind;
  /** Centre (ou sommet), en mètres dans le repère de la carte. */
  x: number;
  y: number;
  /** Hauteur (positive) ou profondeur (négative), en mètres. */
  amplitude: number;
}

/**
 * Grille d'altitudes couvrant la carte et sa marge.
 * Repère de la carte : x vers l'est, y vers le sud, origine au coin nord-ouest de la carte.
 */
export interface Terrain {
  /** Nombre d'échantillons par côté. */
  n: number;
  heights: Float32Array;
  landforms: readonly Landform[];
  minHeight: number;
  maxHeight: number;
}

type HeightFn = (x: number, y: number) => number;

function range(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Bosse elliptique orientée. */
function ellipticBump(
  cx: number,
  cy: number,
  amplitude: number,
  sigmaMajor: number,
  sigmaMinor: number,
  angle: number,
): HeightFn {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const u = (dx * c + dy * s) / sigmaMajor;
    const v = (-dx * s + dy * c) / sigmaMinor;
    return amplitude * Math.exp(-0.5 * (u * u + v * v));
  };
}

/** Relief allongé le long d'un segment (croupe ou vallon), qui s'amenuise vers une extrémité. */
function linearFeature(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amplitude: number,
  width: number,
): HeightFn {
  const lx = x2 - x1;
  const ly = y2 - y1;
  const len2 = lx * lx + ly * ly;
  return (x, y) => {
    const t = Math.max(0, Math.min(1, ((x - x1) * lx + (y - y1) * ly) / len2));
    const px = x1 + t * lx - x;
    const py = y1 + t * ly - y;
    const d2 = (px * px + py * py) / (width * width);
    // Pleine hauteur côté (x1, y1), moitié à l'autre bout : la forme a un sens.
    return amplitude * (1 - 0.5 * t) * Math.exp(-0.5 * d2);
  };
}

/**
 * Rentrant : sillon creusé dans un versant, de `(x1, y1)` (vers le sommet) à `(x2, y2)`
 * (vers le pied). Nul aux deux bouts, il ne crée pas de cuvette fermée.
 */
function gully(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  depth: number,
  width: number,
): HeightFn {
  const lx = x2 - x1;
  const ly = y2 - y1;
  const len2 = lx * lx + ly * ly;
  return (x, y) => {
    const t = ((x - x1) * lx + (y - y1) * ly) / len2;
    if (t <= 0 || t >= 1) return 0;
    const px = x1 + t * lx - x;
    const py = y1 + t * ly - y;
    const d2 = (px * px + py * py) / (width * width);
    // Plus marqué aux deux tiers de la descente, comme un vrai rentrant.
    const profile = Math.sin(Math.PI * t ** 0.8);
    return -depth * profile * Math.exp(-0.5 * d2);
  };
}

/** Bruit de valeur lissé, pour casser la régularité des formes. */
function valueNoise(rng: Rng, scale: number, amplitude: number): HeightFn {
  const size = 64;
  const lattice = Float32Array.from(
    { length: size * size },
    () => rng() * 2 - 1,
  );
  const at = (i: number, j: number) =>
    lattice[(((j % size) + size) % size) * size + (((i % size) + size) % size)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / scale;
    const fy = y / scale;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const tx = smooth(fx - i);
    const ty = smooth(fy - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * tx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
    return amplitude * (a + (b - a) * ty);
  };
}

/** Tire un point dans la carte, à distance minimale des centres déjà posés. */
function placePoint(
  rng: Rng,
  taken: { x: number; y: number }[],
  minDistance: number,
  inset: number,
): { x: number; y: number } {
  let best = { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
  let bestDistance = -1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const p = {
      x: range(rng, inset, MAP_SIZE - inset),
      y: range(rng, inset, MAP_SIZE - inset),
    };
    const d = Math.min(
      Infinity,
      ...taken.map((q) => Math.hypot(p.x - q.x, p.y - q.y)),
    );
    if (d >= minDistance) return p;
    if (d > bestDistance) {
      best = p;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * Génère un terrain de quelques formes franches et distinctes (collines de tailles
 * différentes, croupe, rentrants, vallon, cuvettes, buttes), sur fond légèrement incliné.
 * Peu de bruit : chaque forme doit rester reconnaissable sur la carte comme en 3D.
 */
export function generateTerrain(rng: Rng = Math.random): Terrain {
  const parts: HeightFn[] = [];
  const landforms: Landform[] = [];
  const taken: { x: number; y: number }[] = [];

  // Pente générale douce.
  const tiltAngle = range(rng, 0, 2 * Math.PI);
  const tilt = range(rng, 0.01, 0.02);
  parts.push(
    (x, y) =>
      tilt *
      ((x - MAP_SIZE / 2) * Math.cos(tiltAngle) +
        (y - MAP_SIZE / 2) * Math.sin(tiltAngle)),
  );

  // Collines : hauteurs bien différenciées pour qu'on distingue la grande de la petite.
  const hillCount = 2 + Math.floor(rng() * 2);
  const hillHeights = [
    range(rng, 35, 45),
    range(rng, 22, 30),
    range(rng, 14, 20),
  ];
  const hills: {
    x: number;
    y: number;
    amplitude: number;
    sigmaMajor: number;
    sigmaMinor: number;
    angle: number;
    /** Directions déjà occupées sur le versant (croupe, rentrants). */
    taken: number[];
  }[] = [];
  for (let i = 0; i < hillCount; i++) {
    const p = placePoint(rng, taken, 260, 110);
    taken.push(p);
    const amplitude = hillHeights[i];
    const sigmaMajor = range(rng, 70, 120);
    const sigmaMinor = sigmaMajor * range(rng, 0.45, 0.85);
    const angle = range(rng, 0, Math.PI);
    parts.push(
      ellipticBump(p.x, p.y, amplitude, sigmaMajor, sigmaMinor, angle),
    );
    hills.push({ ...p, amplitude, sigmaMajor, sigmaMinor, angle, taken: [] });
    landforms.push({ kind: "hill", x: p.x, y: p.y, amplitude });
  }

  // Une terrasse qui part d'une colline.
  {
    const from = hills[Math.floor(rng() * hills.length)];
    const angle = range(rng, 0, 2 * Math.PI);
    from.taken.push(angle);
    const length = range(rng, 180, 280);
    const x2 = from.x + Math.cos(angle) * length;
    const y2 = from.y + Math.sin(angle) * length;
    const amplitude = range(rng, 10, 16);
    parts.push(
      linearFeature(from.x, from.y, x2, y2, amplitude, range(rng, 30, 45)),
    );
    landforms.push({
      kind: "ridge",
      x: (from.x + x2) / 2,
      y: (from.y + y2) / 2,
      amplitude,
    });
  }

  // Rentrants sur les versants : pas systématiques, une colline sur deux en moyenne,
  // et la plus haute peut en avoir un second.
  hills.forEach((hill, i) => {
    const count = rng() < 0.5 ? 0 : i === 0 && rng() < 0.3 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      let direction = range(rng, 0, 2 * Math.PI);
      for (let attempt = 0; attempt < 20; attempt++) {
        const free = hill.taken.every(
          (a) => Math.abs(Math.atan2(Math.sin(direction - a), Math.cos(direction - a))) > Math.PI / 3,
        );
        if (free) break;
        direction = range(rng, 0, 2 * Math.PI);
      }
      hill.taken.push(direction);
      // Rayon de l'ellipse de la colline dans cette direction.
      const rel = direction - hill.angle;
      const radius =
        1 /
        Math.hypot(Math.cos(rel) / hill.sigmaMajor, Math.sin(rel) / hill.sigmaMinor);
      const dx = Math.cos(direction);
      const dy = Math.sin(direction);
      const x1 = hill.x + dx * radius * 0.25;
      const y1 = hill.y + dy * radius * 0.25;
      const x2 = hill.x + dx * radius * 2;
      const y2 = hill.y + dy * radius * 2;
      const depth = Math.max(5, hill.amplitude * range(rng, 0.3, 0.38));
      parts.push(gully(x1, y1, x2, y2, depth, Math.max(12, radius * range(rng, 0.17, 0.22))));
      const center = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
      taken.push(center);
      landforms.push({ kind: "reentrant", ...center, amplitude: -depth });
    }
  });

  // Un vallon.
  {
    const p = placePoint(rng, taken, 180, 120);
    taken.push(p);
    const angle = range(rng, 0, 2 * Math.PI);
    const length = range(rng, 200, 320);
    const amplitude = -range(rng, 8, 14);
    parts.push(
      linearFeature(
        p.x - (Math.cos(angle) * length) / 2,
        p.y - (Math.sin(angle) * length) / 2,
        p.x + (Math.cos(angle) * length) / 2,
        p.y + (Math.sin(angle) * length) / 2,
        amplitude,
        range(rng, 28, 40),
      ),
    );
    landforms.push({ kind: "valley", x: p.x, y: p.y, amplitude });
  }

  // Cuvettes et buttes : petits repères ponctuels.
  const depressionCount = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < depressionCount; i++) {
    const p = placePoint(rng, taken, 140, 80);
    taken.push(p);
    const amplitude = -range(rng, 6, 9);
    const sigma = range(rng, 22, 32);
    parts.push(
      ellipticBump(
        p.x,
        p.y,
        amplitude,
        sigma,
        sigma * range(rng, 0.7, 1),
        range(rng, 0, Math.PI),
      ),
    );
    landforms.push({ kind: "depression", x: p.x, y: p.y, amplitude });
  }
  const knollCount = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < knollCount; i++) {
    const p = placePoint(rng, taken, 120, 60);
    taken.push(p);
    const amplitude = range(rng, 6, 10);
    const sigma = range(rng, 20, 30);
    parts.push(
      ellipticBump(
        p.x,
        p.y,
        amplitude,
        sigma,
        sigma * range(rng, 0.6, 1),
        range(rng, 0, Math.PI),
      ),
    );
    landforms.push({ kind: "knoll", x: p.x, y: p.y, amplitude });
  }

  parts.push(valueNoise(rng, 140, 3), valueNoise(rng, 55, 0.8));

  const n = Math.round((MAP_SIZE + 2 * MARGIN) / CELL) + 1;
  const heights = new Float32Array(n * n);
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = i * CELL - MARGIN;
      const y = j * CELL - MARGIN;
      let h = 100;
      for (const f of parts) h += f(x, y);
      heights[j * n + i] = h;
      if (x >= 0 && x <= MAP_SIZE && y >= 0 && y <= MAP_SIZE) {
        minHeight = Math.min(minHeight, h);
        maxHeight = Math.max(maxHeight, h);
      }
    }
  }
  return { n, heights, landforms, minHeight, maxHeight };
}

/** Altitude interpolée au point (x, y) du repère de la carte. */
export function heightAt(t: Terrain, x: number, y: number): number {
  return sampleGrid(t.n, t.heights, x, y);
}

/** Interpolation bilinéaire d'une grille alignée sur celle des altitudes. */
export function sampleGrid(
  n: number,
  grid: Float32Array,
  x: number,
  y: number,
): number {
  const fx = Math.max(0, Math.min(n - 1.001, (x + MARGIN) / CELL));
  const fy = Math.max(0, Math.min(n - 1.001, (y + MARGIN) / CELL));
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const tx = fx - i;
  const ty = fy - j;
  const k = j * n + i;
  const a = grid[k] + (grid[k + 1] - grid[k]) * tx;
  const b = grid[k + n] + (grid[k + n + 1] - grid[k + n]) * tx;
  return a + (b - a) * ty;
}

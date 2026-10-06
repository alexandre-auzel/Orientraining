import type { Rng } from "../model/generate";
import {
  CELL,
  CONTOUR_INTERVAL,
  INDEX_EVERY,
  MARGIN,
  heightAt,
  sampleGrid,
  type Terrain,
} from "./terrain";

/** Point de vue : position sur la carte, direction du regard (0 = nord, sens horaire). */
export interface Viewpoint {
  x: number;
  y: number;
  heading: number;
}

export const FOV = (70 * Math.PI) / 180;
/** Hauteur de l'œil au-dessus du sol, en mètres. */
export const EYE_HEIGHT = 8;
/**
 * Exagération verticale de la vue 3D. À l'échelle réelle, 40 m de dénivelé sur un
 * kilomètre paraissent presque plats ; on accentue pour que les formes se lisent.
 */
export const EXAGGERATION = 1;
const MAX_DISTANCE = 900;

export interface RenderOptions {
  /** Dessine les courbes de niveau sur le terrain. */
  contours: boolean;
}

type Rgb = [number, number, number];

const SKY_TOP: Rgb = [110, 160, 215];
const SKY_HORIZON: Rgb = [205, 220, 232];
const GROUND: Rgb = [140, 175, 90];
const CONTOUR: Rgb = [160, 85, 25];
const CREST: Rgb = [45, 60, 30];

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/**
 * Soleil fixe d'une manche, tiré au hasard : il ne donne aucune indication sur le nord.
 * Bas sur l'horizon pour que les creux et les versants à contre-jour se lisent.
 */
export interface Sun {
  /** 0 = nord, sens horaire. */
  azimuth: number;
  elevation: number;
}

export function randomSun(rng: Rng = Math.random): Sun {
  return {
    azimuth: rng() * 2 * Math.PI,
    elevation: ((18 + rng() * 17) * Math.PI) / 180,
  };
}

/** Luminosité (0 à 1) de chaque nœud de la grille, ombres portées comprises. */
export type Lighting = Float32Array;

const AMBIENT = 0.32;

export function computeLighting(t: Terrain, sun: Sun): Lighting {
  const { n } = t;
  const lighting = new Float32Array(n * n);
  const sx = Math.sin(sun.azimuth);
  const sy = -Math.cos(sun.azimuth);
  const cosE = Math.cos(sun.elevation);
  const light: [number, number, number] = [sx * cosE, sy * cosE, Math.sin(sun.elevation)];
  const rise = Math.tan(sun.elevation);
  const k = EXAGGERATION / (2 * CELL);
  const h = t.heights;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const at = (a: number, b: number) =>
        h[Math.min(n - 1, Math.max(0, b)) * n + Math.min(n - 1, Math.max(0, a))];
      const gx = (at(i + 1, j) - at(i - 1, j)) * k;
      const gy = (at(i, j + 1) - at(i, j - 1)) * k;
      const [nx, ny, nz] = normalize([-gx, -gy, 1]);
      const lambert = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);

      // Ombre portée : on remonte vers le soleil, la pénombre adoucit le bord.
      const x = i * CELL - MARGIN;
      const y = j * CELL - MARGIN;
      const z0 = h[j * n + i] * EXAGGERATION;
      let excess = 0;
      if (lambert > 0) {
        for (let d = CELL; d < 450; d += d < 60 ? CELL : 2 * CELL) {
          const over = heightAt(t, x + sx * d, y + sy * d) * EXAGGERATION - (z0 + d * rise);
          if (over > excess) excess = over;
          if (excess > 4) break;
        }
      }
      const lit = Math.max(0, 1 - excess / 4);
      lighting[j * n + i] = AMBIENT + (1 - AMBIENT) * lambert * lit;
    }
  }
  return lighting;
}

/** Altitude de l'œil dans l'espace exagéré de la vue 3D. */
export function eyeElevation(t: Terrain, x: number, y: number): number {
  return heightAt(t, x, y) * EXAGGERATION + EYE_HEIGHT;
}

/**
 * Rendu en perspective du terrain (lancer de rayons par colonne d'écran).
 */
export function renderView(
  t: Terrain,
  lighting: Lighting,
  view: Viewpoint,
  width: number,
  height: number,
  options: RenderOptions,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const horizon = height * 0.36;
  const focal = width / 2 / Math.tan(FOV / 2);
  const eyeZ = eyeElevation(t, view.x, view.y);

  // Repère caméra dans le plan de la carte (y vers le sud).
  const fx = Math.sin(view.heading);
  const fy = -Math.cos(view.heading);
  const rx = Math.cos(view.heading);
  const ry = Math.sin(view.heading);

  const put = (x: number, y: number, c: Rgb) => {
    const k = (y * width + x) * 4;
    pixels[k] = c[0];
    pixels[k + 1] = c[1];
    pixels[k + 2] = c[2];
    pixels[k + 3] = 255;
  };

  for (let y = 0; y < height; y++) {
    const s = Math.max(0, Math.min(1, y / horizon));
    const sky = mix(SKY_TOP, SKY_HORIZON, s * s);
    for (let x = 0; x < width; x++) put(x, y, sky);
  }

  const tanHalf = Math.tan(FOV / 2);
  for (let x = 0; x < width; x++) {
    const u = ((2 * (x + 0.5)) / width - 1) * tanHalf;
    const dx = fx + rx * u;
    const dy = fy + ry * u;
    // Longueur réelle parcourue par unité de profondeur, pour le brouillard.
    const stretch = Math.hypot(dx, dy);
    let top = height; // Plus haute ligne déjà peinte dans cette colonne.
    let lastVisibleDistance = 0;
    let previousHeight = heightAt(t, view.x + dx, view.y + dy);
    // Courbe franchie mais pas encore dessinée (pas trop fin pour couvrir un pixel).
    let pendingContour: number | null = null;
    let dz = 0.2;
    for (let z = 1; z < MAX_DISTANCE; z += dz, dz *= 1.004) {
      const px = view.x + dx * z;
      const py = view.y + dy * z;
      const h = heightAt(t, px, py);
      const level = Math.floor(Math.max(h, previousHeight) / CONTOUR_INTERVAL);
      if (
        level !== Math.floor(Math.min(h, previousHeight) / CONTOUR_INTERVAL)
      ) {
        pendingContour = level;
      }
      previousHeight = h;

      const screenY = Math.floor(
        horizon + ((eyeZ - h * EXAGGERATION) / z) * focal,
      );
      if (screenY >= top) continue;

      const distance = z * stretch;
      const f = 1.25 * sampleGrid(t.n, lighting, px, py);
      let color: Rgb = [GROUND[0] * f, GROUND[1] * f, GROUND[2] * f];
      if (options.contours && pendingContour !== null && distance < 500) {
        const strength = pendingContour % INDEX_EVERY === 0 ? 0.95 : 0.75;
        color = mix(color, CONTOUR, strength * (1 - distance / 500));
      }
      pendingContour = null;
      const fog = Math.min(0.75, Math.max(0, (distance - 120) / 900));
      color = mix(color, SKY_HORIZON, fog);

      const from = Math.max(0, screenY);
      for (let y = from; y < top; y++) put(x, y, color);

      // Ligne de crête : trait sombre quand un relief lointain réapparaît derrière un plus proche.
      if (
        lastVisibleDistance > 0 &&
        top < height &&
        distance - lastVisibleDistance > Math.max(20, lastVisibleDistance * 0.3)
      ) {
        const edge = mix(color, CREST, 0.6 * (1 - fog));
        put(x, top, edge);
        if (top + 1 < height && lastVisibleDistance < 200)
          put(x, top + 1, edge);
      }
      lastVisibleDistance = distance;
      top = from;
      if (top === 0) break;
    }
  }
  return pixels;
}

function normalize(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

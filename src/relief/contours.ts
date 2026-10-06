import {
  CELL,
  CONTOUR_INTERVAL,
  INDEX_EVERY,
  MAP_SIZE,
  MARGIN,
  heightAt,
  type Terrain,
} from "./terrain";

/** Segment de courbe de niveau, en mètres dans le repère de la carte. */
export interface ContourSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Numéro de la courbe (altitude / équidistance). */
  level: number;
  /** Courbe maîtresse. */
  index: boolean;
}

/** Courbes de niveau de la zone cartographiée, par marching squares. */
export function contourSegments(t: Terrain): ContourSegment[] {
  const segments: ContourSegment[] = [];
  const first = Math.round(MARGIN / CELL);
  const last = first + Math.round(MAP_SIZE / CELL);
  const h = (i: number, j: number) => t.heights[j * t.n + i];
  const lowLevel = Math.ceil(t.minHeight / CONTOUR_INTERVAL);
  const highLevel = Math.floor(t.maxHeight / CONTOUR_INTERVAL);

  for (let j = first; j < last; j++) {
    for (let i = first; i < last; i++) {
      // Coins dans l'ordre : nord-ouest, nord-est, sud-est, sud-ouest.
      const corners = [h(i, j), h(i + 1, j), h(i + 1, j + 1), h(i, j + 1)];
      const cellMin = Math.min(...corners);
      const cellMax = Math.max(...corners);
      const x0 = i * CELL - MARGIN;
      const y0 = j * CELL - MARGIN;
      const cornerXY = [
        [x0, y0],
        [x0 + CELL, y0],
        [x0 + CELL, y0 + CELL],
        [x0, y0 + CELL],
      ];
      for (
        let level = Math.max(lowLevel, Math.ceil(cellMin / CONTOUR_INTERVAL));
        level <= Math.min(highLevel, Math.floor(cellMax / CONTOUR_INTERVAL));
        level++
      ) {
        const z = level * CONTOUR_INTERVAL;
        // Points de passage sur les arêtes où l'altitude franchit z.
        const crossings: [number, number][] = [];
        for (let e = 0; e < 4; e++) {
          const a = corners[e];
          const b = corners[(e + 1) % 4];
          if (a < z !== b < z) {
            const s = (z - a) / (b - a);
            const [ax, ay] = cornerXY[e];
            const [bx, by] = cornerXY[(e + 1) % 4];
            crossings.push([ax + (bx - ax) * s, ay + (by - ay) * s]);
          }
        }
        const index = level % INDEX_EVERY === 0;
        for (let k = 0; k + 1 < crossings.length; k += 2) {
          const [x1, y1] = crossings[k];
          const [x2, y2] = crossings[k + 1];
          segments.push({ x1, y1, x2, y2, level, index });
        }
      }
    }
  }
  return segments;
}

/** Tiret de pente, en mètres dans le repère de la carte. */
export interface SlopeTick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const TICK_LENGTH = 9;

/**
 * Tirets de pente sur la courbe la plus basse de chaque cuvette, orientés vers le fond :
 * sans eux, une cuvette ne se distingue pas d'une butte.
 */
export function depressionTicks(
  t: Terrain,
  segments: readonly ContourSegment[],
): SlopeTick[] {
  const ticks: SlopeTick[] = [];
  for (const d of t.landforms) {
    if (d.kind !== "depression") continue;
    const near = segments.filter(
      (s) => Math.hypot((s.x1 + s.x2) / 2 - d.x, (s.y1 + s.y2) / 2 - d.y) < 60,
    );
    if (near.length === 0) continue;
    const lowest = Math.min(...near.map((s) => s.level));
    const ring = near.filter((s) => s.level === lowest);
    for (let k = 0; k < 4; k++) {
      const target = (k * Math.PI) / 2 + Math.PI / 4;
      let best: ContourSegment | undefined;
      let bestGap = Infinity;
      for (const s of ring) {
        const a = Math.atan2((s.y1 + s.y2) / 2 - d.y, (s.x1 + s.x2) / 2 - d.x);
        const gap = Math.abs(Math.atan2(Math.sin(a - target), Math.cos(a - target)));
        if (gap < bestGap) {
          best = s;
          bestGap = gap;
        }
      }
      if (!best || bestGap > Math.PI / 4) continue;
      const mx = (best.x1 + best.x2) / 2;
      const my = (best.y1 + best.y2) / 2;
      const r = Math.hypot(d.x - mx, d.y - my);
      if (r < TICK_LENGTH * 1.5) continue;
      ticks.push({
        x1: mx,
        y1: my,
        x2: mx + ((d.x - mx) / r) * TICK_LENGTH,
        y2: my + ((d.y - my) / r) * TICK_LENGTH,
      });
    }
  }
  return ticks;
}

/** Cote d'altitude posée sur une courbe, lisible en montant la pente. */
export interface ContourLabel {
  x: number;
  y: number;
  /** Rotation du texte, en radians, dans le repère de la carte. */
  angle: number;
  text: string;
}

/** Une ligne plus courte n'a pas la place pour un chiffre (il la recouvrirait). */
const MIN_LINE_LENGTH = 50;
/** Une cote de plus par tranche de cette longueur. */
const LABEL_EVERY = 350;
const LABEL_MIN_GAP = 30;
/** Deux cotes identiques plus proches que ça seraient redondantes. */
const SAME_LEVEL_GAP = 90;
const LABEL_INSET = 12;

type Point = [number, number];

/** Relie les segments de même niveau qui se touchent en lignes continues. */
function chainSegments(segments: readonly ContourSegment[]): {
  level: number;
  points: Point[];
}[] {
  const key = (level: number, x: number, y: number) =>
    `${level}:${Math.round(x * 100)}:${Math.round(y * 100)}`;
  const byEnd = new Map<string, number[]>();
  segments.forEach((s, i) => {
    for (const k of [key(s.level, s.x1, s.y1), key(s.level, s.x2, s.y2)]) {
      const list = byEnd.get(k);
      if (list) list.push(i);
      else byEnd.set(k, [i]);
    }
  });
  const used = new Uint8Array(segments.length);

  // Prolonge la ligne depuis `from` tant qu'un segment libre y est accroché.
  const extend = (level: number, from: Point, out: Point[]) => {
    let [x, y] = from;
    for (;;) {
      const next = byEnd.get(key(level, x, y))?.find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = 1;
      const s = segments[next];
      const sameStart = key(level, s.x1, s.y1) === key(level, x, y);
      [x, y] = sameStart ? [s.x2, s.y2] : [s.x1, s.y1];
      out.push([x, y]);
    }
  };

  const lines: { level: number; points: Point[] }[] = [];
  segments.forEach((s, i) => {
    if (used[i]) return;
    used[i] = 1;
    const forward: Point[] = [];
    const backward: Point[] = [];
    extend(s.level, [s.x2, s.y2], forward);
    extend(s.level, [s.x1, s.y1], backward);
    lines.push({
      level: s.level,
      points: [...backward.reverse(), [s.x1, s.y1], [s.x2, s.y2], ...forward],
    });
  });
  return lines;
}

/**
 * Cote chaque ligne de niveau au moins une fois (plusieurs fois si elle est longue),
 * à l'endroit où la pente est la plus douce pour que le chiffre ne recouvre pas les voisines.
 */
export function contourLabels(
  t: Terrain,
  segments: readonly ContourSegment[],
): ContourLabel[] {
  const labels: ContourLabel[] = [];
  const slopeAt = (x: number, y: number) => {
    const gx = (heightAt(t, x + 3, y) - heightAt(t, x - 3, y)) / 6;
    const gy = (heightAt(t, x, y + 3) - heightAt(t, x, y - 3)) / 6;
    return { gx, gy, slope: Math.hypot(gx, gy) };
  };

  for (const line of chainSegments(segments)) {
    const { points } = line;
    // Abscisse curviligne au milieu de chaque segment de la ligne.
    const along: number[] = [];
    let length = 0;
    for (let k = 0; k + 1 < points.length; k++) {
      const step = Math.hypot(
        points[k + 1][0] - points[k][0],
        points[k + 1][1] - points[k][1],
      );
      along.push(length + step / 2);
      length += step;
    }
    if (length < MIN_LINE_LENGTH) continue;

    const count = Math.max(1, Math.floor(length / LABEL_EVERY));
    for (let c = 0; c < count; c++) {
      const lo = (c / count) * length;
      const hi = ((c + 1) / count) * length;
      let best: { k: number; score: number } | undefined;
      for (let k = 0; k < along.length; k++) {
        if (along[k] < lo || along[k] > hi) continue;
        const [x1, y1] = points[k];
        const [x2, y2] = points[k + 1];
        const x = (x1 + x2) / 2;
        const y = (y1 + y2) / 2;
        const inside =
          x > LABEL_INSET &&
          y > LABEL_INSET &&
          x < MAP_SIZE - LABEL_INSET &&
          y < MAP_SIZE - LABEL_INSET;
        if (!inside) continue;
        const text = String(line.level * CONTOUR_INTERVAL);
        const crowded = labels.some((l) => {
          const d = Math.hypot(l.x - x, l.y - y);
          return d < LABEL_MIN_GAP || (l.text === text && d < SAME_LEVEL_GAP);
        });
        if (crowded) continue;
        const score = slopeAt(x, y).slope;
        if (!best || score < best.score) best = { k, score };
      }
      if (!best) continue;
      const [x1, y1] = points[best.k];
      const [x2, y2] = points[best.k + 1];
      const x = (x1 + x2) / 2;
      const y = (y1 + y2) / 2;
      const { gx, gy } = slopeAt(x, y);
      // Orientation prise sur quelques segments : un seul fait 5 m, le chiffre en couvre ~25.
      const [ax, ay] = points[Math.max(0, best.k - 2)];
      const [bx, by] = points[Math.min(points.length - 1, best.k + 3)];
      let angle = Math.atan2(by - ay, bx - ax);
      // Le haut du texte, (sin, -cos) après rotation, doit pointer vers l'amont.
      if (Math.sin(angle) * gx - Math.cos(angle) * gy < 0) angle += Math.PI;
      labels.push({
        x,
        y,
        angle,
        text: String(line.level * CONTOUR_INTERVAL),
      });
    }
  }
  return labels;
}

import {
  GRID_NODES,
  columnName,
  directionHeading,
  nearestDirection,
  nodePosition,
  rowName,
  type Cell,
} from "./grid";
import { FOV } from "./render3d";
import type { Round } from "./round";
import { MAP_SIZE } from "./terrain";

const BROWN = "#b8732e";
/** Les lignes verticales de la grille servent aussi de lignes du nord. */
const GRID_LINES = "#3d8fd6";
const GUESS = "#b0189e";
const TRUTH = "#d62828";

export interface MapMarks {
  guess?: Cell;
  /** Affichée après validation. */
  truth?: Required<Cell>;
  /** Les huit flèches de choix de direction autour du nœud de la réponse. */
  arrows?: { hover?: number };
}

/** Rayons, en pixels, entre lesquels sont dessinées et cliquables les flèches. */
const ARROW_INNER = 12;
const ARROW_OUTER = 40;

/**
 * Direction de la flèche sous le point (px, py), en pixels du canvas, autour du nœud :
 * `undefined` si le point est hors de la couronne des flèches.
 */
export function arrowAt(
  size: number,
  node: Cell,
  px: number,
  py: number,
): number | undefined {
  const s = size / MAP_SIZE;
  const { x, y } = nodePosition(node.col, node.row);
  const dx = px - x * s;
  const dy = py - y * s;
  const d = Math.hypot(dx, dy);
  if (d < ARROW_INNER - 4 || d > ARROW_OUTER + 8) return undefined;
  return nearestDirection(Math.atan2(dx, -dy));
}

/** Dessine la carte sur un canvas de `size` pixels CSS de côté. */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  size: number,
  round: Round,
  marks: MapMarks,
) {
  const s = size / MAP_SIZE;
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = "round";

  drawGridLines(ctx, size, s);

  ctx.strokeStyle = BROWN;
  for (const index of [false, true]) {
    ctx.lineWidth = index ? 2 : 1.1;
    ctx.beginPath();
    for (const c of round.contours) {
      if (c.index !== index) continue;
      ctx.moveTo(c.x1 * s, c.y1 * s);
      ctx.lineTo(c.x2 * s, c.y2 * s);
    }
    ctx.stroke();
  }
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (const t of round.ticks) {
    ctx.moveTo(t.x1 * s, t.y1 * s);
    ctx.lineTo(t.x2 * s, t.y2 * s);
  }
  ctx.stroke();

  // Cotes d'altitude, sur un fond blanc qui interrompt la courbe.
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const l of round.labels) {
    ctx.save();
    ctx.translate(l.x * s, l.y * s);
    ctx.rotate(l.angle);
    const w = ctx.measureText(l.text).width;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-w / 2 - 2, -6, w + 4, 12);
    ctx.fillStyle = BROWN;
    ctx.fillText(l.text, 0, 0.5);
    ctx.restore();
  }

  drawGridLabels(ctx, size, s);

  if (marks.truth && marks.guess) {
    const a = nodePosition(marks.guess.col, marks.guess.row);
    const b = nodePosition(marks.truth.col, marks.truth.row);
    ctx.strokeStyle = "#555";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x * s, a.y * s);
    ctx.lineTo(b.x * s, b.y * s);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (marks.guess) drawViewMark(ctx, s, marks.guess, GUESS);
  if (marks.guess && marks.arrows) drawArrows(ctx, s, marks.guess, marks.arrows.hover);
  if (marks.truth) drawViewMark(ctx, s, marks.truth, TRUTH);
  ctx.restore();
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  size: number,
  s: number,
) {
  ctx.strokeStyle = GRID_LINES;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = 0; k < GRID_NODES; k++) {
    const { x, y } = nodePosition(k, k);
    ctx.moveTo(x * s, 0);
    ctx.lineTo(x * s, size);
    ctx.moveTo(0, y * s);
    ctx.lineTo(size, y * s);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Lettres en haut et en bas, chiffres à gauche et à droite, dans la marge de la grille. */
function drawGridLabels(
  ctx: CanvasRenderingContext2D,
  size: number,
  s: number,
) {
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = GRID_LINES;
  const edge = 11;
  const label = (text: string, x: number, y: number) => {
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };
  for (let k = 0; k < GRID_NODES; k++) {
    const { x, y } = nodePosition(k, k);
    label(columnName(k), x * s, edge);
    label(columnName(k), x * s, size - edge);
    label(rowName(k), edge, y * s);
    label(rowName(k), size - edge, y * s);
  }
}

function drawArrows(
  ctx: CanvasRenderingContext2D,
  s: number,
  node: Cell,
  hover: number | undefined,
) {
  const { x, y } = nodePosition(node.col, node.row);
  const cx = x * s;
  const cy = y * s;
  for (let direction = 0; direction < 8; direction++) {
    const a = directionHeading(direction);
    const ux = Math.sin(a);
    const uy = -Math.cos(a);
    const tipX = cx + ux * ARROW_OUTER;
    const tipY = cy + uy * ARROW_OUTER;
    const head = 9;
    const shaft = () => {
      ctx.beginPath();
      ctx.moveTo(cx + ux * ARROW_INNER, cy + uy * ARROW_INNER);
      ctx.lineTo(tipX - ux * head, tipY - uy * head);
      ctx.stroke();
    };
    const tip = () => {
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - ux * head - uy * 5, tipY - uy * head + ux * 5);
      ctx.lineTo(tipX - ux * head + uy * 5, tipY - uy * head - ux * 5);
      ctx.closePath();
    };
    const selected = direction === node.direction;
    const color = selected ? GUESS : direction === hover ? "#333" : "#888";
    // Halo blanc pour détacher la flèche des courbes.
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 6;
    shaft();
    tip();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = selected || direction === hover ? 3 : 2;
    shaft();
    tip();
    ctx.fill();
  }
}

/** Cercle de position et, si la direction est connue, le champ de vision. */
function drawViewMark(
  ctx: CanvasRenderingContext2D,
  s: number,
  mark: Cell,
  color: string,
) {
  const { x, y } = nodePosition(mark.col, mark.row);
  const cx = x * s;
  const cy = y * s;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (mark.direction !== undefined) {
    const heading = directionHeading(mark.direction);
    const reach = 90;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (const side of [-1, 1]) {
      const a = heading + (side * FOV) / 2;
      ctx.lineTo(cx + Math.sin(a) * reach, cy - Math.cos(a) * reach);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.sin(heading) * reach,
      cy - Math.cos(heading) * reach,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
  ctx.stroke();
}

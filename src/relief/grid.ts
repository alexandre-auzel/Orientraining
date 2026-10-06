import { MAP_SIZE } from "./terrain";

/** Nœuds par côté : colonnes A à I (ouest → est), lignes 1 à 9 (nord → sud). */
export const GRID_NODES = 9;
/** Écart entre deux nœuds, en mètres. */
export const GRID_SPACING = 100;
/** Distance du premier nœud au bord de la carte. */
export const GRID_OFFSET = (MAP_SIZE - (GRID_NODES - 1) * GRID_SPACING) / 2;

/** Les huit directions, dans le sens horaire depuis le nord. */
export const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"] as const;

/** Nœud de la grille, avec éventuellement une des huit directions (0 = nord). */
export interface Cell {
  col: number;
  row: number;
  direction?: number;
}

export function nodePosition(
  col: number,
  row: number,
): { x: number; y: number } {
  return {
    x: GRID_OFFSET + col * GRID_SPACING,
    y: GRID_OFFSET + row * GRID_SPACING,
  };
}

/** Nœud le plus proche d'un point de la carte. */
export function nearestNode(x: number, y: number): Cell {
  const clamp = (v: number) =>
    Math.max(
      0,
      Math.min(GRID_NODES - 1, Math.round((v - GRID_OFFSET) / GRID_SPACING)),
    );
  return { col: clamp(x), row: clamp(y) };
}

export function columnName(col: number): string {
  return String.fromCharCode(65 + col);
}

export function rowName(row: number): string {
  return String(row + 1);
}

/** « C4 », « C4 · NE ». */
export function cellName(cell: Cell): string {
  const node = columnName(cell.col) + rowName(cell.row);
  return cell.direction === undefined
    ? node
    : `${node} · ${DIRECTIONS[cell.direction]}`;
}

/** Cap en radians (0 = nord, sens horaire) d'une des huit directions. */
export function directionHeading(direction: number): number {
  return (direction * Math.PI) / 4;
}

/** Direction la plus proche d'un cap. */
export function nearestDirection(heading: number): number {
  return ((Math.round(heading / (Math.PI / 4)) % 8) + 8) % 8;
}

/** Nombre de crans de 45° entre deux directions (0 à 4). */
export function directionSteps(a: number, b: number): number {
  const d = (((a - b) % 8) + 8) % 8;
  return Math.min(d, 8 - d);
}

/**
 * Distance de Chebyshev entre deux nœuds, en cases : un pas droit ou en diagonale
 * vaut 1, comme les déplacements du roi aux échecs.
 */
export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

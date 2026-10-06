import type { Rng } from "../model/generate";
import {
  contourLabels,
  contourSegments,
  depressionTicks,
  type ContourLabel,
  type ContourSegment,
  type SlopeTick,
} from "./contours";
import {
  computeLighting,
  randomSun,
  type Lighting,
  type Sun,
  type Viewpoint,
} from "./render3d";
import {
  directionSteps,
  chebyshev,
  nearestDirection,
  nearestNode,
  type Cell,
} from "./grid";
import { generateTerrain, type Terrain } from "./terrain";
import { pickViewpoint } from "./viewpoint";

export const ROUNDS_PER_GAME = 5;
/**
 * Réussite : sur le bon nœud ou un de ses huit voisins (distance de Chebyshev ≤ 1),
 * et, en normal, la bonne direction.
 */
export const MAX_STEPS_OK = 1;

/** Part des points de position selon la distance de Chebyshev (0, 1, 2 cases…). */
const POSITION_SCALE = [1, 0.7, 0.35];
/** Part des points de direction selon l'écart (0, 45°, 90°…). */
const DIRECTION_SCALE = [1, 0.4];

/** Facile : la boussole donne la direction, seule la position compte. */
export type Mode = "easy" | "normal";

export interface Round {
  terrain: Terrain;
  sun: Sun;
  lighting: Lighting;
  contours: ContourSegment[];
  ticks: SlopeTick[];
  labels: ContourLabel[];
  truth: Viewpoint;
  /** Le nœud et la direction de la vraie vue. */
  answer: Required<Cell>;
}

/** Réponse du joueur ; la direction est absente tant qu'il ne l'a pas indiquée. */
export type Guess = Cell;

export interface GuessResult {
  /** Écart de position, en cases (distance de Chebyshev). */
  steps: number;
  /** Écart de direction, en crans de 45° (0 à 4). */
  directionSteps: number;
  points: number;
  success: boolean;
}

export function newRound(rng: Rng = Math.random): Round {
  const terrain = generateTerrain(rng);
  const contours = contourSegments(terrain);
  const sun = randomSun(rng);
  const truth = pickViewpoint(terrain, rng);
  return {
    terrain,
    sun,
    lighting: computeLighting(terrain, sun),
    contours,
    ticks: depressionTicks(terrain, contours),
    labels: contourLabels(terrain, contours),
    truth,
    answer: {
      ...nearestNode(truth.x, truth.y),
      direction: nearestDirection(truth.heading),
    },
  };
}

export function evaluate(
  answer: Required<Cell>,
  guess: Required<Guess>,
  mode: Mode,
): GuessResult {
  const steps = chebyshev(guess, answer);
  const position = POSITION_SCALE[steps] ?? 0;
  if (mode === "easy") {
    return {
      steps,
      directionSteps: 0,
      points: Math.round(100 * position),
      success: steps <= MAX_STEPS_OK,
    };
  }
  const turn = directionSteps(guess.direction, answer.direction);
  const direction = DIRECTION_SCALE[turn] ?? 0;
  return {
    steps,
    directionSteps: turn,
    points: Math.round(50 * position + 50 * direction),
    success: steps <= MAX_STEPS_OK && turn === 0,
  };
}

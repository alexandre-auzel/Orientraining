import { Direction, FeatureId, ModifierId, VariantKind } from "./enums";
import type { Rng } from "./generate";
import { getModifier } from "./rules";
import type { AbstractDescription } from "./types";

/** Une case de la grille, une fois les variants tirés. */
export interface ResolvedCell {
  id: FeatureId | ModifierId;
  direction?: Direction;
  values?: readonly number[];
}

/** Description prête à afficher, une entrée par colonne C à G. */
export interface ResolvedDescription {
  which?: ResolvedCell;
  feature: ResolvedCell;
  /** Colonne E : apparence, ou second élément si F ou G est d'arité 2. */
  appearanceOrSecond?: ResolvedCell;
  dimension?: ResolvedCell;
  location?: ResolvedCell;
}

const DIRECTIONS = Object.values(Direction);

/** Plages de valeurs par symbole numérique, en mètres. */
const NUMBER_RANGES: Partial<
  Record<ModifierId, readonly [min: number, max: number, step: number][]>
> = {
  [ModifierId.HeightOrDepth]: [[0.5, 4, 0.5]],
  [ModifierId.Size]: [
    [2, 15, 1],
    [2, 8, 1],
  ],
  [ModifierId.HeightOnSlope]: [
    [0.5, 2, 0.5],
    [2, 5, 0.5],
  ],
  [ModifierId.HeightsTwoFeatures]: [
    [0.5, 3, 0.5],
    [0.5, 3, 0.5],
  ],
};

function pickNumber(
  [min, max, step]: readonly [number, number, number],
  rng: Rng,
): number {
  const steps = Math.round((max - min) / step);
  return min + Math.floor(rng() * (steps + 1)) * step;
}

function resolveModifier(id: ModifierId, rng: Rng): ResolvedCell {
  const { variant } = getModifier(id);
  if (variant === VariantKind.Direction8) {
    return { id, direction: DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)] };
  }
  if (variant === VariantKind.Number || variant === VariantKind.NumberPair) {
    const ranges = NUMBER_RANGES[id];
    if (!ranges) throw new Error(`No number range for ${id}`);
    return { id, values: ranges.map((r) => pickNumber(r, rng)) };
  }
  return { id };
}

/** Tire les variants (direction, nombres) d'une description abstraite. */
export function resolveVariants(
  desc: AbstractDescription,
  rng: Rng = Math.random,
): ResolvedDescription {
  const [first, second] = desc.features;
  if (!first) throw new Error("Description sans élément");
  return {
    which: desc.which ? resolveModifier(desc.which, rng) : undefined,
    feature: { id: first },
    appearanceOrSecond: second
      ? { id: second }
      : desc.appearance
        ? resolveModifier(desc.appearance, rng)
        : undefined,
    dimension: desc.dimension
      ? resolveModifier(desc.dimension, rng)
      : undefined,
    location: desc.location ? resolveModifier(desc.location, rng) : undefined,
  };
}

/** Chemin du PNG d'une case, ou undefined pour une case numérique (rendue en texte). */
export function cellImage(cell: ResolvedCell): string | undefined {
  if (cell.values) return undefined;
  const name = cell.direction ? `${cell.id}_${cell.direction}` : cell.id;
  return `/symbols/${name}.png`;
}

/**
 * Lignes de texte d'une case numérique, selon la convention IOF :
 * hauteur « 1.5 », taille « 5 x 3 », hauteur sur pente « 0.5 / 3 », deux hauteurs sur deux lignes.
 */
export function cellText(cell: ResolvedCell): readonly string[] {
  const v = cell.values ?? [];
  switch (cell.id) {
    case ModifierId.Size:
      return [`${v[0]} x ${v[1]}`];
    case ModifierId.HeightOnSlope:
      return [`${v[0]} / ${v[1]}`];
    default:
      return v.map(String);
  }
}

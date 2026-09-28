import type { ModifierId } from "./enums";
import {
  allowedAppearances,
  allowedDimensions,
  allowedFirstFeatures,
  allowedLocations,
  allowedSecondFeatures,
  allowedWhich,
  arity2Modifier,
} from "./rules";
import type { AbstractDescription, FeatureDef, ModifierDef } from "./types";

/** Générateur de nombres dans [0, 1). Injectable pour les tests. */
export type Rng = () => number;

/** Poids du « rien » pour chaque colonne optionnelle, relatif aux poids des symboles. */
export interface GeneratorOptions {
  emptyWeight: {
    location: number;
    dimension: number;
    appearance: number;
    which: number;
  };
}

export const DEFAULT_OPTIONS: GeneratorOptions = {
  emptyWeight: { location: 10, dimension: 50, appearance: 50, which: 20 },
};

function pickWeighted<T extends { weight: number }>(
  items: readonly T[],
  rng: Rng,
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

/** Tire un symbole parmi les candidats, ou rien avec le poids `emptyWeight`. */
function pickOptional(
  candidates: readonly ModifierDef[],
  emptyWeight: number,
  rng: Rng,
): ModifierDef | undefined {
  if (candidates.length === 0) return undefined;
  const empty = { id: undefined, weight: emptyWeight };
  const picked = pickWeighted<{ id: ModifierId | undefined; weight: number }>(
    [empty, ...candidates],
    rng,
  );
  return picked.id ? (picked as ModifierDef) : undefined;
}

/**
 * Construit une description valide par construction, en suivant l'ordre D → G → F → E → C.
 * Chaque étape tire uniquement parmi les candidats que les règles autorisent.
 */
export function generate(
  rng: Rng = Math.random,
  options: GeneratorOptions = DEFAULT_OPTIONS,
): AbstractDescription {
  const { emptyWeight } = options;

  const first: FeatureDef = pickWeighted(allowedFirstFeatures(), rng);
  const location = pickOptional(
    allowedLocations(first),
    emptyWeight.location,
    rng,
  );
  const dimension = pickOptional(
    allowedDimensions(first, location),
    emptyWeight.dimension,
    rng,
  );

  const features: FeatureDef[] = [first];
  if (arity2Modifier(location, dimension)) {
    const seconds = allowedSecondFeatures(first, location, dimension);
    if (seconds.length === 0) {
      // Aucun second élément possible : on retire le symbole d'arité 2 et on recommence.
      return generate(rng, options);
    }
    features.push(pickWeighted(seconds, rng));
  }

  const appearance = pickOptional(
    allowedAppearances(features),
    emptyWeight.appearance,
    rng,
  );
  const which = pickOptional(
    allowedWhich(first, dimension, location),
    emptyWeight.which,
    rng,
  );

  return {
    features: features.map((f) => f.id),
    location: location?.id,
    dimension: dimension?.id,
    appearance: appearance?.id,
    which: which?.id,
  };
}

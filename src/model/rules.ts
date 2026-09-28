import { Column, FeatureId, ModifierId, Trait } from "./enums";
import { FEATURE_LIST } from "./features";
import { MODIFIER_LIST } from "./modifiers";
import type { AbstractDescription, FeatureDef, ModifierDef } from "./types";

/**
 * Règles pures du modèle. Chaque fonction `allowed*` renvoie les candidats valides pour une
 * colonne, en fonction de ce qui est déjà choisi. Le générateur tire dans ces ensembles et
 * `validate` vérifie que chaque valeur d'une description en fait partie : une seule source de vérité.
 *
 * Ordre de remplissage : D → G → F → E → C. Chaque étape ne dépend que des précédentes.
 */

const featureById = new Map<FeatureId, FeatureDef>(FEATURE_LIST.map((f) => [f.id, f]));
const modifierById = new Map<ModifierId, ModifierDef>(MODIFIER_LIST.map((m) => [m.id, m]));

export function getFeature(id: FeatureId): FeatureDef {
  const f = featureById.get(id);
  if (!f) throw new Error(`Unknown feature: ${id}`);
  return f;
}

export function getModifier(id: ModifierId): ModifierDef {
  const m = modifierById.get(id);
  if (!m) throw new Error(`Unknown modifier: ${id}`);
  return m;
}

const byColumn = (column: Column) =>
  MODIFIER_LIST.filter((m) => m.column === column);

/** Un modificateur est-il compatible avec les traits d'un élément ? */
export function isCompatible(
  modifier: ModifierDef,
  feature: FeatureDef,
): boolean {
  const traits = new Set(feature.traits);
  const requires = modifier.requires ?? [];
  const excludes = modifier.excludes ?? [];
  if (!requires.every((t) => traits.has(t))) return false;
  if (modifier.requiresAny && !modifier.requiresAny.some((t) => traits.has(t)))
    return false;
  if (excludes.some((t) => traits.has(t))) return false;
  if (modifier.families && !modifier.families.includes(feature.family)) return false;
  return true;
}

/** Compatibilité avec chaque élément ; le second peut avoir ses propres contraintes. */
function isCompatibleWithAll(
  modifier: ModifierDef,
  features: readonly FeatureDef[],
): boolean {
  return features.every((feature, index) => {
    const rule =
      index === 1 && modifier.secondRequiresAny
        ? {
            ...modifier,
            requires: undefined,
            requiresAny: modifier.secondRequiresAny,
          }
        : modifier;
    return isCompatible(rule, feature);
  });
}

// ---------------------------------------------------------------------------
// Étape 1 : élément principal (colonne D)
// ---------------------------------------------------------------------------

export function allowedFirstFeatures(): readonly FeatureDef[] {
  return FEATURE_LIST;
}

// ---------------------------------------------------------------------------
// Étape 2 : position (colonne G)
// ---------------------------------------------------------------------------

export function allowedLocations(first: FeatureDef): ModifierDef[] {
  return byColumn(Column.G).filter((m) => isCompatible(m, first));
}

// ---------------------------------------------------------------------------
// Étape 3 : dimensions et combinaisons (colonne F)
// ---------------------------------------------------------------------------

export function allowedDimensions(
  first: FeatureDef,
  location: ModifierDef | undefined,
): ModifierDef[] {
  return byColumn(Column.F).filter((m) => {
    if (!isCompatible(m, first)) return false;
    // Avec « entre », la colonne F est vide ou porte les hauteurs des deux éléments (spec 9.4),
    // et ce symbole n'a de sens que là.
    const between = location?.id === ModifierId.Between;
    if (m.id === ModifierId.HeightsTwoFeatures) return between;
    if (between) return false;
    // Croisement, jonction et coude rendent l'emplacement ponctuel et décrivent déjà
    // la position : pas de colonne G en plus (pas d'« extrémité » sur un coude).
    if ((m.arity === 2 || m.id === ModifierId.Bend) && location) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Étape 4 : second élément (colonne E), si G ou F est d'arité 2
// ---------------------------------------------------------------------------

export function arity2Modifier(
  location: ModifierDef | undefined,
  dimension: ModifierDef | undefined,
): ModifierDef | undefined {
  if (dimension?.arity === 2) return dimension;
  if (location?.arity === 2) return location;
  return undefined;
}

export function allowedSecondFeatures(
  first: FeatureDef,
  location: ModifierDef | undefined,
  dimension: ModifierDef | undefined,
): FeatureDef[] {
  const pair = arity2Modifier(location, dimension);
  if (!pair) return [];
  return FEATURE_LIST.filter((second) => {
    if (!isCompatibleWithAll(pair, [first, second])) return false;
    // Les autres modificateurs déjà choisis doivent aussi convenir au second élément.
    const others = [location, dimension].filter(
      (m): m is ModifierDef => !!m && m !== pair,
    );
    return others.every((m) => isCompatibleWithAll(m, [first, second]));
  });
}

// ---------------------------------------------------------------------------
// Étape 5 : apparence (colonne E)
// ---------------------------------------------------------------------------

export function allowedAppearances(
  features: readonly FeatureDef[],
): ModifierDef[] {
  // Le second élément occupe la colonne E : pas d'apparence possible.
  if (features.length > 1) return [];
  return byColumn(Column.E).filter((m) => isCompatibleWithAll(m, features));
}

// ---------------------------------------------------------------------------
// Étape 6 : lequel (colonne C)
// ---------------------------------------------------------------------------

export function allowedWhich(
  first: FeatureDef,
  dimension: ModifierDef | undefined,
  location: ModifierDef | undefined,
): ModifierDef[] {
  // « Entre » deux éléments : pas de colonne C, on ne désigne pas lequel des deux.
  if (location?.id === ModifierId.Between) return [];
  // Sur un linéaire, seulement si un coude, un croisement ou une jonction rend
  // l'emplacement ponctuel (ex. 50 « coude du ruisseau, le plus sud »).
  const pointLike =
    dimension?.id === ModifierId.Bend ||
    dimension?.id === ModifierId.Crossing ||
    dimension?.id === ModifierId.Junction;
  if (first.traits.includes(Trait.Linear) && !pointLike) return [];
  return byColumn(Column.C).filter((m) => isCompatible(m, first));
}

// ---------------------------------------------------------------------------
// Validation : rejoue les mêmes règles sur une description existante
// ---------------------------------------------------------------------------

export function validate(desc: AbstractDescription): string[] {
  const errors: string[] = [];
  const [firstId, secondId, ...rest] = desc.features;
  if (!firstId) return ["Élément principal manquant"];
  if (rest.length > 0) errors.push("Au plus deux éléments");

  const first = getFeature(firstId);
  const location = desc.location ? getModifier(desc.location) : undefined;
  const dimension = desc.dimension ? getModifier(desc.dimension) : undefined;

  const check = (column: Column, id: FeatureId | ModifierId | undefined, allowed: readonly { id: FeatureId | ModifierId }[]) => {
    if (id && !allowed.some((a) => a.id === id))
      errors.push(`${column}: ${id} non autorisé`);
  };

  check(Column.G, desc.location, allowedLocations(first));
  check(Column.F, desc.dimension, allowedDimensions(first, location));

  const needsSecond = arity2Modifier(location, dimension) !== undefined;
  if (needsSecond && !secondId) errors.push("Second élément manquant");
  if (!needsSecond && secondId)
    errors.push("Second élément sans croisement, jonction ni « entre »");
  if (needsSecond && secondId) {
    check(
      Column.D,
      secondId,
      allowedSecondFeatures(first, location, dimension),
    );
  }

  const features = secondId ? [first, getFeature(secondId)] : [first];
  check(Column.E, desc.appearance, allowedAppearances(features));
  check(Column.C, desc.which, allowedWhich(first, dimension, location));

  return errors;
}

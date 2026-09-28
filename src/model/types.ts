import {
  Column,
  Family,
  FeatureId,
  ModifierId,
  Trait,
  VariantKind,
} from "./enums";

/** Données d'un élément de la colonne D. Porte des traits, pas de contraintes. */
export interface FeatureData {
  family: Family;
  /** Mots-clés attendus dans la réponse en français. */
  keywords: KeywordPhrase;
  traits: readonly Trait[];
  /** Poids de tirage relatif (1 = rare, 10 = très courant). */
  weight: number;
}

export interface FeatureDef extends FeatureData {
  id: FeatureId;
}

/** Données d'un modificateur des colonnes C, E, F, G. Exprime ses contraintes sur les traits. */
export interface ModifierData {
  column: Column.C | Column.E | Column.F | Column.G;
  /**
   * Mots-clés attendus dans la réponse. Pour un symbole à direction ou à nombres,
   * la direction ou les valeurs sont ajoutées à la résolution (voir answer.ts).
   */
  keywords: KeywordPhrase;
  /** L'élément doit avoir TOUS ces traits. */
  requires?: readonly Trait[];
  /** L'élément doit avoir AU MOINS UN de ces traits. */
  requiresAny?: readonly Trait[];
  /** L'élément ne doit avoir AUCUN de ces traits. */
  excludes?: readonly Trait[];
  /** L'élément doit appartenir à l'une de ces familles. */
  families?: readonly Family[];
  /**
   * Nombre d'éléments consommés (2 pour croisement, jonction, entre).
   * Le second élément est placé en colonne E, qui ne peut donc pas porter d'apparence.
   */
  arity?: 1 | 2;
  /** Pour l'arité 2 : contraintes du second élément, si différentes de celles du premier. */
  secondRequiresAny?: readonly Trait[];
  /** Axe de variation tiré au rendu, sans effet sur la validité. */
  variant?: VariantKind;
  weight: number;
}

export interface ModifierDef extends ModifierData {
  id: ModifierId;
}

/** Description abstraite : ce que manipulent le générateur et le validateur. */
export interface AbstractDescription {
  which?: ModifierId;
  features: readonly FeatureId[]; // 1 élément, ou 2 si F ou G est d'arité 2
  appearance?: ModifierId;
  dimension?: ModifierId;
  location?: ModifierId;
}

export type SymbolKeyword = string;
export type KeywordPhrase =
  | {
      type: "and" | "or";
      operandOne: KeywordPhrase;
      operandTwo: KeywordPhrase;
    }
  | {
      type: "leaf";
      symbol: string;
    };

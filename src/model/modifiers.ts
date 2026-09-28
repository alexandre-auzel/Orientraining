import { Column, Family, ModifierId, Trait, VariantKind } from "./enums";
import { and, kw, or } from "./keywords-engine";
import type { ModifierData, ModifierDef } from "./types";

const { Linear, Area, HasTip } = Trait;
const { HasHeight, HasDepth, OnSlope, HasTop, HasFoot, HasUnderside } = Trait;
const { HasCorner, HasSide, HasEdge, HasEnd, HasBend } = Trait;
const { NaturalGround, VegetationTree, ManMade, CanBeOvergrown, CanBeOpen } =
  Trait;
const { C, E, F, G } = Column;
const { Direction8, Number: Num, NumberPair } = VariantKind;

/** Modificateurs des colonnes C, E, F, G. Le Record garantit que chaque ModifierId est défini. */
export const MODIFIERS: Record<ModifierId, ModifierData> = {
  // --- Colonne C : lequel. Pas de contrainte de traits ; sur un linéaire, allowedWhich()
  // exige un coude, un croisement ou une jonction. ---
  [ModifierId.Which]: {
    keywords: kw("plus"),
    column: C,
    variant: Direction8,
    weight: 6,
  },
  [ModifierId.WhichUpper]: {
    keywords: or("plus haut", "dessus", "superieur", "plus haute"),
    column: C,
    weight: 1,
  },
  [ModifierId.WhichLower]: {
    keywords: or("plus bas", "dessous", "inferieur", "plus basse"),
    column: C,
    weight: 1,
  },
  [ModifierId.WhichMiddle]: {
    keywords: or("milieu", "central", "centrale"),
    column: C,
    weight: 1,
  },

  // --- Colonne E : apparence ---
  // Aplati et évasé ne s'appliquent qu'aux formes de terrain : ni pylône ni rocher aplati.
  [ModifierId.Low]: {
    keywords: or("aplati", "aplatie", "bas", "basse"),
    column: E,
    requires: [HasHeight],
    families: [Family.LandForm],
    weight: 3,
  },
  [ModifierId.Shallow]: {
    keywords: or("evase", "evasee", "peu profond", "peu profonde"),
    column: E,
    requires: [HasDepth],
    families: [Family.LandForm],
    weight: 3,
  },
  [ModifierId.Deep]: {
    keywords: or("profond", "profonde"),
    column: E,
    requires: [HasDepth],
    weight: 3,
  },
  [ModifierId.Overgrown]: {
    keywords: or("couvert", "couverte", "envahi", "envahie", "vegetation"),
    column: E,
    requires: [CanBeOvergrown],
    weight: 2,
  },
  [ModifierId.Open]: {
    keywords: or("ouvert", "ouverte", "degage", "degagee"),
    column: E,
    requires: [CanBeOpen],
    weight: 2,
  },
  // Sol dans lequel se trouve l'élément : jamais sur un objet en relief ni sur un rocher.
  [ModifierId.Rocky]: {
    keywords: or("rocheux", "rocheuse"),
    column: E,
    requires: [NaturalGround],
    excludes: [HasHeight],
    families: [Family.LandForm, Family.Vegetation],
    weight: 2,
  },
  [ModifierId.Marshy]: {
    keywords: or("marecageux", "marecageuse"),
    column: E,
    requires: [NaturalGround],
    excludes: [HasHeight],
    families: [Family.LandForm, Family.Vegetation],
    weight: 2,
  },
  [ModifierId.Sandy]: {
    keywords: or("sablonneux", "sablonneuse", "sable"),
    column: E,
    requires: [NaturalGround],
    excludes: [HasHeight],
    families: [Family.LandForm, Family.Vegetation],
    weight: 2,
  },
  [ModifierId.NeedleLeaved]: {
    keywords: or("resineux", "conifere", "aiguilles"),
    column: E,
    requires: [VegetationTree],
    weight: 2,
  },
  [ModifierId.BroadLeaved]: {
    keywords: or("feuillu", "feuillus"),
    column: E,
    requires: [VegetationTree],
    weight: 2,
  },
  [ModifierId.Ruined]: {
    keywords: or(
      "ruine",
      "ruinee",
      "ecroule",
      "ecroulee",
      "effondre",
      "effondree",
    ),
    column: E,
    requires: [ManMade],
    weight: 2,
  },

  // --- Colonne F : dimensions et combinaisons ---
  [ModifierId.HeightOrDepth]: {
    keywords: or("m", "metre", "metres"),
    column: F,
    requiresAny: [HasHeight, HasDepth],
    variant: Num,
    weight: 10,
  },
  // Largeur et longueur : surfaces uniquement (carrière 5 x 5, marais 8 x 8).
  [ModifierId.Size]: {
    keywords: kw("x"),
    column: F,
    requires: [Area],
    variant: NumberPair,
    weight: 4,
  },
  [ModifierId.HeightOnSlope]: {
    keywords: kw("pente"),
    column: F,
    requires: [HasHeight],
    variant: NumberPair,
    weight: 1,
  },
  // Seul symbole F possible avec « entre » : les hauteurs des deux éléments (spec 9.4).
  [ModifierId.HeightsTwoFeatures]: {
    keywords: kw("m"),
    column: F,
    requires: [HasHeight],
    variant: NumberPair,
    weight: 2,
  },
  [ModifierId.Crossing]: {
    keywords: kw("croisement"),
    column: F,
    requires: [Linear],
    arity: 2,
    weight: 6,
  },
  // Jonction de deux linéaires, ou d'un linéaire avec le côté d'une surface (clôture + bâtiment).
  [ModifierId.Junction]: {
    keywords: or("jonction", "intersection", "confluence"),
    column: F,
    requires: [Linear],
    secondRequiresAny: [Linear, Area],
    arity: 2,
    weight: 6,
  },
  [ModifierId.Bend]: {
    keywords: or("coude", "virage", "courbe"),
    column: F,
    requires: [HasBend],
    weight: 6,
  },

  // --- Colonne G : position de la balise ---
  [ModifierId.Side]: {
    keywords: kw("cote"),
    column: G,
    requires: [HasSide],
    variant: Direction8,
    weight: 10,
  },
  [ModifierId.Edge]: {
    keywords: kw("bord"),
    column: G,
    requires: [HasEdge],
    variant: Direction8,
    weight: 6,
  },
  [ModifierId.Part]: {
    keywords: kw("partie"),
    column: G,
    requires: [Area],
    variant: Direction8,
    weight: 3,
  },
  [ModifierId.CornerInside]: {
    keywords: and(or("angle", "coin"), "interieur"),
    column: G,
    requires: [HasCorner],
    variant: Direction8,
    weight: 4,
  },
  [ModifierId.CornerOutside]: {
    keywords: and(or("angle", "coin"), "exterieur"),
    column: G,
    requires: [HasCorner],
    variant: Direction8,
    weight: 4,
  },
  [ModifierId.Tip]: {
    keywords: kw("pointe"),
    column: G,
    requires: [HasTip],
    variant: Direction8,
    weight: 4,
  },
  [ModifierId.End]: {
    keywords: or("extremite", "bout"),
    column: G,
    requires: [HasEnd],
    variant: Direction8,
    weight: 5,
  },
  [ModifierId.UpperPart]: {
    keywords: or("amont", "partie haute", "partie superieure"),
    column: G,
    requires: [OnSlope],
    weight: 5,
  },
  [ModifierId.LowerPart]: {
    keywords: or("aval", "partie basse", "partie inferieure"),
    column: G,
    requires: [OnSlope],
    weight: 5,
  },
  [ModifierId.Top]: {
    keywords: or("sommet", "haut"),
    column: G,
    requires: [HasTop],
    weight: 4,
  },
  [ModifierId.Foot]: {
    keywords: kw("pied"),
    column: G,
    requires: [HasFoot],
    weight: 3,
  },
  [ModifierId.FootDir]: {
    keywords: kw("pied"),
    column: G,
    requires: [HasFoot],
    variant: Direction8,
    weight: 5,
  },
  [ModifierId.Beneath]: {
    keywords: or("sous", "dessous"),
    column: G,
    requires: [HasUnderside],
    weight: 2,
  },
  [ModifierId.Between]: {
    keywords: kw("entre"),
    column: G,
    arity: 2,
    weight: 3,
  },
};

export const MODIFIER_LIST: readonly ModifierDef[] = (
  Object.entries(MODIFIERS) as [ModifierId, ModifierData][]
).map(([id, data]) => ({ id, ...data }));

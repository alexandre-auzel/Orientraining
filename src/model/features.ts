import { Family, FeatureId, Trait } from "./enums";
import { and, kw, or } from "./keywords-engine";
import type { FeatureData, FeatureDef } from "./types";

const { Point, Linear, Area, HasTip } = Trait;
const { HasHeight, HasDepth, OnSlope, HasTop, HasFoot, HasUnderside } = Trait;
const { HasCorner, HasSide, HasEdge, HasEnd, HasBend } = Trait;
const {
  NaturalGround,
  Water,
  VegetationTree,
  ManMade,
  CanBeOvergrown,
  CanBeOpen,
} = Trait;

const {
  LandForm,
  Rock,
  Water: WaterFamily,
  Vegetation,
  ManMade: ManMadeFamily,
  Special,
} = Family;

/**
 * Éléments de la colonne D. Le Record garantit que chaque FeatureId est défini.
 *
 * Rappels tirés de la spécification IOF 2018 :
 * - HasSide : l'élément s'élève au-dessus du sol. HasEdge : il est en creux ou plat.
 * - HasTop / HasFoot : seulement si ce n'est pas déjà la position par défaut de la balise.
 * - Pas de HasTip pour éperon et rentrant : ils utilisent partie amont / aval.
 * - ManMade sert uniquement à « en ruine » : pas sur les routes, chemins, layons.
 */
export const FEATURES: Record<FeatureId, FeatureData> = {
  // --- Formes de terrain ---
  [FeatureId.Terrace]: {
    keywords: kw("terrasse"),
    family: LandForm,
    traits: [Area, OnSlope, NaturalGround],
    weight: 3,
  },
  [FeatureId.Spur]: {
    keywords: kw("eperon"),
    family: LandForm,
    traits: [OnSlope, HasFoot, NaturalGround],
    weight: 8,
  },
  [FeatureId.ReEntrant]: {
    keywords: or("rentrant", "reentrant", "talweg"),
    family: LandForm,
    traits: [OnSlope, HasDepth, NaturalGround],
    weight: 9,
  },
  [FeatureId.EarthBank]: {
    keywords: or("abrupt", "talus"),
    family: LandForm,
    traits: [
      Linear,
      HasHeight,
      HasTop,
      HasFoot,
      HasEnd,
      HasBend,
      NaturalGround,
    ],
    weight: 5,
  },
  [FeatureId.Quarry]: {
    keywords: kw("carriere"),
    family: LandForm,
    traits: [Area, HasDepth, HasEdge, NaturalGround, CanBeOvergrown],
    weight: 3,
  },
  [FeatureId.EarthWall]: {
    keywords: or("levee", "mur de terre"),
    family: LandForm,
    traits: [Linear, HasHeight, HasSide, HasEnd, HasBend, NaturalGround],
    weight: 3,
  },
  [FeatureId.ErosionGully]: {
    keywords: kw("ravine"),
    family: LandForm,
    traits: [Linear, HasDepth, OnSlope, HasEnd, HasBend, NaturalGround],
    weight: 5,
  },
  [FeatureId.SmallErosionGully]: {
    keywords: and("ravine", or("petite", "petit")),
    family: LandForm,
    traits: [Linear, HasDepth, OnSlope, HasEnd, HasBend, NaturalGround],
    weight: 3,
  },
  [FeatureId.Hill]: {
    keywords: kw("colline"),
    family: LandForm,
    traits: [Area, HasHeight, HasSide, HasFoot, NaturalGround],
    weight: 6,
  },
  [FeatureId.Knoll]: {
    keywords: kw("butte"),
    family: LandForm,
    traits: [Point, HasHeight, HasSide, HasTop, HasFoot, NaturalGround],
    weight: 9,
  },
  [FeatureId.Saddle]: {
    keywords: kw("col"),
    family: LandForm,
    traits: [Area, NaturalGround],
    weight: 3,
  },
  [FeatureId.Depression]: {
    keywords: kw("depression"),
    family: LandForm,
    traits: [Area, HasDepth, HasEdge, NaturalGround, CanBeOvergrown, CanBeOpen],
    weight: 7,
  },
  [FeatureId.SmallDepression]: {
    keywords: and("depression", "petite"),
    family: LandForm,
    traits: [Point, HasDepth, HasEdge, NaturalGround, CanBeOvergrown],
    weight: 5,
  },
  [FeatureId.Pit]: {
    keywords: kw("trou"),
    family: LandForm,
    traits: [Point, HasDepth, HasEdge, NaturalGround, CanBeOvergrown],
    weight: 6,
  },
  [FeatureId.BrokenGround]: {
    keywords: kw("accidente"),
    family: LandForm,
    traits: [Area, HasEdge, NaturalGround],
    weight: 1,
  },
  [FeatureId.AntHill]: {
    keywords: or("fourmiliere", "termitiere"),
    family: LandForm,
    traits: [Point, HasHeight, HasSide, NaturalGround],
    weight: 2,
  },

  // --- Rochers ---
  [FeatureId.Cliff]: {
    keywords: or("falaise", "face rocheuse"),
    family: Rock,
    traits: [
      Linear,
      HasHeight,
      HasTop,
      HasFoot,
      HasUnderside,
      HasEnd,
      HasBend,
      NaturalGround,
    ],
    weight: 9,
  },
  [FeatureId.RockPillar]: {
    keywords: or("pic", "pilier"),
    family: Rock,
    traits: [Point, HasHeight, HasSide, HasFoot, NaturalGround],
    weight: 1,
  },
  [FeatureId.Cave]: {
    keywords: kw("grotte"),
    family: Rock,
    traits: [Point, NaturalGround],
    weight: 1,
  },
  [FeatureId.Boulder]: {
    keywords: or("rocher", "caillou", "bloc"),
    family: Rock,
    traits: [Point, HasHeight, HasSide, HasFoot, HasUnderside, NaturalGround],
    weight: 10,
  },
  [FeatureId.BoulderField]: {
    keywords: and(or("blocs", "rochers", "pierres"), or("zone", "champ")),
    family: Rock,
    traits: [Area, HasEdge, HasTip, NaturalGround],
    weight: 3,
  },
  [FeatureId.BoulderCluster]: {
    keywords: and(or("blocs", "rochers", "pierres"), or("groupe", "amas")),
    family: Rock,
    traits: [Point, HasHeight, HasSide, NaturalGround],
    weight: 3,
  },
  [FeatureId.StonyGround]: {
    keywords: kw("pierrier"),
    family: Rock,
    traits: [Area, HasEdge, NaturalGround],
    weight: 3,
  },
  [FeatureId.BareRock]: {
    keywords: or("affleurement", "dalle"),
    family: Rock,
    traits: [Area, HasEdge, NaturalGround],
    weight: 1,
  },
  [FeatureId.NarrowPassage]: {
    keywords: and("passage", "etroit"),
    family: Rock,
    traits: [Linear, HasEnd, NaturalGround],
    weight: 1,
  },
  [FeatureId.Trench]: {
    keywords: kw("tranchee"),
    family: Rock,
    traits: [Linear, HasDepth, HasEnd, HasBend],
    weight: 2,
  },

  // --- Eau ---
  [FeatureId.Lake]: {
    keywords: kw("lac"),
    family: WaterFamily,
    traits: [Area, HasEdge, HasTip, Water],
    weight: 3,
  },
  [FeatureId.Pond]: {
    keywords: or("etang", "mare"),
    family: WaterFamily,
    traits: [Area, HasEdge, HasTip, Water, CanBeOvergrown],
    weight: 6,
  },
  [FeatureId.Waterhole]: {
    keywords: and("trou", "eau"),
    family: WaterFamily,
    traits: [Point, HasDepth, HasEdge, Water, CanBeOvergrown],
    weight: 4,
  },
  [FeatureId.River]: {
    keywords: or("riviere", "ruisseau", "cours d eau"),
    family: WaterFamily,
    traits: [Linear, HasEnd, HasBend, Water],
    weight: 6,
  },
  [FeatureId.Ditch]: {
    keywords: or("fosse", "rigole", "drain"),
    family: WaterFamily,
    traits: [Linear, HasDepth, HasEnd, HasBend, Water, CanBeOvergrown],
    weight: 7,
  },
  [FeatureId.NarrowMarsh]: {
    keywords: and("marais", "etroit"),
    family: WaterFamily,
    traits: [Linear, HasEnd, HasBend, Water, CanBeOpen],
    weight: 4,
  },
  [FeatureId.Marsh]: {
    keywords: kw("marais"),
    family: WaterFamily,
    traits: [Area, HasEdge, HasTip, Water, CanBeOpen],
    weight: 2,
  },
  [FeatureId.FirmGroundInMarsh]: {
    keywords: and("marais", or("sol ferme", "ilot")),
    family: WaterFamily,
    traits: [Area, HasEdge, HasTip, NaturalGround],
    weight: 2,
  },
  [FeatureId.Well]: {
    keywords: kw("puits"),
    family: WaterFamily,
    traits: [Point, HasHeight, HasSide, Water, ManMade],
    weight: 3,
  },
  [FeatureId.Spring]: {
    keywords: kw("source"),
    family: WaterFamily,
    traits: [Point, HasEdge, Water],
    weight: 3,
  },
  [FeatureId.WaterTank]: {
    keywords: or("reservoir", "abreuvoir", "citerne"),
    family: WaterFamily,
    traits: [Point, HasHeight, HasSide, ManMade],
    weight: 2,
  },

  // --- Végétation ---
  [FeatureId.OpenLand]: {
    keywords: or("decouvert", "prairie", "champ"),
    family: Vegetation,
    traits: [Area, HasEdge, HasCorner, HasTip, NaturalGround],
    weight: 1,
  },
  [FeatureId.SemiOpenLand]: {
    keywords: kw("semi ouvert"),
    family: Vegetation,
    traits: [Area, HasEdge, HasCorner, HasTip, NaturalGround],
    weight: 1,
  },
  [FeatureId.ForestCorner]: {
    keywords: kw("coin"),
    family: Vegetation,
    traits: [Area, HasSide, HasTip, VegetationTree],
    weight: 3,
  },
  [FeatureId.Clearing]: {
    keywords: kw("clairiere"),
    family: Vegetation,
    traits: [Area, HasEdge, HasCorner, HasTip, NaturalGround],
    weight: 5,
  },
  [FeatureId.Thicket]: {
    keywords: kw("fourre"),
    family: Vegetation,
    traits: [Area, HasSide, HasCorner, HasTip, VegetationTree],
    weight: 2,
  },
  [FeatureId.LinearThicket]: {
    keywords: kw("haie"),
    family: Vegetation,
    traits: [
      Linear,
      HasHeight,
      HasSide,
      HasCorner,
      HasEnd,
      HasBend,
      VegetationTree,
    ],
    weight: 1,
  },
  [FeatureId.VegetationBoundary]: {
    keywords: and("limite", "vegetation"),
    family: Vegetation,
    traits: [Linear, HasCorner, HasEnd, HasBend],
    weight: 3,
  },
  [FeatureId.Copse]: {
    keywords: kw("bosquet"),
    family: Vegetation,
    traits: [Area, HasHeight, HasSide, HasTip, VegetationTree],
    weight: 2,
  },
  [FeatureId.ProminentTree]: {
    keywords: kw("arbre"),
    family: Vegetation,
    traits: [Point, HasHeight, HasSide, HasFoot, VegetationTree],
    weight: 7,
  },
  [FeatureId.RootStock]: {
    keywords: or("souche", "deracine"),
    family: Vegetation,
    traits: [Point, HasHeight, HasSide, VegetationTree],
    weight: 5,
  },

  // --- Éléments artificiels ---
  [FeatureId.Road]: {
    keywords: kw("route"),
    family: ManMadeFamily,
    traits: [Linear, HasEnd, HasBend],
    weight: 6,
  },
  [FeatureId.Track]: {
    keywords: or("chemin", "sentier"),
    family: ManMadeFamily,
    traits: [Linear, HasEnd, HasBend],
    weight: 8,
  },
  [FeatureId.Ride]: {
    keywords: kw("layon"),
    family: ManMadeFamily,
    traits: [Linear, HasEnd, HasBend],
    weight: 1,
  },
  [FeatureId.Bridge]: {
    keywords: kw("pont"),
    family: ManMadeFamily,
    traits: [Point, HasHeight, HasSide, HasUnderside, HasEnd, ManMade],
    weight: 3,
  },
  [FeatureId.PowerLine]: {
    keywords: and("ligne", or("electrique", "haute tension")),
    family: ManMadeFamily,
    traits: [Linear, HasHeight, HasUnderside, HasEnd, HasBend, ManMade],
    weight: 3,
  },
  [FeatureId.PowerLinePylon]: {
    keywords: kw("pylone"),
    family: ManMadeFamily,
    traits: [Point, HasHeight, HasSide, HasFoot, ManMade],
    weight: 3,
  },
  [FeatureId.Tunnel]: {
    keywords: kw("tunnel"),
    family: ManMadeFamily,
    traits: [Point, HasEnd, ManMade],
    weight: 2,
  },
  [FeatureId.Wall]: {
    keywords: kw("mur"),
    family: ManMadeFamily,
    traits: [Linear, HasHeight, HasSide, HasCorner, HasEnd, HasBend, ManMade],
    weight: 7,
  },
  [FeatureId.Fence]: {
    keywords: or("cloture", "barriere"),
    family: ManMadeFamily,
    traits: [Linear, HasHeight, HasSide, HasCorner, HasEnd, HasBend, ManMade],
    weight: 7,
  },
  [FeatureId.CrossingPoint]: {
    keywords: or("point de passage", "portillon", "echalier"),
    family: ManMadeFamily,
    traits: [Point, HasSide, ManMade],
    weight: 3,
  },
  [FeatureId.Building]: {
    keywords: or("batiment", "construction", "maison"),
    family: ManMadeFamily,
    traits: [Area, HasHeight, HasSide, HasCorner, ManMade],
    weight: 6,
  },
  [FeatureId.PavedArea]: {
    keywords: or("pavee", "parking", "en dur"),
    family: ManMadeFamily,
    traits: [Area, HasEdge, HasCorner, ManMade],
    weight: 3,
  },
  [FeatureId.Ruin]: {
    keywords: kw("ruine"),
    family: ManMadeFamily,
    traits: [Area, HasHeight, HasSide, HasCorner, CanBeOvergrown],
    weight: 4,
  },
  [FeatureId.Pipeline]: {
    keywords: or("pipeline", "canalisation", "conduite"),
    family: ManMadeFamily,
    traits: [Linear, HasHeight, HasUnderside, HasEnd, HasBend, ManMade],
    weight: 1,
  },
  [FeatureId.Tower]: {
    keywords: or("tour", "pylone"),
    family: ManMadeFamily,
    traits: [Point, HasHeight, HasSide, HasFoot, ManMade],
    weight: 3,
  },
  [FeatureId.ShootingPlatform]: {
    keywords: or("plateforme de tir", "mirador"),
    family: ManMadeFamily,
    traits: [Point, HasHeight, HasSide, HasFoot, ManMade],
    weight: 2,
  },
  [FeatureId.BoundaryStone]: {
    keywords: or("borne", "cairn"),
    family: ManMadeFamily,
    traits: [Point, HasHeight, HasSide, ManMade],
    weight: 3,
  },
  [FeatureId.FodderRack]: {
    keywords: or("mangeoire", "nourrissage"),
    family: ManMadeFamily,
    traits: [Point, HasHeight, HasSide, ManMade],
    weight: 2,
  },
  [FeatureId.Platform]: {
    keywords: or("charbonniere", "plateforme"),
    family: ManMadeFamily,
    traits: [Point, HasEdge, NaturalGround],
    weight: 2,
  },
  [FeatureId.Monument]: {
    keywords: or("monument", "statue", "memorial"),
    family: ManMadeFamily,
    traits: [Point, HasHeight, HasSide, HasFoot, ManMade],
    weight: 2,
  },
  [FeatureId.Canopy]: {
    keywords: or("passage couvert", "auvent", "preau"),
    family: ManMadeFamily,
    traits: [Point, HasHeight, HasUnderside, HasEnd, ManMade],
    weight: 2,
  },
  [FeatureId.Stairway]: {
    keywords: or("escalier", "marches"),
    family: ManMadeFamily,
    traits: [Linear, HasHeight, HasTop, HasFoot, ManMade],
    weight: 2,
  },
  [FeatureId.OutOfBounds]: {
    keywords: or("zone interdite", "interdit"),
    family: ManMadeFamily,
    traits: [Area, HasEdge, HasCorner],
    weight: 1,
  },
  [FeatureId.Railway]: {
    keywords: or("voie ferree", "rail", "chemin de fer"),
    family: ManMadeFamily,
    traits: [Linear, HasEnd, HasBend],
    weight: 2,
  },

  // --- Spéciaux ---
  // Traités comme un rocher : ponctuels, en relief, avec un dessous possible.
  [FeatureId.SpecialItemX]: {
    keywords: or("element remarquable", "objet particulier", "special"),
    family: Special,
    traits: [Point, HasHeight, HasSide, HasFoot, HasUnderside],
    weight: 3,
  },
  [FeatureId.SpecialItemO]: {
    keywords: or("element remarquable", "objet particulier", "special"),
    family: Special,
    traits: [Point, HasHeight, HasSide, HasFoot, HasUnderside],
    weight: 1,
  },
};

export const FEATURE_LIST: readonly FeatureDef[] = (
  Object.entries(FEATURES) as [FeatureId, FeatureData][]
).map(([id, data]) => ({ id, ...data }));

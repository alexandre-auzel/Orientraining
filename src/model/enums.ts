/** Colonne de la description IOF dans laquelle apparaît un symbole. */
export enum Column {
  C = "C", // Lequel des éléments similaires
  D = "D", // Élément
  E = "E", // Apparence
  F = "F", // Dimensions / combinaisons
  G = "G", // Position du poste
}

/** Famille thématique des éléments (colonne D). Sert au filtrage et à l'affichage. */
export enum Family {
  LandForm = "land_form",
  Rock = "rock",
  Water = "water",
  Vegetation = "vegetation",
  ManMade = "man_made", // construction pouvant être « en ruine » (pas les routes)
  Special = "special",
}

/**
 * Traits portés par un élément (colonne D).
 * Les modificateurs (C, E, F, G) expriment leurs contraintes uniquement sur ces traits.
 */
export enum Trait {
  // Géométrie
  Point = "point",
  Linear = "linear",
  Area = "area",
  HasTip = "has_tip", // surface dont un bord fait moins de 45° (marais, lac, bosquet)

  // Relief / vertical
  HasHeight = "has_height",
  HasDepth = "has_depth",
  OnSlope = "on_slope", // a une partie haute et une partie basse
  HasTop = "has_top",
  HasFoot = "has_foot",
  HasUnderside = "has_underside",

  // Forme
  HasCorner = "has_corner", // bord ou tracé formant un angle de 45 à 135°
  HasSide = "has_side", // s'élève au-dessus du sol (rocher, bâtiment, fourré, colline)
  HasEdge = "has_edge", // en creux ou surface plane (dépression, étang, marais, clairière)
  HasEnd = "has_end", // linéaire non fermé, y compris pont, tunnel, passage couvert
  HasBend = "has_bend",

  // Nature
  NaturalGround = "natural_ground",
  Water = "water",
  VegetationTree = "vegetation_tree",
  ManMade = "man_made",
  CanBeOvergrown = "can_be_overgrown",
  CanBeOpen = "can_be_open",
}

/** Axe de variation d'un symbole, tiré aléatoirement au rendu, sans contrainte sémantique. */
export enum VariantKind {
  Direction8 = "direction8",
  Number = "number",
  NumberPair = "number_pair",
}

export enum Direction {
  N = "N",
  NE = "NE",
  E = "E",
  SE = "SE",
  S = "S",
  SW = "SW",
  W = "W",
  NW = "NW",
}

/**
 * Identifiants des éléments (colonne D). Les noms correspondent aux fichiers PNG de assets/symbols.
 */
export enum FeatureId {
  // Colonne D — formes de terrain
  Terrace = "terrace",
  Spur = "spur",
  ReEntrant = "re_entrant",
  EarthBank = "earth_bank",
  Quarry = "quarry",
  EarthWall = "earth_wall",
  ErosionGully = "erosion_gully",
  SmallErosionGully = "small_erosion_gully",
  Hill = "hill",
  Knoll = "knoll",
  Saddle = "saddle",
  Depression = "depression",
  SmallDepression = "small_depression",
  Pit = "pit",
  BrokenGround = "broken_ground",
  AntHill = "ant_hill",

  // Colonne D — rochers
  Cliff = "cliff",
  RockPillar = "rock_pillar",
  Cave = "cave",
  Boulder = "boulder",
  BoulderField = "boulder_field",
  BoulderCluster = "boulder_cluster",
  StonyGround = "stony_ground",
  BareRock = "bare_rock",
  NarrowPassage = "narrow_passage",
  Trench = "trench",

  // Colonne D — eau
  Lake = "lake",
  Pond = "pond",
  Waterhole = "waterhole",
  River = "river",
  Ditch = "ditch",
  NarrowMarsh = "narrow_marsh",
  Marsh = "marsh",
  FirmGroundInMarsh = "firm_ground_in_marsh",
  Well = "well",
  Spring = "spring",
  WaterTank = "water_tank",

  // Colonne D — végétation
  OpenLand = "open_land",
  SemiOpenLand = "semi_open_land",
  ForestCorner = "forest_corner",
  Clearing = "clearing",
  Thicket = "thicket",
  LinearThicket = "linear_thicket",
  VegetationBoundary = "vegetation_boundary",
  Copse = "copse",
  ProminentTree = "prominent_tree",
  RootStock = "root_stock",

  // Colonne D — éléments artificiels
  Road = "road",
  Track = "track",
  Ride = "ride",
  Bridge = "bridge",
  PowerLine = "power_line",
  PowerLinePylon = "power_line_pylon",
  Tunnel = "tunnel",
  Wall = "wall",
  Fence = "fence",
  CrossingPoint = "crossing_point",
  Building = "building",
  PavedArea = "paved_area",
  Ruin = "ruin",
  Pipeline = "pipeline",
  Tower = "tower",
  ShootingPlatform = "shooting_platform",
  BoundaryStone = "boundary_stone",
  FodderRack = "fodder_rack",
  Platform = "platform",
  Monument = "monument",
  Canopy = "canopy",
  Stairway = "stairway",
  OutOfBounds = "out_of_bounds",
  Railway = "railway",

  // Colonne D — spéciaux
  SpecialItemX = "special_item_x",
  SpecialItemO = "special_item_o",
}

/**
 * Identifiants des modificateurs (colonnes C, E, F, G).
 * Pour les symboles à direction, le PNG est `${id}_${direction}.png`.
 */
export enum ModifierId {

  // Colonne C
  Which = "which",
  WhichUpper = "which_upper",
  WhichLower = "which_lower",
  WhichMiddle = "which_middle",

  // Colonne E
  Low = "low",
  Shallow = "shallow",
  Deep = "deep",
  Overgrown = "overgrown",
  Open = "open",
  Rocky = "rocky",
  Marshy = "marshy",
  Sandy = "sandy",
  NeedleLeaved = "needle_leaved",
  BroadLeaved = "broad_leaved",
  Ruined = "ruined",

  // Colonne F
  HeightOrDepth = "height_or_depth",
  Size = "size",
  HeightOnSlope = "height_on_slope",
  HeightsTwoFeatures = "heights_two_features",
  Crossing = "crossing",
  Junction = "junction",
  Bend = "bend",

  // Colonne G
  Side = "side",
  Edge = "edge",
  Part = "part",
  CornerInside = "corner_inside",
  CornerOutside = "corner_outside",
  Tip = "tip",
  End = "end",
  UpperPart = "upper_part",
  LowerPart = "lower_part",
  Top = "top",
  Foot = "foot", // sans direction
  FootDir = "foot_dir", // avec direction
  Beneath = "beneath",
  Between = "between",
}

export type SymbolId = FeatureId | ModifierId;

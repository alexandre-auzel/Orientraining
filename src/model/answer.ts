import { Direction, ModifierId } from "./enums";
import { FEATURES } from "./features";
import {
  and,
  kw,
  missingKeywords,
  or,
  validatePhrase,
} from "./keywords-engine";
import { MODIFIERS } from "./modifiers";
import type { ResolvedCell, ResolvedDescription } from "./resolve";
import type { KeywordPhrase } from "./types";

/** Façons acceptées d'écrire chaque direction. */
const DIRECTION_KEYWORDS: Record<Direction, KeywordPhrase> = {
  [Direction.N]: or("nord", "n"),
  [Direction.NE]: or("nord est", "ne"),
  [Direction.E]: or("est", "e"),
  [Direction.SE]: or("sud est", "se"),
  [Direction.S]: or("sud", "s"),
  [Direction.SW]: or("sud ouest", "so", "sw"),
  [Direction.W]: or("ouest", "o", "w"),
  [Direction.NW]: or("nord ouest", "no", "nw"),
};

function isFeatureId(id: ResolvedCell["id"]): id is keyof typeof FEATURES {
  return id in FEATURES;
}

/** Phrase attendue pour une case, direction et nombres inclus. */
export function cellPhrase(cell: ResolvedCell): KeywordPhrase {
  if (isFeatureId(cell.id)) return FEATURES[cell.id].keywords;
  const base = MODIFIERS[cell.id as ModifierId].keywords;
  if (cell.direction) return and(base, DIRECTION_KEYWORDS[cell.direction]);
  if (cell.values) return and(base, ...cell.values.map((v) => kw(String(v))));
  return base;
}

/** Phrase attendue pour toute la description : chaque case doit être décrite. */
export const GRID_COLUMNS = ["C", "D", "E", "F", "G"] as const;
export type GridColumn = (typeof GRID_COLUMNS)[number];

/** Cases d'une description, par colonne de la grille. */
export function cellsByColumn(desc: ResolvedDescription): Record<GridColumn, ResolvedCell | undefined> {
  return {
    C: desc.which,
    D: desc.feature,
    E: desc.appearanceOrSecond,
    F: desc.dimension,
    G: desc.location,
  };
}

/** Phrase attendue pour toute la description : chaque case doit être décrite. */
export function expectedPhrase(desc: ResolvedDescription): KeywordPhrase {
  const cells = Object.values(cellsByColumn(desc)).filter((c): c is ResolvedCell => c !== undefined);
  const [first, ...rest] = cells.map(cellPhrase);
  return and(first, ...rest);
}

/** Rendu lisible d'une phrase : « a / b » pour un ou, « a + b » pour un et. */
export function phraseToText(phrase: KeywordPhrase): string {
  switch (phrase.type) {
    case "leaf":
      return phrase.symbol;
    case "or":
      return `${phraseToText(phrase.operandOne)} / ${phraseToText(phrase.operandTwo)}`;
    case "and": {
      const side = (p: KeywordPhrase) => (p.type === "or" ? `(${phraseToText(p)})` : phraseToText(p));
      return `${side(phrase.operandOne)} + ${side(phrase.operandTwo)}`;
    }
  }
}

export interface ColumnCheck {
  valid: boolean;
  /** Mots attendus absents de la réponse ; les alternatives sont jointes par « / ». */
  missing: string[];
  /** Ce qui était attendu pour cette colonne, en clair. */
  expected: string;
}

export interface AnswerCheck {
  valid: boolean;
  /** Résultat par colonne ; undefined si la colonne est vide dans la description. */
  columns: Record<GridColumn, ColumnCheck | undefined>;
}

export function checkAnswer(candidate: string, desc: ResolvedDescription): AnswerCheck {
  const cells = cellsByColumn(desc);
  const columns = {} as Record<GridColumn, ColumnCheck | undefined>;
  for (const column of GRID_COLUMNS) {
    const cell = cells[column];
    if (!cell) continue;
    const phrase = cellPhrase(cell);
    columns[column] = {
      valid: validatePhrase(candidate, phrase),
      missing: missingKeywords(candidate, phrase),
      expected: phraseToText(phrase),
    };
  }
  const valid = GRID_COLUMNS.every((c) => columns[c]?.valid ?? true);
  return { valid, columns };
}

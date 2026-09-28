import type { KeywordPhrase } from "./types";

// ---------------------------------------------------------------------------
// Constructeurs, pour écrire les phrases de façon compacte dans les données
// ---------------------------------------------------------------------------

type PhraseInput = KeywordPhrase | string;

export const kw = (symbol: string): KeywordPhrase => ({ type: "leaf", symbol });

const toPhrase = (p: PhraseInput): KeywordPhrase =>
  typeof p === "string" ? kw(p) : p;

const combine =
  (type: "and" | "or") =>
  (first: PhraseInput, ...rest: PhraseInput[]): KeywordPhrase =>
    rest.reduce<KeywordPhrase>(
      (acc, p) => ({ type, operandOne: acc, operandTwo: toPhrase(p) }),
      toPhrase(first),
    );

/** Tous les opérandes doivent être présents. */
export const and = combine("and");
/** Au moins un opérande doit être présent. */
export const or = combine("or");

// ---------------------------------------------------------------------------
// Normalisation et test d'un mot-clé
// ---------------------------------------------------------------------------

/**
 * Minuscules, sans accents, tirets et apostrophes remplacés par des espaces,
 * virgule décimale convertie en point, chiffre et lettre collés séparés, espaces réduits.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/(\d)([a-z])/g, "$1 $2") // « 1.5m » → « 1.5 m »
    .replace(/([a-z])(\d)/g, "$1 $2") // « 5x3 » → « 5 x 3 »
    .replace(/[-'’_,;:!?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Le mot-clé est-il présent comme mot entier (ou suite de mots entiers) ? Le pluriel en s ou x est toléré. */
export function containsKeyword(candidate: string, symbol: string): boolean {
  const needle = normalize(symbol);
  if (!needle) return false;
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}[sx]?($|[^a-z0-9])`);
  return re.test(normalize(candidate));
}

// ---------------------------------------------------------------------------
// Évaluation
// ---------------------------------------------------------------------------

export function validatePhrase(
  candidate: string,
  phrase: KeywordPhrase,
): boolean {
  switch (phrase.type) {
    case "and":
      return (
        validatePhrase(candidate, phrase.operandOne) &&
        validatePhrase(candidate, phrase.operandTwo)
      );
    case "or":
      return (
        validatePhrase(candidate, phrase.operandOne) ||
        validatePhrase(candidate, phrase.operandTwo)
      );
    case "leaf":
      return containsKeyword(candidate, phrase.symbol);
  }
}

/** Feuilles d'une phrase, à plat, pour afficher les alternatives d'un « ou ». */
function leaves(phrase: KeywordPhrase): string[] {
  return phrase.type === "leaf"
    ? [phrase.symbol]
    : [...leaves(phrase.operandOne), ...leaves(phrase.operandTwo)];
}

/**
 * Mots manquants pour satisfaire la phrase. Chaque entrée est un mot attendu, ou les
 * alternatives d'un « ou » non satisfait, jointes par « / ». Vide si la phrase est satisfaite.
 */
export function missingKeywords(
  candidate: string,
  phrase: KeywordPhrase,
): string[] {
  switch (phrase.type) {
    case "and":
      return [
        ...missingKeywords(candidate, phrase.operandOne),
        ...missingKeywords(candidate, phrase.operandTwo),
      ];
    case "or":
      return validatePhrase(candidate, phrase)
        ? []
        : [leaves(phrase).join(" / ")];
    case "leaf":
      return containsKeyword(candidate, phrase.symbol) ? [] : [phrase.symbol];
  }
}

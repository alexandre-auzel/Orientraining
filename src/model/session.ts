import { checkAnswer, type AnswerCheck } from "./answer";
import { generate, type Rng } from "./generate";
import { resolveVariants, type ResolvedDescription } from "./resolve";

export const SESSION_SIZE = 10;

/** Une définition de la partie, avec ce qui s'est passé au premier passage. */
export interface SessionItem {
  desc: ResolvedDescription;
  firstAnswer?: string;
  firstCheck?: AnswerCheck;
}

export type Phase =
  /** Une définition est affichée, on attend la réponse. */
  | { kind: "answering"; index: number }
  /** La réponse vient d'être validée, on montre le résultat avant de passer à la suivante. */
  | { kind: "reviewing"; index: number; check: AnswerCheck }
  /** Toutes les définitions ont été réussies au moins une fois. */
  | { kind: "done" };

export interface Session {
  items: readonly SessionItem[];
  /** Indices restant à traiter dans le passage en cours. */
  queue: readonly number[];
  /** Indices ratés pendant ce passage, à refaire au passage suivant. */
  retry: readonly number[];
  /** 1 = premier passage, 2 = première reprise des ratées, etc. */
  round: number;
  /** Nombre de définitions du passage en cours. */
  roundTotal: number;
  phase: Phase;
}

export function startSession(
  rng: Rng = Math.random,
  size = SESSION_SIZE,
): Session {
  const items = Array.from({ length: size }, () => ({
    desc: resolveVariants(generate(rng), rng),
  }));
  const queue = items.map((_, i) => i);
  return {
    items,
    queue,
    retry: [],
    round: 1,
    roundTotal: queue.length,
    phase: { kind: "answering", index: 0 },
  };
}

/** Valide la réponse de la définition courante et passe en phase de revue. */
export function answer(session: Session, text: string): Session {
  if (session.phase.kind !== "answering") return session;
  const { index } = session.phase;
  const item = session.items[index];
  const check = checkAnswer(text, item.desc);

  const items = session.items.map((it, i) =>
    i === index && it.firstCheck === undefined
      ? { ...it, firstAnswer: text, firstCheck: check }
      : it,
  );
  const retry = check.valid ? session.retry : [...session.retry, index];
  return {
    ...session,
    items,
    retry,
    phase: { kind: "reviewing", index, check },
  };
}

/** Passe à la définition suivante, ou au passage suivant, ou au récapitulatif. */
export function next(session: Session): Session {
  if (session.phase.kind !== "reviewing") return session;
  const queue = session.queue.slice(1);
  if (queue.length > 0) {
    return { ...session, queue, phase: { kind: "answering", index: queue[0] } };
  }
  if (session.retry.length > 0) {
    const retryQueue = session.retry;
    return {
      ...session,
      queue: retryQueue,
      retry: [],
      round: session.round + 1,
      roundTotal: retryQueue.length,
      phase: { kind: "answering", index: retryQueue[0] },
    };
  }
  return { ...session, queue: [], phase: { kind: "done" } };
}

/** Position dans le passage en cours, pour l'affichage « 3 / 20 ». */
export function progress(session: Session): { done: number; total: number } {
  const reviewing = session.phase.kind === "reviewing" ? 1 : 0;
  return {
    done: session.roundTotal - session.queue.length + reviewing,
    total: session.roundTotal,
  };
}

export function firstPassScore(session: Session): {
  correct: number;
  total: number;
} {
  const correct = session.items.filter((it) => it.firstCheck?.valid).length;
  return { correct, total: session.items.length };
}

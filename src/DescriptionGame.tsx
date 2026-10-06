import { useState } from "react";
import {
  cellsByColumn,
  GRID_COLUMNS,
  type AnswerCheck,
  type ColumnCheck,
} from "./model/answer";
import {
  cellImage,
  cellText,
  type ResolvedCell,
  type ResolvedDescription,
} from "./model/resolve";
import {
  answer as answerSession,
  firstPassScore,
  next as nextSession,
  progress,
  startSession,
  type Session,
} from "./model/session";

function Cell({ cell }: { cell: ResolvedCell | undefined }) {
  if (!cell) return <div className="cell" />;
  const image = cellImage(cell);
  if (image) {
    return (
      <div className="cell">
        <img src={image} alt={cell.id} />
      </div>
    );
  }
  return (
    <div className="cell cell-text">
      {cellText(cell).map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </div>
  );
}

function columnClass(check: ColumnCheck | undefined): string {
  if (!check) return "column";
  return check.valid ? "column ok" : "column ko";
}

function Grid({
  desc,
  check,
  small,
}: {
  desc: ResolvedDescription;
  check?: AnswerCheck;
  small?: boolean;
}) {
  const cells = cellsByColumn(desc);
  return (
    <div className={small ? "grid small" : "grid"}>
      {GRID_COLUMNS.map((c) => (
        <div key={c} className={columnClass(check?.columns[c])}>
          {!small && <div className="header">{c}</div>}
          <Cell cell={cells[c]} />
        </div>
      ))}
    </div>
  );
}

function Result({ check }: { check: AnswerCheck }) {
  return (
    <div className={check.valid ? "result ok" : "result ko"}>
      <div className="verdict">
        <span>{check.valid ? "Correct !" : "Pas tout à fait."}</span>
      </div>
      <ul className="columns">
        {GRID_COLUMNS.map((c) => {
          const col = check.columns[c];
          if (!col) return null;
          return (
            <li key={c} className={col.valid ? "ok" : "ko"}>
              <strong>{c}</strong> <code>{col.expected}</code>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Recap({
  session,
  onRestart,
}: {
  session: Session;
  onRestart: () => void;
}) {
  const score = firstPassScore(session);
  return (
    <section className="recap">
      <p className="score">
        <strong>{score.correct}</strong> sur {score.total} justes du premier
        coup
      </p>
      <ol className="recap-list">
        {session.items.map((item, i) => (
          <li key={i} className={item.firstCheck?.valid ? "ok" : "ko"}>
            <Grid desc={item.desc} check={item.firstCheck} small />
            <div className="first-answer">
              {item.firstAnswer || <em>Pas de réponse</em>}
            </div>
          </li>
        ))}
      </ol>
      <button className="primary" onClick={onRestart}>
        Nouvelle partie
      </button>
    </section>
  );
}

export function DescriptionGame() {
  const [session, setSession] = useState<Session>(() => startSession());
  const [text, setText] = useState("");

  const restart = () => {
    setSession(startSession());
    setText("");
  };

  if (session.phase.kind === "done") {
    return <Recap session={session} onRestart={restart} />;
  }

  const { phase } = session;
  const item = session.items[phase.index];
  const { done, total } = progress(session);

  const submit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSession(answerSession(session, text));
  };

  const goNext = () => {
    setSession(nextSession(session));
    setText("");
  };

  return (
    <>
      <p className="status">
        {session.round === 1
          ? `Définition ${done} sur ${total}`
          : `Reprise des erreurs : ${done} sur ${total}`}
      </p>
      <Grid
        desc={item.desc}
        check={phase.kind === "reviewing" ? phase.check : undefined}
      />
      {phase.kind === "answering" ? (
        <form className="answer" onSubmit={submit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écris la définition en français"
            autoFocus
          />
          <button className="primary" type="submit">
            Valider
          </button>
        </form>
      ) : (
        <>
          <div className="answer">
            <input value={text} readOnly />
            <button className="primary" onClick={goNext} autoFocus>
              Suivant
            </button>
          </div>
          <Result check={phase.check} />
        </>
      )}
    </>
  );
}

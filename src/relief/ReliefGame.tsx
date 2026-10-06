import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { arrowAt, drawMap } from "./drawMap";
import { renderView } from "./render3d";
import {
  cellName,
  GRID_SPACING,
  nearestNode,
} from "./grid";
import {
  evaluate,
  newRound,
  ROUNDS_PER_GAME,
  type Guess,
  type GuessResult,
  type Mode,
  type Round,
} from "./round";
import { MAP_SIZE } from "./terrain";

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;

function View3D({ round, contours }: { round: Round; contours: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pixels = useMemo(
    () =>
      renderView(
        round.terrain,
        round.lighting,
        round.truth,
        VIEW_WIDTH,
        VIEW_HEIGHT,
        { contours },
      ),
    [round, contours],
  );
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(pixels), VIEW_WIDTH, VIEW_HEIGHT),
      0,
      0,
    );
  }, [pixels]);
  return (
    <canvas
      ref={ref}
      className="relief-view"
      width={VIEW_WIDTH}
      height={VIEW_HEIGHT}
    />
  );
}

const CARDINALS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

/** Boussole du mode facile : le haut du cadran est la direction du regard. */
function Compass({ heading }: { heading: number }) {
  const degrees = ((((heading * 180) / Math.PI) % 360) + 360) % 360;
  const cardinal = CARDINALS[Math.round(degrees / 45) % 8];
  return (
    <div className="compass">
      <svg viewBox="-50 -50 100 100" width="84" height="84">
        <circle r="46" fill="#fff" stroke="#000" strokeWidth="1.5" />
        <g transform={`rotate(${-degrees})`}>
          {Array.from({ length: 36 }, (_, i) => (
            <line
              key={i}
              x1="0"
              y1="-46"
              x2="0"
              y2={i % 9 === 0 ? -38 : -42}
              stroke="#000"
              strokeWidth={i % 9 === 0 ? 1.5 : 0.8}
              transform={`rotate(${i * 10})`}
            />
          ))}
          <polygon points="0,-34 6,0 -6,0" fill="#d62828" />
          <polygon points="0,34 6,0 -6,0" fill="#bbb" />
          {["N", "E", "S", "O"].map((label, i) => (
            <text
              key={label}
              x="0"
              y="-26"
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={label === "N" ? "#d62828" : "#000"}
              transform={`rotate(${i * 90}) rotate(${-i * 90 + degrees} 0 -26)`}
            >
              {label}
            </text>
          ))}
        </g>
        <polygon points="0,-50 -5,-41 5,-41" fill="#a3238e" />
      </svg>
      <div className="compass-heading">
        Tu regardes vers
        <strong>
          {cardinal} <span className="compass-degrees">{Math.round(degrees)}°</span>
        </strong>
      </div>
    </div>
  );
}

function MapCanvas({
  round,
  guess,
  truth,
  arrows,
  onClick,
  onPickDirection,
}: {
  round: Round;
  guess?: Guess;
  truth?: Required<Guess>;
  /** Affiche les huit flèches de direction autour du nœud de la réponse. */
  arrows: boolean;
  onClick?: (x: number, y: number) => void;
  onPickDirection: (direction: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);
  const [hover, setHover] = useState<number | undefined>();
  const showArrows = arrows && guess !== undefined;

  // La carte s'adapte à la place disponible : on redessine à sa taille réelle.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => setSize(canvas.clientWidth));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || size === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMap(ctx, size, round, {
      guess,
      truth,
      arrows: showArrows ? { hover } : undefined,
    });
  }, [round, guess, truth, size, showArrows, hover]);

  /** Flèche sous la souris, s'il y en a une. */
  const arrowUnder = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!showArrows || !guess) return undefined;
    const rect = e.currentTarget.getBoundingClientRect();
    return arrowAt(size, guess, e.clientX - rect.left, e.clientY - rect.top);
  };

  const click = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!onClick) return;
    const direction = arrowUnder(e);
    if (direction !== undefined) {
      onPickDirection(direction);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(
      ((e.clientX - rect.left) / rect.width) * MAP_SIZE,
      ((e.clientY - rect.top) / rect.height) * MAP_SIZE,
    );
  };
  return (
    <canvas
      ref={ref}
      className={onClick ? "relief-map clickable" : "relief-map"}
      style={hover !== undefined ? { cursor: "pointer" } : undefined}
      onClick={click}
      onMouseMove={(e) => setHover(arrowUnder(e))}
      onMouseLeave={() => setHover(undefined)}
    />
  );
}

interface Played {
  round: Round;
  guess: Required<Guess>;
  result: GuessResult;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

function describe(result: GuessResult, mode: Mode): string {
  const position =
    result.steps === 0 ? "position exacte" : `à ${plural(result.steps, "case")}`;
  if (mode === "easy") return position;
  const direction =
    result.directionSteps === 0
      ? "direction exacte"
      : `direction à ${result.directionSteps * 45}°`;
  return `${position}, ${direction}`;
}

/** Les manches de la partie, comme des postes : vert réussi, orange manqué. */
function RoundTrack({
  played,
  current,
}: {
  played: Played[];
  current: number;
}) {
  return (
    <div className="round-track">
      <ol aria-hidden="true">
        {Array.from({ length: ROUNDS_PER_GAME }, (_, i) => {
          const p = played[i];
          const state = p
            ? p.result.success
              ? "ok"
              : "ko"
            : i === current
              ? "current"
              : "todo";
          return <li key={i} className={state} />;
        })}
      </ol>
      <span>
        Manche {Math.min(current + 1, ROUNDS_PER_GAME)} sur {ROUNDS_PER_GAME}
      </span>
    </div>
  );
}

function Recap({
  played,
  mode,
  onRestart,
}: {
  played: Played[];
  mode: Mode;
  onRestart: () => void;
}) {
  const total = played.reduce((a, p) => a + p.result.points, 0);
  const successes = played.filter((p) => p.result.success).length;
  return (
    <section className="recap">
      <p className="score">
        <strong>{total}</strong> sur {played.length * 100} points
      </p>
      <p className="recap-summary">
        {successes === 0
          ? "Aucune manche réussie"
          : `${plural(successes, "manche")} réussie${successes > 1 ? "s" : ""}`}{" "}
        sur {played.length}, en mode {mode === "easy" ? "facile" : "normal"}.
      </p>
      <ol className="recap-list">
        {played.map((p, i) => (
          <li key={i} className={p.result.success ? "ok" : "ko"}>
            <span className="recap-marker" aria-hidden="true" />
            <strong>Manche {i + 1}</strong>
            <span className="recap-detail">{describe(p.result, mode)}</span>
            <span className="recap-points">{p.result.points} pts</span>
          </li>
        ))}
      </ol>
      <button className="primary" onClick={onRestart}>
        Nouvelle partie
      </button>
    </section>
  );
}

function ModeChoice({ onChoose }: { onChoose: (mode: Mode) => void }) {
  return (
    <ul className="choices">
      <li>
        <button onClick={() => onChoose("easy")}>
          <strong>Facile</strong>
          <span>
            Une boussole donne la direction du regard : il reste à trouver le
            bon nœud de la grille. Réussi sur le bon nœud ou un voisin,
            diagonale comprise.
          </span>
        </button>
      </li>
      <li>
        <button onClick={() => onChoose("normal")}>
          <strong>Normal</strong>
          <span>
            Trouver le nœud de la grille et la direction parmi les huit.
            Réussi sur le bon nœud ou un voisin, diagonale comprise, avec la
            bonne direction.
          </span>
        </button>
      </li>
    </ul>
  );
}

export function ReliefGame() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [guess, setGuess] = useState<Guess | undefined>();
  const [result, setResult] = useState<GuessResult | undefined>();
  const [played, setPlayed] = useState<Played[]>([]);
  const [contours3d, setContours3d] = useState(false);

  const start = (m: Mode) => {
    setMode(m);
    setPlayed([]);
    setResult(undefined);
    setGuess(undefined);
    setRound(newRound());
  };

  if (!mode || !round) return <ModeChoice onChoose={start} />;

  if (played.length === ROUNDS_PER_GAME && !result) {
    return (
      <Recap played={played} mode={mode} onRestart={() => setMode(null)} />
    );
  }

  const easy = mode === "easy";
  const complete: Required<Guess> | undefined = !guess
    ? undefined
    : easy
      ? { ...guess, direction: round.answer.direction }
      : guess.direction === undefined
        ? undefined
        : { ...guess, direction: guess.direction };

  // Un clic hors des flèches choisit le nœud le plus proche ; une flèche choisit la direction.
  const clickMap = (x: number, y: number) => setGuess(nearestNode(x, y));
  const pickDirection = (direction: number) =>
    guess && setGuess({ ...guess, direction });

  const validate = () => {
    if (!complete) return;
    const r = evaluate(round.answer, complete, mode);
    setResult(r);
    setPlayed([...played, { round, guess: complete, result: r }]);
  };

  const next = () => {
    setResult(undefined);
    setGuess(undefined);
    if (played.length < ROUNDS_PER_GAME) setRound(newRound());
  };

  const instruction = !guess
    ? "Clique sur le nœud de la grille où tu penses te trouver."
    : !complete
      ? `${cellName(guess)} : clique sur la flèche de la direction où tu regardes.`
      : easy
        ? `${cellName({ ...complete, direction: undefined })} : valide, ou clique sur un autre nœud.`
        : `${cellName(complete)} : valide, change de flèche, ou clique sur un autre nœud.`;

  const current = played.length - (result ? 1 : 0);
  const shownAnswer = easy
    ? { ...round.answer, direction: undefined }
    : round.answer;

  return (
    <div className="relief">
      <div className="relief-side">
        <View3D round={round} contours={contours3d} />
        <div className="relief-toolbar">
          {easy && <Compass heading={round.truth.heading} />}
          <div className="relief-toolbar-text">
            <RoundTrack played={played} current={current} />
            <label className="relief-option">
              <input
                type="checkbox"
                checked={contours3d}
                onChange={(e) => setContours3d(e.target.checked)}
              />
              Afficher les courbes de niveau sur la vue
            </label>
            <p className="relief-note">
              Mode {easy ? "facile" : "normal"}, carreaux de {GRID_SPACING} m
            </p>
          </div>
        </div>
        {result ? (
          <div className={result.success ? "result ok" : "result ko"}>
            <div className="verdict">
              <span>{result.success ? "Bien vu !" : "Pas tout à fait."}</span>
              <span className="verdict-points">{result.points} / 100</span>
            </div>
            <dl className="answers">
              <dt>
                <span className="dot guess" aria-hidden="true" /> Ta réponse
              </dt>
              <dd>{cellName(easy ? { ...played[played.length - 1].guess, direction: undefined } : played[played.length - 1].guess)}</dd>
              <dt>
                <span className="dot truth" aria-hidden="true" /> Solution
              </dt>
              <dd>{cellName(shownAnswer)}</dd>
              <dt>Écart</dt>
              <dd>{describe(result, mode)}</dd>
            </dl>
            <button className="primary" onClick={next} autoFocus>
              {played.length < ROUNDS_PER_GAME
                ? "Manche suivante"
                : "Voir le bilan"}
            </button>
          </div>
        ) : (
          <div className="relief-actions">
            <p className="instruction">{instruction}</p>
            <button
              className="primary"
              onClick={validate}
              disabled={!complete}
            >
              Valider
            </button>
          </div>
        )}
      </div>
      <MapCanvas
        round={round}
        guess={complete ?? guess}
        truth={result ? round.answer : undefined}
        arrows={!easy && !result}
        onPickDirection={pickDirection}
        onClick={result ? undefined : clickMap}
      />
    </div>
  );
}

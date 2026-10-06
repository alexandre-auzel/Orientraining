import { useState } from "react";
import { CONTOUR_ART } from "./contourArt";
import { DescriptionGame } from "./DescriptionGame";
import { ReliefGame } from "./relief/ReliefGame";

type Game = "descriptions" | "relief";

const GAMES: { id: Game; title: string; summary: string }[] = [
  {
    id: "descriptions",
    title: "Définitions de poste",
    summary: "Traduire en français les symboles IOF d'une définition de poste.",
  },
  {
    id: "relief",
    title: "Lecture du relief",
    summary:
      "Retrouver sur la carte en courbes de niveau d'où la vue 3D a été prise, et vers où elle regarde.",
  },
];

/** Accueil : un circuit dont le départ est le titre et chaque poste un jeu. */
function Home({ onChoose }: { onChoose: (game: Game) => void }) {
  return (
    <div className="home">
      <svg
        className="home-contours"
        viewBox="0 0 600 520"
        aria-hidden="true"
        focusable="false"
      >
        {CONTOUR_ART.map((c, i) => (
          <path key={i} d={c.d} className={c.index ? "index" : undefined} />
        ))}
      </svg>
      <header className="home-head">
        <svg
          className="start-mark"
          viewBox="0 0 40 36"
          aria-hidden="true"
          focusable="false"
        >
          <polygon points="20,3 37,33 3,33" />
        </svg>
        <h1 className="wordmark">Orientraining</h1>
        <p className="tagline">
          S'entraîner à lire une carte de course d'orientation, entre deux
          sorties.
        </p>
      </header>
      <ol className="course">
        {GAMES.map((g) => (
          <li key={g.id}>
            <button className="leg" onClick={() => onChoose(g.id)}>
              <span className="control" aria-hidden="true" />
              <span className="leg-text">
                <strong>{g.title}</strong>
                <span>{g.summary}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function App() {
  const [game, setGame] = useState<Game | null>(null);
  const current = GAMES.find((g) => g.id === game);

  if (!current) {
    return (
      <main className="page">
        <Home onChoose={setGame} />
      </main>
    );
  }

  return (
    <main className={game === "relief" ? "page wide" : "page"}>
      <div className="topbar">
        <button className="back" onClick={() => setGame(null)}>
          ← Menu
        </button>
        <h1>{current.title}</h1>
      </div>
      {current.id === "descriptions" ? <DescriptionGame /> : <ReliefGame />}
    </main>
  );
}

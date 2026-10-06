import { useState } from "react";
import { DescriptionGame } from "./DescriptionGame";
import { ReliefGame } from "./relief/ReliefGame";

type Game = "descriptions" | "relief";

const GAMES: { id: Game; title: string; summary: string }[] = [
  {
    id: "descriptions",
    title: "Définitions de poste",
    summary: "Traduire les symboles IOF d'une définition de poste.",
  },
  {
    id: "relief",
    title: "Lecture du relief",
    summary:
      "Retrouver sur une carte en courbes de niveau d'où et dans quelle direction la vue a été prise.",
  },
];

export function App() {
  const [game, setGame] = useState<Game | null>(null);
  const current = GAMES.find((g) => g.id === game);

  return (
    <main className={game === "relief" ? "wide" : undefined}>
      {current ? (
        <>
          <div className="topbar">
            <button className="back" onClick={() => setGame(null)}>
              ← Menu
            </button>
            <h1>{current.title}</h1>
          </div>
          {current.id === "descriptions" ? <DescriptionGame /> : <ReliefGame />}
        </>
      ) : (
        <>
          <h1>Orientraining</h1>
          <ul className="menu">
          {GAMES.map((g) => (
            <li key={g.id}>
              <button onClick={() => setGame(g.id)}>
                <strong>{g.title}</strong>
                <span>{g.summary}</span>
              </button>
            </li>
          ))}
          </ul>
        </>
      )}
    </main>
  );
}

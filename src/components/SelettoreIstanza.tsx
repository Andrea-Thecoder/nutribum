import { useEffect, useRef, useState } from "react";
import type { Periodo } from "../lib/aggregate";
import { elencoIstanze, etichettaPeriodo, TUTTO_IL_PERIODO } from "../lib/aggregate";

export function SelettoreIstanza({
  giorni,
  periodo,
  istanza,
  onChange,
  mostraTutto = true,
  // Ancora per i mini-tour delle anteprime "?" (vedi lib/tourAnteprimaContenuti.tsx). Default
  // valido ovunque ce n'è uno solo a schermo; Confronto Periodi ne usa DUE insieme (A e B) e passa
  // un valore diverso per ciascuno, altrimenti il tour troverebbe sempre il primo dei due.
  dataTour = "selettore-istanza",
}: {
  giorni: { data: string }[];
  periodo: Periodo;
  istanza: string;
  onChange: (istanza: string) => void;
  // false nei pannelli dove "Tutto" non ha senso (es. confronto tra periodi: non si può
  // confrontare "tutto" con "il periodo prima di tutto").
  mostraTutto?: boolean;
  dataTour?: string;
}) {
  const [aperto, setAperto] = useState(false);
  const [evidenziato, setEvidenziato] = useState(0);
  const opzioneRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const opzioni = elencoIstanze(giorni, periodo);
  const etichettaCorrente = istanza === TUTTO_IL_PERIODO ? "Tutto" : etichettaPeriodo(istanza, periodo);

  // Elenco unico (invece di renderizzare "Tutto" a parte dalle altre opzioni) per poter navigare
  // l'intera tendina con un solo indice, frecce comprese - stesso pattern di SelettorePersonalizzato.
  const voci = mostraTutto ? [{ chiave: TUTTO_IL_PERIODO, etichetta: "Tutto" }, ...opzioni] : opzioni;

  function apri() {
    // Riparte dall'opzione già selezionata (non sempre dalla prima): con le frecce che applicano
    // subito la scelta (vedi sotto), la prima pressione deve muoversi rispetto a dov'è ora, non
    // saltare all'inizio della lista.
    const indiceCorrente = voci.findIndex((v) => v.chiave === istanza);
    setEvidenziato(indiceCorrente >= 0 ? indiceCorrente : 0);
    setAperto(true);
  }

  useEffect(() => {
    if (!aperto) return;
    function gestisciTastiera(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAperto(false);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const nuovoIndice =
          e.key === "ArrowDown" ? Math.min(evidenziato + 1, voci.length - 1) : Math.max(evidenziato - 1, 0);
        setEvidenziato(nuovoIndice);
        // Applica subito la scelta man mano che ci si sposta con le frecce, come un <select>
        // nativo, invece di aspettare Invio per confermare.
        const scelta = voci[nuovoIndice];
        if (scelta) onChange(scelta.chiave);
      } else if (e.key === "Enter") {
        const scelta = voci[evidenziato];
        if (scelta) {
          e.preventDefault();
          onChange(scelta.chiave);
          setAperto(false);
        }
      }
    }
    document.addEventListener("keydown", gestisciTastiera);
    return () => document.removeEventListener("keydown", gestisciTastiera);
  }, [aperto, voci, evidenziato, onChange]);

  useEffect(() => {
    opzioneRefs.current[evidenziato]?.scrollIntoView({ block: "nearest" });
  }, [evidenziato]);

  return (
    <div className="relative" data-tour={dataTour}>
      {aperto && <div className="fixed inset-0 z-10" onClick={() => setAperto(false)} />}

      <button
        onClick={() => (aperto ? setAperto(false) : apri())}
        // Con il menu chiuso basta che il bottone sia a fuoco (es. dopo un Tab) per cambiare
        // opzione con le frecce, senza doverlo prima aprire: stesso comportamento di un <select>
        // nativo. Con il menu aperto le frecce sono già gestite dal listener globale sopra.
        onKeyDown={(e) => {
          if (aperto) return;
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          const indiceCorrente = voci.findIndex((v) => v.chiave === istanza);
          const nuovoIndice =
            e.key === "ArrowDown"
              ? Math.min(indiceCorrente + 1, voci.length - 1)
              : Math.max(indiceCorrente - 1, 0);
          const scelta = voci[nuovoIndice];
          if (scelta) onChange(scelta.chiave);
        }}
        className="relative z-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {etichettaCorrente} ▾
      </button>

      {aperto && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {voci.map((v, idx) => (
            <button
              key={v.chiave}
              ref={(el) => {
                opzioneRefs.current[idx] = el;
              }}
              onMouseEnter={() => setEvidenziato(idx)}
              onClick={() => {
                onChange(v.chiave);
                setAperto(false);
              }}
              className={
                "block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 " +
                (idx === evidenziato ? "bg-slate-100 dark:bg-slate-800" : "")
              }
            >
              {v.etichetta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

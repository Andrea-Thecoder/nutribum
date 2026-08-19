import type { Periodo } from "../lib/aggregate";

const TUTTE_LE_OPZIONI: { valore: Periodo; etichetta: string }[] = [
  { valore: "giorno", etichetta: "Giorno" },
  { valore: "settimana", etichetta: "Settimana" },
  { valore: "mese", etichetta: "Mese" },
  { valore: "anno", etichetta: "Anno" },
];

export function SelettorePeriodo({
  periodo,
  onChange,
  opzioni,
}: {
  periodo: Periodo;
  onChange: (p: Periodo) => void;
  opzioni?: Periodo[];
}) {
  const daMostrare = opzioni
    ? TUTTE_LE_OPZIONI.filter((o) => opzioni.includes(o.valore))
    : TUTTE_LE_OPZIONI;

  return (
    <div
      // Ancora fissa per i mini-tour delle anteprime "?" (vedi lib/tourAnteprimaContenuti.tsx):
      // sempre lo stesso valore perché in ogni modale ne compare al massimo uno alla volta.
      data-tour="selettore-periodo"
      className="flex gap-1 self-start rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800"
    >
      {daMostrare.map((o) => (
        <button
          key={o.valore}
          onClick={() => onChange(o.valore)}
          className={
            "rounded-md px-2 py-1 font-medium transition " +
            (periodo === o.valore
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700")
          }
        >
          {o.etichetta}
        </button>
      ))}
    </div>
  );
}

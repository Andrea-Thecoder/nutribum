export interface VoceLegenda {
  etichetta: string;
  colore: string;
  tipo: "barra" | "linea";
}

// Sostituisce <Legend/> di Recharts quando un ComposedChart mescola Bar e Line: l'ordine che
// Recharts assegna in automatico in quel caso non segue l'ordine di dichiarazione JSX (barre e
// linee finiscono intrecciate quando la legenda va a capo su più righe) - qui l'ordine è quello
// dell'array passato, punto. Passata a <Legend content={...}/>, non usata da sola.
export function LegendaManuale({ voci }: { voci: VoceLegenda[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pt-1 text-xs text-slate-600 dark:text-slate-300">
      {voci.map((v) => (
        <li key={v.etichetta} data-tour={`legenda-${v.etichetta}`} className="flex items-center gap-1.5">
          {v.tipo === "barra" ? (
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: v.colore }} />
          ) : (
            <span className="inline-block h-0.5 w-3.5" style={{ backgroundColor: v.colore }} />
          )}
          {v.etichetta}
        </li>
      ))}
    </ul>
  );
}

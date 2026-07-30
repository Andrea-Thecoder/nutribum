import { useState } from "react";
import type { Periodo } from "../lib/aggregate";
import { elencoIstanze, etichettaPeriodo, TUTTO_IL_PERIODO } from "../lib/aggregate";

export function SelettoreIstanza({
  giorni,
  periodo,
  istanza,
  onChange,
  mostraTutto = true,
}: {
  giorni: { data: string }[];
  periodo: Periodo;
  istanza: string;
  onChange: (istanza: string) => void;
  // false nei pannelli dove "Tutto" non ha senso (es. confronto tra periodi: non si può
  // confrontare "tutto" con "il periodo prima di tutto").
  mostraTutto?: boolean;
}) {
  const [aperto, setAperto] = useState(false);
  const opzioni = elencoIstanze(giorni, periodo);
  const etichettaCorrente = istanza === TUTTO_IL_PERIODO ? "Tutto" : etichettaPeriodo(istanza, periodo);

  return (
    <div className="relative">
      {aperto && <div className="fixed inset-0 z-10" onClick={() => setAperto(false)} />}

      <button
        onClick={() => setAperto((a) => !a)}
        className="relative z-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {etichettaCorrente} ▾
      </button>

      {aperto && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {mostraTutto && (
            <button
              onClick={() => {
                onChange(TUTTO_IL_PERIODO);
                setAperto(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Tutto
            </button>
          )}
          {opzioni.map((o) => (
            <button
              key={o.chiave}
              onClick={() => {
                onChange(o.chiave);
                setAperto(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {o.etichetta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

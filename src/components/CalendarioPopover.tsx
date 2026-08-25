import { useEffect, useRef, useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { it } from "date-fns/locale";

const GIORNI_SETTIMANA = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];

interface CalendarioPopoverProps {
  value: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
  // Nessuna data oltre questa è selezionabile: i giorni successivi sono disattivati nella griglia
  // (non semplicemente corretti dopo la scelta), a differenza dell'<input type="date"> nativo il
  // cui calendario a comparsa (su WebKitGTK) lascia comunque cliccare le date future e non si
  // chiude cliccando fuori - motivo per cui esiste questo componente al posto di quello nativo.
  max?: Date;
}

export function CalendarioPopover({ value, onChange, max }: CalendarioPopoverProps) {
  const massimo = max ?? new Date();
  const massimoStr = format(massimo, "yyyy-MM-dd");
  const [aperto, setAperto] = useState(false);
  const [meseVisualizzato, setMeseVisualizzato] = useState(() => new Date(value));
  const containerRef = useRef<HTMLDivElement>(null);

  // Popover interamente nostro (non un widget nativo): un click fuori o Esc chiudono
  // affidabilmente, perché l'evento passa davvero dal DOM della pagina - non c'è nessun "grab" del
  // puntatore a livello di sistema come per il calendario nativo.
  useEffect(() => {
    if (!aperto) return;
    function chiudiSeFuori(e: MouseEvent) {
      if (containerRef.current && e.target instanceof Node && !containerRef.current.contains(e.target)) {
        setAperto(false);
      }
    }
    function chiudiConEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setAperto(false);
    }
    document.addEventListener("mousedown", chiudiSeFuori);
    document.addEventListener("keydown", chiudiConEsc);
    return () => {
      document.removeEventListener("mousedown", chiudiSeFuori);
      document.removeEventListener("keydown", chiudiConEsc);
    };
  }, [aperto]);

  function apri() {
    setMeseVisualizzato(new Date(value));
    setAperto(true);
  }

  const inizioGriglia = startOfWeek(startOfMonth(meseVisualizzato), { weekStartsOn: 1 });
  const fineGriglia = endOfWeek(endOfMonth(meseVisualizzato), { weekStartsOn: 1 });
  const giorniGriglia = eachDayOfInterval({ start: inizioGriglia, end: fineGriglia });
  const meseProssimoInteramenteFuturo =
    format(startOfMonth(addMonths(meseVisualizzato, 1)), "yyyy-MM-dd") > massimoStr;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => (aperto ? setAperto(false) : apri())}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-left text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        {format(new Date(value), "d MMMM yyyy", { locale: it })}
      </button>

      {aperto && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMeseVisualizzato((m) => subMonths(m, 1))}
              className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              ‹
            </button>
            <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
              {format(meseVisualizzato, "MMMM yyyy", { locale: it })}
            </span>
            <button
              type="button"
              onClick={() => setMeseVisualizzato((m) => addMonths(m, 1))}
              disabled={meseProssimoInteramenteFuturo}
              className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 dark:text-slate-500">
            {GIORNI_SETTIMANA.map((g) => (
              <div key={g} className="py-1">
                {g}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {giorniGriglia.map((giorno) => {
              const giornoStr = format(giorno, "yyyy-MM-dd");
              const fuoriMese = !isSameMonth(giorno, meseVisualizzato);
              const futuro = giornoStr > massimoStr;
              const selezionato = isSameDay(giorno, new Date(value));
              return (
                <button
                  type="button"
                  key={giornoStr}
                  disabled={futuro}
                  onClick={() => {
                    onChange(giornoStr);
                    setAperto(false);
                  }}
                  className={
                    "rounded py-1 text-xs " +
                    (futuro
                      ? "cursor-not-allowed text-slate-300 dark:text-slate-700"
                      : selezionato
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : fuoriMese
                          ? "text-slate-400 hover:bg-slate-200 dark:text-slate-600 dark:hover:bg-slate-800"
                          : "text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800")
                  }
                >
                  {format(giorno, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

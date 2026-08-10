import { memo, useEffect, useState } from "react";
import { addMonths, format, subMonths, isToday } from "date-fns";
import { it } from "date-fns/locale";
import type { GiornoStorico } from "../../lib/schema";
import { costruisciMese } from "../../lib/calendar";
import {
  elencaStoricoObiettivo,
  obiettivoEffettivo,
  calcolaSforamenti,
  limiteMinimoEffettivo,
  carenzaGrave,
  type PuntoStoricoObiettivo,
} from "../../lib/dailyGoal";
import { registraErroreNonBloccante } from "../../lib/errorLog";
import type { VocePeso } from "../../lib/weight";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";

const GIORNI_SETTIMANA = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

interface CalendarioPanelProps {
  giorni: GiornoStorico[];
  onApriGiorno: (chiave: string) => void;
  versioneObiettivi: number;
  peso: VocePeso[];
  storicoProfilo: PuntoStoricoProfilo[];
  storicoFitness: PuntoStoricoFitness[];
}

export const CalendarioPanel = memo(function CalendarioPanel({
  giorni,
  onApriGiorno,
  versioneObiettivi,
  peso,
  storicoProfilo,
  storicoFitness,
}: CalendarioPanelProps) {
  const [mese, setMese] = useState(() => new Date());
  const [storicoObiettivi, setStoricoObiettivi] = useState<PuntoStoricoObiettivo[]>([]);
  const celle = costruisciMese(mese, giorni);

  useEffect(() => {
    elencaStoricoObiettivo()
      .then(setStoricoObiettivi)
      .catch((err) => registraErroreNonBloccante(err, "Caricamento storico obiettivi (calendario) fallito"));
  }, [versioneObiettivi]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMese((m) => subMonths(m, 1))}
          className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ‹
        </button>
        <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
          {format(mese, "MMMM yyyy", { locale: it })}
        </span>
        <button
          onClick={() => setMese((m) => addMonths(m, 1))}
          className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
        {GIORNI_SETTIMANA.map((g) => (
          <div key={g}>{g}</div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 gap-1 select-none">
        {celle.map((cella) => {
          const cliccabile = cella.kcal !== null && !cella.fuoriMese;
          const obiettivoGiorno = obiettivoEffettivo(storicoObiettivi, cella.chiave);
          const sforamenti = cella.totali ? calcolaSforamenti(cella.totali, obiettivoGiorno) : [];
          const sfora = sforamenti.length > 0;
          // Rischio opposto allo sforamento: kcal consumate sotto il minimo effettivo (manuale o
          // BMR di fallback) - non può coesistere con "sfora" sulle kcal (il minimo è sempre <
          // massimo, imposto nella modale), quindi i due colori restano mutuamente esclusivi.
          const minimoKcal = limiteMinimoEffettivo(cella.chiave, obiettivoGiorno, storicoProfilo, storicoFitness, peso);
          const sottoMinimo = cella.totali !== null && minimoKcal !== null && cella.totali.kcal < minimoKcal;
          // Stesso colore ambra della carenza "semplice" (non un terzo colore che rischierebbe di
          // confondersi col rosso dello sforamento): solo l'icona cambia, a segnalare quanto è grave.
          const grave = cella.totali !== null && carenzaGrave(cella.totali.kcal, minimoKcal);
          // Colonna della settimana (0=Lun...6=Dom, la griglia parte da lunedì): il tooltip si
          // ancora al bordo vicino invece di restare sempre centrato, altrimenti nelle colonne
          // estreme finirebbe fuori dal pannello.
          const colonna = (cella.data.getDay() + 6) % 7;
          const posizioneTooltip = colonna <= 1 ? "left-0" : colonna >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";
          const kcalSforato = sforamenti.some((s) => s.etichetta === "Kcal (limite)");
          const macroSforato = sforamenti.some((s) => ["Proteine", "Carboidrati", "Grassi"].includes(s.etichetta));
          const altroSforato = sforamenti.some((s) => ["Fibre", "Sale"].includes(s.etichetta));
          const altriSforamenti = sforamenti.filter((s) => s.etichetta !== "Kcal (limite)");
          return (
            <div
              key={cella.chiave}
              onClick={() => {
                if (!cliccabile) return;
                onApriGiorno(cella.chiave);
              }}
              className={[
                "group relative flex flex-col items-center justify-center rounded-md border text-xs",
                cliccabile ? "cursor-pointer hover:brightness-125" : "",
                cella.fuoriMese
                  ? "border-transparent text-slate-300 dark:text-slate-700"
                  : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200",
                cella.kcal !== null && !cella.fuoriMese
                  ? sfora
                    ? "bg-red-100 dark:bg-red-500/20"
                    : sottoMinimo
                      ? "bg-amber-100 dark:bg-amber-500/20"
                      : "bg-blue-100 dark:bg-blue-500/20"
                  : "bg-transparent",
                isToday(cella.data) ? "ring-2 ring-blue-500" : "",
              ].join(" ")}
            >
              <span>{format(cella.data, "d")}</span>
              {cella.kcal !== null && (
                <span
                  className={
                    "text-[10px] font-semibold " +
                    (sfora
                      ? "text-red-700 dark:text-red-300"
                      : sottoMinimo
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-blue-700 dark:text-blue-300")
                  }
                >
                  {Math.round(cella.kcal)}
                </span>
              )}
              {sfora && (
                <div className="absolute right-0.5 top-0.5 flex flex-col gap-0.5 text-[11px] leading-none">
                  {kcalSforato && <span title="Kcal superate">🔥</span>}
                  {macroSforato && <span title="Macronutrienti superati">💪</span>}
                  {altroSforato && <span title="Altro superato (fibre/sale)">🧂</span>}
                </div>
              )}
              {!sfora && sottoMinimo && (
                <div className="absolute right-0.5 top-0.5 text-[11px] leading-none">
                  {grave ? (
                    <span title="Kcal molto sotto il minimo (meno del 25%)">🆘</span>
                  ) : (
                    <span title="Kcal sotto il minimo">⚠️</span>
                  )}
                </div>
              )}
              {!cella.fuoriMese && (
                <div
                  className={
                    "pointer-events-none absolute bottom-full z-30 mb-1 hidden w-max max-w-55 rounded bg-slate-800 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block " +
                    posizioneTooltip
                  }
                >
                  {cella.kcal === null ? (
                    "Dati assenti"
                  ) : (
                    <>
                      <div
                        className={
                          "whitespace-nowrap " +
                          (kcalSforato ? "text-red-300" : sottoMinimo ? "text-amber-300" : "")
                        }
                      >
                        {Math.round(cella.kcal)} kcal consumate
                        {obiettivoGiorno?.kcal != null && ` - Limite ${obiettivoGiorno.kcal}`}
                      </div>
                      {sottoMinimo && minimoKcal !== null && (
                        <div className="text-amber-300">
                          {grave ? "Molto sotto" : "Sotto"} il minimo di {Math.round(minimoKcal)}
                        </div>
                      )}
                      {altriSforamenti.length > 0 && (
                        <>
                          <div className="my-1 border-t border-white/20" />
                          {altriSforamenti.map((s) => (
                            <div key={s.etichetta} className="text-red-300">
                              {s.etichetta}: {Math.round(s.valore * 10) / 10} - Limite {s.limite}
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

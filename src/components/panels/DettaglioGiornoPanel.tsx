import { memo, useEffect, useState } from "react";
import type { Alimento, GiornoStorico } from "../../lib/schema";
import { totaliGiorno } from "../../lib/aggregate";
import {
  elencaStoricoObiettivo,
  obiettivoEffettivo,
  calcolaSforamenti,
  limiteMinimoEffettivo,
  type Sforamento,
  type PuntoStoricoObiettivo,
} from "../../lib/dailyGoal";
import { registraErroreNonBloccante } from "../../lib/errorLog";
import { useConferma } from "../ConfermaModal";
import type { VocePeso } from "../../lib/weight";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";

function dettaglioAlimento(a: Alimento): string {
  const parti: string[] = [
    `Proteine ${a.proteine_g.toFixed(1)}g`,
    `Carboidrati ${a.carboidrati_g.toFixed(1)}g`,
    `Grassi ${a.grassi_g.toFixed(1)}g`,
  ];
  if (a.zuccheri_g !== undefined) parti.push(`di cui zuccheri ${a.zuccheri_g.toFixed(1)}g`);
  if (a.grassi_saturi_g !== undefined) parti.push(`di cui saturi ${a.grassi_saturi_g.toFixed(1)}g`);
  if (a.fibre_g !== undefined) parti.push(`fibre ${a.fibre_g.toFixed(1)}g`);
  if (a.sale_g !== undefined) parti.push(`sale ${a.sale_g.toFixed(1)}g`);
  return parti.join(" · ");
}

export function SchedeGiorno({
  dataGiorni,
  tabAttiva,
  onCambiaTab,
  onChiudiTab,
}: {
  dataGiorni: string[];
  tabAttiva: string;
  onCambiaTab: (data: string) => void;
  onChiudiTab: (data: string) => void;
}) {
  return (
    <>
      {dataGiorni.map((data) => (
        <div key={data} className="flex shrink-0 items-center">
          <button
            onClick={() => onCambiaTab(data)}
            className={
              "rounded-l-md px-2 py-1 text-xs font-medium " +
              (data === tabAttiva
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600")
            }
          >
            {data}
          </button>
          <button
            onClick={() => onChiudiTab(data)}
            className={
              "rounded-r-md px-1 py-1 text-xs " +
              (data === tabAttiva
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600")
            }
            title="Chiudi scheda"
          >
            ✕
          </button>
        </div>
      ))}
    </>
  );
}

export const DettaglioGiornoPanel = memo(function DettaglioGiornoPanel({
  giorni,
  data,
  onElimina,
  versioneObiettivi,
  peso,
  storicoProfilo,
  storicoFitness,
}: {
  giorni: GiornoStorico[];
  data: string;
  onElimina: (data: string) => void;
  versioneObiettivi: number;
  peso: VocePeso[];
  storicoProfilo: PuntoStoricoProfilo[];
  storicoFitness: PuntoStoricoFitness[];
}) {
  const { chiedi, elemento: modaleConferma } = useConferma();
  const [storicoObiettivi, setStoricoObiettivi] = useState<PuntoStoricoObiettivo[]>([]);

  useEffect(() => {
    elencaStoricoObiettivo()
      .then(setStoricoObiettivi)
      .catch((err) => registraErroreNonBloccante(err, "Caricamento storico obiettivi (dettaglio giorno) fallito"));
  }, [versioneObiettivi]);

  if (data === "") {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nessun giorno aperto - clicca un giorno nel Calendario kcal per aggiungerlo qui.
      </p>
    );
  }

  const giorno = giorni.find((g) => g.data === data);

  if (!giorno) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nessun dato per {data} (forse è stato rimosso dallo storico).
      </p>
    );
  }

  const totali = totaliGiorno(giorno);
  // Il limite da confrontare è quello in vigore in QUEL giorno (storico), non quello attuale -
  // stessa logica già usata nel calendario e in "Progresso obiettivi".
  const obiettivoGiorno = obiettivoEffettivo(storicoObiettivi, data);
  const sforamenti = calcolaSforamenti(totali, obiettivoGiorno);
  const sforamentoDi = (etichetta: string): Sforamento | undefined =>
    sforamenti.find((s) => s.etichetta === etichetta);
  const sKcal = sforamentoDi("Kcal");
  const minimoKcal = limiteMinimoEffettivo(data, obiettivoGiorno, storicoProfilo, storicoFitness, peso);
  const sottoMinimo = !sKcal && minimoKcal !== null && totali.kcal < minimoKcal;
  const sProteine = sforamentoDi("Proteine");
  const sCarboidrati = sforamentoDi("Carboidrati");
  const sGrassi = sforamentoDi("Grassi");
  const sFibre = sforamentoDi("Fibre");
  const sSale = sforamentoDi("Sale");
  const haNonEtichetta = giorno.pasti.some((p) => p.alimenti.some((a) => a.da_etichetta === false));

  return (
    <div className="flex flex-col gap-3 pr-2 text-xs">
      {modaleConferma}

      {giorno.pasti.map((pasto, i) => (
        <div key={i}>
          <div className="mb-1 font-medium text-slate-500 dark:text-slate-400">
            {pasto.tipo ?? "Pasto"} {pasto.orario ? `· ${pasto.orario}` : ""}
          </div>
          <ul className="flex flex-col gap-0.5 pl-2">
            {pasto.alimenti.map((a, j) => (
              <li key={j} className="text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>
                    {a.nome} ({a.quantita}
                    {a.unita})
                    {a.da_etichetta === false && (
                      <sup
                        className="ml-0.5 text-amber-600 dark:text-amber-400"
                        title="Valore stimato, non da etichetta nutrizionale"
                      >
                        ~
                      </sup>
                    )}
                  </span>
                  <span>{Math.round(a.kcal)} kcal</span>
                </div>
                {dettaglioAlimento(a) && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {dettaglioAlimento(a)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex flex-col gap-0.5 border-t border-slate-200 pt-2 text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {haNonEtichetta && (
          <div className="text-[10px] italic text-amber-600 dark:text-amber-400">
            ~ Calcolato con valori stimati, non da etichetta nutrizionale
          </div>
        )}
        <div
          className={
            sKcal
              ? "text-red-600 dark:text-red-400"
              : sottoMinimo
                ? "text-amber-600 dark:text-amber-400"
                : ""
          }
        >
          {Math.round(totali.kcal)} kcal{sKcal && ` (limite ${sKcal.limite})`}
          {sottoMinimo && minimoKcal !== null && ` (sotto il minimo di ${Math.round(minimoKcal)})`}
        </div>
        <div className={sProteine ? "text-red-600 dark:text-red-400" : ""}>
          Proteine {totali.proteine_g.toFixed(1)}g{sProteine && ` (limite ${sProteine.limite})`}
        </div>
        <div className={sCarboidrati ? "text-red-600 dark:text-red-400" : ""}>
          Carboidrati {totali.carboidrati_g.toFixed(1)}g{sCarboidrati && ` (limite ${sCarboidrati.limite})`}
        </div>
        {totali.zuccheri_g > 0 && <div className="pl-4">di cui zuccheri {totali.zuccheri_g.toFixed(1)}g</div>}
        <div className={sGrassi ? "text-red-600 dark:text-red-400" : ""}>
          Grassi {totali.grassi_g.toFixed(1)}g{sGrassi && ` (limite ${sGrassi.limite})`}
        </div>
        {totali.grassi_saturi_g > 0 && <div className="pl-4">di cui saturi {totali.grassi_saturi_g.toFixed(1)}g</div>}
        {totali.fibre_g > 0 && (
          <div className={sFibre ? "text-red-600 dark:text-red-400" : ""}>
            Fibre {totali.fibre_g.toFixed(1)}g{sFibre && ` (limite ${sFibre.limite})`}
          </div>
        )}
        {totali.sale_g > 0 && (
          <div className={sSale ? "text-red-600 dark:text-red-400" : ""}>
            Sale {totali.sale_g.toFixed(1)}g{sSale && ` (limite ${sSale.limite})`}
          </div>
        )}
      </div>

      <button
        onClick={async () => {
          const ok = await chiedi(`Eliminare definitivamente il giorno ${data} dallo storico?`, {
            distruttivo: true,
          });
          if (ok) onElimina(data);
        }}
        className="self-start rounded border border-red-300 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        Elimina giorno
      </button>
    </div>
  );
});

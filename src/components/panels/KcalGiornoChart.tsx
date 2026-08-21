import { memo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { GiornoStorico } from "../../lib/schema";
import {
  raggruppaPerPeriodo,
  filtraIstanza,
  periodoFine,
  TUTTO_IL_PERIODO,
  type Periodo,
  type FocusGiorno,
} from "../../lib/aggregate";
import type { PuntoStoricoObiettivo } from "../../lib/dailyGoal";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { accumulaRiferimenti } from "../../lib/accumulaRiferimenti";
import { useIsDarkMode } from "../../lib/useIsDarkMode";
import { SelettorePeriodo } from "../SelettorePeriodo";
import { SelettoreIstanza } from "../SelettoreIstanza";
import { LegendaManuale } from "./LegendaManuale";
import type { VocePeso } from "../../lib/weight";

// Memoizzato: App.tsx si ri-renderizza per motivi che non riguardano questo grafico (es. un altro
// pannello aggiunto/spostato) - senza memo, ricalcolerebbe le aggregazioni e ridisegnerebbe l'SVG
// anche quando i suoi dati (giorni/focusGiorno) non sono affatto cambiati.
export const KcalGiornoChart = memo(function KcalGiornoChart({
  giorni,
  focusGiorno,
  storicoObiettivi,
  peso,
  storicoProfilo,
  storicoFitness,
}: {
  giorni: GiornoStorico[];
  focusGiorno?: FocusGiorno | null;
  storicoObiettivi: PuntoStoricoObiettivo[];
  peso: VocePeso[];
  storicoProfilo: PuntoStoricoProfilo[];
  storicoFitness: PuntoStoricoFitness[];
}) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);
  const [periodo, setPeriodo] = useState<Periodo>("giorno");
  const [istanza, setIstanza] = useState<string>(TUTTO_IL_PERIODO);

  useEffect(() => {
    if (!focusGiorno) return;
    setPeriodo("giorno");
    setIstanza(focusGiorno.data);
  }, [focusGiorno]);

  if (giorni.length === 0) {
    return <VuotoMessage />;
  }

  const giorniBase = filtraIstanza(giorni, periodo, istanza);
  const periodoEffettivo = istanza === TUTTO_IL_PERIODO ? periodo : periodoFine(periodo);
  const datiBase = raggruppaPerPeriodo(giorniBase, periodoEffettivo);

  // Le barre kcal sono già una somma sui giorni del periodo (settimana/mese/anno) - le due linee
  // di riferimento sono valori giornalieri, quindi per restare comparabili con la barra si somma
  // anche limite/TDEE sui giorni dello stesso bucket, invece di limitarsi a mostrarle solo per
  // periodoEffettivo === "giorno" (dove la somma di 1 giorno equivale al valore giornaliero).
  const riferimenti = accumulaRiferimenti(
    giorniBase,
    periodoEffettivo,
    storicoObiettivi,
    storicoProfilo,
    storicoFitness,
    peso,
  );
  const dati = datiBase.map((d) => ({
    ...d,
    ...(riferimenti.get(d.chiave) ?? {
      limiteKcal: null,
      tdeeStimato: null,
      limiteKcalMin: null,
      bmrStimato: null,
    }),
  }));
  const suffissoSomma = periodoEffettivo === "giorno" ? "" : " (somma periodo)";

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SelettorePeriodo
          periodo={periodo}
          onChange={(p) => {
            setPeriodo(p);
            setIstanza(TUTTO_IL_PERIODO);
          }}
        />
        <SelettoreIstanza giorni={giorni} periodo={periodo} istanza={istanza} onChange={setIstanza} />
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dati}>
            <CartesianGrid stroke={colori.griglia} />
            <XAxis dataKey="chiave" fontSize={12} stroke={colori.asse} />
            <YAxis fontSize={12} stroke={colori.asse} />
            <Tooltip {...stileTooltip(isDark)} />
            <Legend
              content={() => (
                <LegendaManuale
                  voci={[
                    { etichetta: "Kcal consumate", colore: colori.kcal, tipo: "barra" },
                    { etichetta: "Limite massimo", colore: colori.limite, tipo: "linea" },
                    { etichetta: "TDEE stimato", colore: colori.tdee, tipo: "linea" },
                    { etichetta: "Limite minimo", colore: colori.limiteMin, tipo: "linea" },
                    { etichetta: "BMR stimato", colore: colori.bmr, tipo: "linea" },
                  ]}
                />
              )}
            />
            <Bar dataKey="kcal" name="Kcal consumate" fill={colori.kcal} radius={[4, 4, 0, 0]} />
            {/* Quando limite e TDEE coincidono (es. col checkbox "usa TDEE calcolato" nel modale
                limite kcal) le due linee finiscono esattamente sullo stesso pixel - nessun colore
                risolve una sovrapposizione perfetta. Due ritmi di tratteggio diversi (corto/fitto vs
                lungo/largo) restano leggibili anche in quel caso: i tratti dell'una si intravedono
                nelle fessure dell'altra invece di sparire del tutto sotto una linea continua. */}
            <Line
              type="stepAfter"
              dataKey="limiteKcal"
              name={`Limite massimo${suffissoSomma}`}
              stroke={colori.limite}
              strokeDasharray="4 3"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="tdeeStimato"
              name={`TDEE stimato${suffissoSomma}`}
              stroke={colori.tdee}
              strokeDasharray="12 6"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="stepAfter"
              dataKey="limiteKcalMin"
              name={`Limite minimo${suffissoSomma}`}
              stroke={colori.limiteMin}
              strokeDasharray="4 3"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="bmrStimato"
              name={`BMR stimato${suffissoSomma}`}
              stroke={colori.bmr}
              strokeDasharray="12 6"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export function VuotoMessage() {
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      Nessun giorno importato ancora.
    </p>
  );
}

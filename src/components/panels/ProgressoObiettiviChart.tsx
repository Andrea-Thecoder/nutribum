import { memo, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import type { GiornoStorico } from "../../lib/schema";
import {
  filtraIstanza,
  elencoIstanze,
  chiavePeriodo,
  type Periodo,
  type FocusGiorno,
} from "../../lib/aggregate";
import {
  elencaStoricoObiettivo,
  percentualiMedie,
  percentualeTDEE,
  type PuntoStoricoObiettivo,
  type PercentualeMetrica,
} from "../../lib/dailyGoal";
import { registraErroreNonBloccante } from "../../lib/errorLog";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";
import { SelettorePeriodo } from "../SelettorePeriodo";
import { SelettoreIstanza } from "../SelettoreIstanza";
import type { VocePeso } from "../../lib/weight";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";

interface ProgressoObiettiviChartProps {
  giorni: GiornoStorico[];
  versioneObiettivi: number;
  focusGiorno?: FocusGiorno | null;
  peso: VocePeso[];
  storicoProfilo: PuntoStoricoProfilo[];
  storicoFitness: PuntoStoricoFitness[];
  // Salta la lettura reale (elencaStoricoObiettivo, non ricevuta via prop come le altre) e usa
  // questi dati - solo per l'anteprima "?" della scheda (vedi anteprimaPannelli.tsx), MAI in
  // produzione.
  storicoObiettiviOverride?: PuntoStoricoObiettivo[];
}

// Colori di stato (entro/oltre il limite): validati con lo script del design-system per entrambe
// le modalità - non riusano le tinte categoriali dei singoli nutrienti perché qui il colore
// codifica uno stato (entro/oltre), non l'identità del nutriente (già data dall'etichetta).
const COLORE_ENTRO = { chiaro: "#3b82f6", scuro: "#3b82f6" };
const COLORE_OLTRE = { chiaro: "#ef4444", scuro: "#dc2626" };

const PERIODI_DISPONIBILI: Periodo[] = ["giorno", "settimana", "mese"];

// Tetto visivo per la lunghezza della barra: un limite impostato troppo basso per errore (es. un
// residuo di test) può produrre percentuali a 4-5 cifre, che fanno scalare il grafico fino a
// spingere l'etichetta fuori dalla scheda. Oltre questa soglia la barra si ferma qui e l'etichetta
// mostra "+", ma il valore vero resta sempre visibile nel tooltip.
const PERCENTUALE_VISIVA_MASSIMA = 300;

// Istanza di default: quella che contiene "oggi" (il giorno/la settimana/il mese corrente), o la
// più recente disponibile se oggi non ha ancora dati - evita di aprire il grafico su "Tutto" per
// un widget che ha senso soprattutto per guardare l'andamento più recente.
function istanzaPredefinita(giorni: GiornoStorico[], periodo: Periodo): string {
  const chiaveOggi = chiavePeriodo(format(new Date(), "yyyy-MM-dd"), periodo);
  const opzioni = elencoIstanze(giorni, periodo);
  return opzioni.some((o) => o.chiave === chiaveOggi) ? chiaveOggi : (opzioni[0]?.chiave ?? chiaveOggi);
}

// Tooltip custom: oltre alla percentuale mostra il valore assoluto medio e il limite medio del
// periodo (su un singolo giorno coincidono col valore/limite di quel giorno).
function ContenutoTooltipProgresso(props: {
  active?: boolean;
  payload?: { payload: PercentualeMetrica }[];
  isDark: boolean;
}) {
  const { active, payload, isDark } = props;
  if (!active || !payload || payload.length === 0) return null;
  const stile = stileTooltip(isDark);
  const d = payload[0]!.payload;
  const unita = d.chiave.startsWith("Kcal") ? "kcal" : "g";

  return (
    <div style={stile.contentStyle}>
      <div style={stile.labelStyle}>{d.chiave}</div>
      <div style={stile.itemStyle}>{d.percentuale}% del limite</div>
      <div style={stile.itemStyle}>
        {d.valoreMedio} / {d.limiteMedio} {unita}
      </div>
    </div>
  );
}

export const ProgressoObiettiviChart = memo(function ProgressoObiettiviChart({
  giorni,
  versioneObiettivi,
  focusGiorno,
  peso,
  storicoProfilo,
  storicoFitness,
  storicoObiettiviOverride,
}: ProgressoObiettiviChartProps) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);
  const [storicoObiettivi, setStoricoObiettivi] = useState<PuntoStoricoObiettivo[]>(storicoObiettiviOverride ?? []);
  const [periodo, setPeriodo] = useState<Periodo>("giorno");
  const [istanza, setIstanza] = useState<string>(() => istanzaPredefinita(giorni, "giorno"));

  useEffect(() => {
    if (storicoObiettiviOverride) return;
    elencaStoricoObiettivo()
      .then(setStoricoObiettivi)
      .catch((err) => registraErroreNonBloccante(err, "Caricamento storico obiettivi (progresso) fallito"));
  }, [versioneObiettivi, storicoObiettiviOverride]);

  useEffect(() => {
    if (!focusGiorno) return;
    setPeriodo("giorno");
    setIstanza(focusGiorno.data);
  }, [focusGiorno]);

  if (giorni.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Nessun giorno registrato ancora.</p>;
  }

  const giorniFiltrati = filtraIstanza(giorni, periodo, istanza);
  const metrichePercentuali = percentualiMedie(giorniFiltrati, storicoObiettivi);
  const metricaTdee = percentualeTDEE(giorniFiltrati, storicoProfilo, storicoFitness, peso);
  // Inserita subito dopo "Kcal (limite)", non in coda: le due righe riguardano la stessa metrica
  // (kcal consumate) confrontata con due riferimenti diversi, ha senso vederle vicine invece che
  // separate da proteine/carboidrati/grassi/fibre/sale in mezzo.
  const indiceKcalLimite = metrichePercentuali.findIndex((m) => m.chiave === "Kcal (limite)");
  const metriche = metricaTdee
    ? [
        ...metrichePercentuali.slice(0, indiceKcalLimite + 1),
        metricaTdee,
        ...metrichePercentuali.slice(indiceKcalLimite + 1),
      ]
    : metrichePercentuali;
  const dati = metriche.map((d) => ({
    ...d,
    percentualeVisiva: Math.min(d.percentuale, PERCENTUALE_VISIVA_MASSIMA),
  }));

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SelettorePeriodo
          periodo={periodo}
          opzioni={PERIODI_DISPONIBILI}
          onChange={(p) => {
            setPeriodo(p);
            setIstanza(istanzaPredefinita(giorni, p));
          }}
        />
        <SelettoreIstanza giorni={giorni} periodo={periodo} istanza={istanza} onChange={setIstanza} />
      </div>

      {dati.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nessun limite impostato ancora - Impostazioni → "Imposta limite giornaliero di…".
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dati} layout="vertical" margin={{ left: 8, right: 40, top: 8, bottom: 8 }}>
              <CartesianGrid stroke={colori.griglia} horizontal={false} />
              <XAxis
                type="number"
                // Dominio fisso (non più calcolato dal valore massimo): un limite impostato troppo
                // basso per errore può produrre percentuali a 4-5 cifre, che con un dominio dinamico
                // spingerebbero l'etichetta fuori dalla scheda. Oltre PERCENTUALE_VISIVA_MASSIMA la
                // barra si ferma qui (vedi percentualeVisiva), il valore vero resta nel tooltip.
                domain={[0, PERCENTUALE_VISIVA_MASSIMA + 30]}
                unit="%"
                fontSize={11}
                stroke={colori.asse}
              />
              <YAxis type="category" dataKey="chiave" width={80} fontSize={11} stroke={colori.asse} />
              <ReferenceLine x={100} stroke={colori.asse} strokeDasharray="4 4" />
              <Tooltip
                content={(p: object) => <ContenutoTooltipProgresso {...p} isDark={isDark} />}
                cursor={stileTooltip(isDark).cursor}
              />
              <Bar dataKey="percentualeVisiva" radius={[0, 4, 4, 0]}>
                {dati.map((d) => (
                  <Cell
                    key={d.chiave}
                    fill={d.sopraLimite ? COLORE_OLTRE[isDark ? "scuro" : "chiaro"] : COLORE_ENTRO[isDark ? "scuro" : "chiaro"]}
                  />
                ))}
                <LabelList
                  dataKey="percentuale"
                  position="right"
                  formatter={(v) => {
                    const n = Number(v);
                    const testo = n.toFixed(2);
                    return n > PERCENTUALE_VISIVA_MASSIMA ? `${testo}%+` : `${testo}%`;
                  }}
                  fill={colori.asse}
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

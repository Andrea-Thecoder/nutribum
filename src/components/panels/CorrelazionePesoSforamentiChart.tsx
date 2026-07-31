import { memo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { GiornoStorico } from "../../lib/schema";
import type { PuntoStoricoObiettivo } from "../../lib/dailyGoal";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";
import type { VocePeso } from "../../lib/weight";
import { classificaGiornoKcal, analizzaCorrelazionePeso } from "../../lib/correlazionePeso";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";

// Colori di stato (sforato/pulito), non le tinte categoriali del resto dei grafici: qui il colore
// codifica un giudizio binario sul giorno, stesso criterio già usato in ProgressoObiettiviChart
// (COLORE_ENTRO/COLORE_OLTRE) per coerenza visiva tra pannelli che esprimono lo stesso concetto.
const COLORE_SFORATO = { chiaro: "#ef4444", scuro: "#dc2626" };
const COLORE_PULITO = { chiaro: "#3b82f6", scuro: "#3b82f6" };

interface PuntoGrafico {
  chiave: string;
  peso: number;
  classificazione: "sforato" | "pulito" | null;
}

function PuntoClassificato(
  props: { cx?: number; cy?: number; payload?: PuntoGrafico },
  isDark: boolean,
  coloreDefault: string,
) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  if (payload.classificazione === null) {
    return <circle cx={cx} cy={cy} r={2} fill={coloreDefault} stroke="none" />;
  }
  const colore =
    payload.classificazione === "sforato" ? COLORE_SFORATO[isDark ? "scuro" : "chiaro"] : COLORE_PULITO[isDark ? "scuro" : "chiaro"];
  return <circle cx={cx} cy={cy} r={4} fill={colore} stroke="none" />;
}

export const CorrelazionePesoSforamentiChart = memo(function CorrelazionePesoSforamentiChart({
  giorni,
  peso,
  storicoObiettivi,
  storicoProfilo,
  storicoFitness,
}: {
  giorni: GiornoStorico[];
  peso: VocePeso[];
  storicoObiettivi: PuntoStoricoObiettivo[];
  storicoProfilo: PuntoStoricoProfilo[];
  storicoFitness: PuntoStoricoFitness[];
}) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);

  if (peso.length === 0 || giorni.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Servono sia un diario alimentare che pesate registrate per calcolare questa analisi.
      </p>
    );
  }

  // Per il grafico: classificazione di OGNI giorno del diario alimentare che ne ha una (kcal-only,
  // vedi classificaGiornoKcal), indipendente da avere anche il peso 4 giorni dopo - qui serve solo a
  // colorare i punti sulla linea del peso, non a calcolare le medie (quello lo fa analizzaCorrelazionePeso).
  const classificazionePerData = new Map<string, "sforato" | "pulito">();
  for (const g of giorni) {
    const c = classificaGiornoKcal(g, storicoObiettivi, storicoProfilo, storicoFitness, peso);
    if (c !== null) classificazionePerData.set(g.data, c);
  }
  const datiGrafico: PuntoGrafico[] = peso.map((v) => ({
    chiave: v.data,
    peso: v.pesoKg,
    classificazione: classificazionePerData.get(v.data) ?? null,
  }));

  const risultato = analizzaCorrelazionePeso(giorni, peso, storicoObiettivi, storicoProfilo, storicoFitness);
  const datiInsufficienti = risultato.mediaSforatiKg === null || risultato.mediaPulitiKg === null;

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Ogni punto è colorato in base a quel giorno: <span className="font-medium text-red-600 dark:text-red-400">rosso</span> se
        hai sforato le kcal, <span className="font-medium text-blue-600 dark:text-blue-400">blu</span> se sei stato entro il
        limite. Confronto: variazione media di peso {risultato.finestraGiorni} giorni dopo uno sforamento vs dopo un giorno
        pulito, corretta per il tuo ritmo di variazione di base.
      </p>

      <div className="h-40 min-h-0 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datiGrafico}>
            <CartesianGrid stroke={colori.griglia} />
            <XAxis
              dataKey="chiave"
              tickFormatter={(v: string) => format(new Date(v), "d MMM", { locale: it })}
              fontSize={11}
              stroke={colori.asse}
            />
            <YAxis domain={["auto", "auto"]} fontSize={11} stroke={colori.asse} unit=" kg" />
            <Tooltip
              {...stileTooltip(isDark)}
              labelFormatter={(v) => format(new Date(String(v)), "d MMMM yyyy", { locale: it })}
              formatter={(v, _nome, item) => {
                const c = (item?.payload as PuntoGrafico | undefined)?.classificazione;
                const etichetta = c === "sforato" ? "sforato" : c === "pulito" ? "pulito" : "nessun limite quel giorno";
                return [`${v} kg (${etichetta})`, "Peso"];
              }}
            />
            <Line
              type="monotone"
              dataKey="peso"
              stroke={colori.peso}
              strokeWidth={1.5}
              dot={(p: object) => PuntoClassificato(p as { cx?: number; cy?: number; payload?: PuntoGrafico }, isDark, colori.peso)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-2 text-center dark:border-slate-700">
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Dopo sforamento (n={risultato.nSforati})
          </div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {risultato.mediaSforatiKg === null ? "-" : `${risultato.mediaSforatiKg > 0 ? "+" : ""}${risultato.mediaSforatiKg} kg`}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Dopo giorno pulito (n={risultato.nPuliti})</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {risultato.mediaPulitiKg === null ? "-" : `${risultato.mediaPulitiKg > 0 ? "+" : ""}${risultato.mediaPulitiKg} kg`}
          </div>
        </div>
        {datiInsufficienti ? (
          <p className="col-span-2 text-xs text-slate-400 dark:text-slate-500">
            Dati insufficienti per un confronto affidabile - servono almeno {risultato.sogliaMinimaCampioni} giorni per
            gruppo con una pesata sia il giorno stesso che {risultato.finestraGiorni} giorni dopo.
          </p>
        ) : (
          <p className="col-span-2 text-xs text-slate-600 dark:text-slate-300">
            Differenza: <span className="font-semibold">{risultato.differenzaKg! > 0 ? "+" : ""}{risultato.differenzaKg} kg</span>
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400 dark:text-slate-500">
              <th className="pb-1.5 font-medium">Data</th>
              <th className="pb-1.5 font-medium">Giorno</th>
              <th className="pb-1.5 text-right font-medium">Peso base</th>
              <th className="pb-1.5 text-right font-medium">
                Peso +{risultato.finestraGiorni}gg
              </th>
              <th className="pb-1.5 text-right font-medium">Δ grezzo</th>
              <th className="pb-1.5 text-right font-medium">Δ corretto</th>
            </tr>
          </thead>
          <tbody>
            {risultato.punti.map((p) => (
              <tr key={p.data} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 text-slate-600 dark:text-slate-300">
                  {format(new Date(p.data), "d MMM yyyy", { locale: it })}
                </td>
                <td className="py-1.5">
                  <span
                    className={
                      p.classificazione === "sforato"
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400"
                    }
                  >
                    {p.classificazione === "sforato" ? "Sforato" : "Pulito"}
                  </span>
                </td>
                <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">{p.pesoBaseKg.toFixed(1)} kg</td>
                <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">{p.pesoDopoKg.toFixed(1)} kg</td>
                <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                  {p.deltaGrezzoKg > 0 ? "+" : ""}
                  {p.deltaGrezzoKg} kg
                </td>
                <td className="py-1.5 text-right font-medium text-slate-700 dark:text-slate-200">
                  {p.deltaCorrettoKg > 0 ? "+" : ""}
                  {p.deltaCorrettoKg} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {risultato.punti.length === 0 && (
          <p className="pt-2 text-slate-500 dark:text-slate-400">
            Nessun giorno con sia un dato kcal classificabile che pesate a {risultato.finestraGiorni} giorni di distanza.
          </p>
        )}
      </div>
    </div>
  );
});

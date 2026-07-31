import { memo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { stimaTDEEAllaData } from "../../lib/tdee";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../../lib/profile";
import type { VocePeso } from "../../lib/weight";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";

interface PuntoTDEE {
  chiave: string;
  bmr: number;
  tdee: number;
}

// Memoizzato come gli altri grafici storico/andamento (vedi AndamentoObiettiviChart): senza,
// ricalcolerebbe la stima per ogni pesata ad ogni render di App.tsx non collegato a questo pannello.
export const AndamentoTDEEChart = memo(function AndamentoTDEEChart({
  peso,
  storicoProfilo,
  storicoFitness,
}: {
  peso: VocePeso[];
  storicoProfilo: PuntoStoricoProfilo[];
  storicoFitness: PuntoStoricoFitness[];
}) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);

  // Un punto per ogni pesata registrata: è la fonte che cambia più spesso tra le tre che alimentano
  // il TDEE (età/altezza/sesso e livello attività cambiano raramente in confronto) - dà una linea
  // naturalmente densa senza dover inventare date artificiali per cui non esiste un peso reale.
  // Le pesate precedenti al primo profilo mai impostato restano fuori (stimaTDEEAllaData torna
  // null), non hanno un TDEE calcolabile.
  const dati: PuntoTDEE[] = peso
    .map((v) => {
      const risultato = stimaTDEEAllaData(v.data, storicoProfilo, storicoFitness, peso);
      return risultato ? { chiave: v.data, bmr: risultato.bmr, tdee: risultato.tdee } : null;
    })
    .filter((d): d is PuntoTDEE => d !== null);

  if (dati.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nessun dato ancora - serve un profilo impostato (NavBar → Diario Alimentare → Profilo (per il
        TDEE)…) e almeno una pesata registrata da quel momento in poi.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dati}>
            <CartesianGrid stroke={colori.griglia} />
            <XAxis
              dataKey="chiave"
              tickFormatter={(v: string) => format(new Date(v), "d MMM", { locale: it })}
              fontSize={11}
              stroke={colori.asse}
            />
            <YAxis domain={["auto", "auto"]} fontSize={11} stroke={colori.asse} unit=" kcal" />
            <Tooltip
              {...stileTooltip(isDark)}
              labelFormatter={(v) => format(new Date(String(v)), "d MMMM yyyy", { locale: it })}
              formatter={(v, nome) => [`${v} kcal`, nome]}
            />
            <Legend />
            <Line type="monotone" dataKey="tdee" name="TDEE (mantenimento)" stroke={colori.tdee} strokeWidth={2} dot={{ r: 3 }} />
            <Line
              type="monotone"
              dataKey="bmr"
              name="BMR (a riposo)"
              stroke={colori.asse}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

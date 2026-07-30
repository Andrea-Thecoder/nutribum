import { memo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { GiornoStorico } from "../../lib/schema";
import {
  conteggioAlimenti,
  filtraIstanza,
  elencoIstanze,
  chiavePeriodo,
  TUTTO_IL_PERIODO,
  type Periodo,
  type FocusGiorno,
} from "../../lib/aggregate";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";
import { VuotoMessage } from "./KcalGiornoChart";
import { SelettorePeriodo } from "../SelettorePeriodo";
import { SelettoreIstanza } from "../SelettoreIstanza";

export const TopAlimentiFrequenzaChart = memo(function TopAlimentiFrequenzaChart({
  giorni,
  focusGiorno,
}: {
  giorni: GiornoStorico[];
  focusGiorno?: FocusGiorno | null;
}) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);
  const [periodo, setPeriodoState] = useState<Periodo>("settimana");
  const [istanza, setIstanza] = useState<string>(
    () => elencoIstanze(giorni, "settimana")[0]?.chiave ?? TUTTO_IL_PERIODO,
  );

  // Questo grafico non offre il periodo "giorno" (opzioni sotto): il focus si allinea alla
  // settimana che contiene il giorno scelto, la granularità più fine disponibile qui.
  useEffect(() => {
    if (!focusGiorno) return;
    setPeriodoState("settimana");
    setIstanza(chiavePeriodo(focusGiorno.data, "settimana"));
  }, [focusGiorno]);

  if (giorni.length === 0) {
    return <VuotoMessage />;
  }

  function cambiaPeriodo(nuovo: Periodo) {
    setPeriodoState(nuovo);
    setIstanza(elencoIstanze(giorni, nuovo)[0]?.chiave ?? TUTTO_IL_PERIODO);
  }

  const giorniFiltrati = filtraIstanza(giorni, periodo, istanza);
  const dati = [...conteggioAlimenti(giorniFiltrati).entries()]
    .map(([nome, volte]) => ({ nome, volte }))
    .sort((a, b) => b.volte - a.volte)
    .slice(0, 10);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SelettorePeriodo
          periodo={periodo}
          onChange={cambiaPeriodo}
          opzioni={["settimana", "mese", "anno"]}
        />
        <SelettoreIstanza giorni={giorni} periodo={periodo} istanza={istanza} onChange={setIstanza} />
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dati} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid stroke={colori.griglia} />
            <XAxis type="number" allowDecimals={false} fontSize={12} stroke={colori.asse} />
            <YAxis type="category" dataKey="nome" width={120} fontSize={12} stroke={colori.asse} />
            <Tooltip {...stileTooltip(isDark)} formatter={(v) => [`${v} volte`, "Consumato"]} />
            <Bar dataKey="volte" fill={colori.proteine} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

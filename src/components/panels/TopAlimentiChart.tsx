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
  totaliPerAlimento,
  filtraIstanza,
  elencoIstanze,
  TUTTO_IL_PERIODO,
  type Periodo,
  type FocusGiorno,
} from "../../lib/aggregate";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";
import { VuotoMessage } from "./KcalGiornoChart";
import { SelettorePeriodo } from "../SelettorePeriodo";
import { SelettoreIstanza } from "../SelettoreIstanza";

export const TopAlimentiChart = memo(function TopAlimentiChart({
  giorni,
  focusGiorno,
}: {
  giorni: GiornoStorico[];
  focusGiorno?: FocusGiorno | null;
}) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);
  const [periodo, setPeriodoState] = useState<Periodo>("giorno");
  const [istanza, setIstanza] = useState<string>(
    () => elencoIstanze(giorni, "giorno")[0]?.chiave ?? TUTTO_IL_PERIODO,
  );

  useEffect(() => {
    if (!focusGiorno) return;
    setPeriodoState("giorno");
    setIstanza(focusGiorno.data);
  }, [focusGiorno]);

  if (giorni.length === 0) {
    return <VuotoMessage />;
  }

  function cambiaPeriodo(nuovo: Periodo) {
    setPeriodoState(nuovo);
    setIstanza(elencoIstanze(giorni, nuovo)[0]?.chiave ?? TUTTO_IL_PERIODO);
  }

  const giorniFiltrati = filtraIstanza(giorni, periodo, istanza);
  const dati = [...totaliPerAlimento(giorniFiltrati).entries()]
    .map(([nome, t]) => ({ nome, kcal: t.kcal }))
    .sort((a, b) => b.kcal - a.kcal)
    .slice(0, 10);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SelettorePeriodo periodo={periodo} onChange={cambiaPeriodo} />
        <SelettoreIstanza giorni={giorni} periodo={periodo} istanza={istanza} onChange={setIstanza} />
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dati} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid stroke={colori.griglia} />
            <XAxis type="number" fontSize={12} stroke={colori.asse} />
            <YAxis type="category" dataKey="nome" width={120} fontSize={12} stroke={colori.asse} />
            <Tooltip {...stileTooltip(isDark)} />
            <Bar dataKey="kcal" fill={colori.kcal} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

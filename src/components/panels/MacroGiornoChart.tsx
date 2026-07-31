import { memo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
import { accumulaLimitiPeriodo, type PuntoStoricoObiettivo } from "../../lib/dailyGoal";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";
import { VuotoMessage } from "./KcalGiornoChart";
import { LegendaManuale } from "./LegendaManuale";
import { SelettorePeriodo } from "../SelettorePeriodo";
import { SelettoreIstanza } from "../SelettoreIstanza";

const CAMPI_MACRO = ["proteineG", "carboidratiG", "grassiG"] as const;

export const MacroGiornoChart = memo(function MacroGiornoChart({
  giorni,
  focusGiorno,
  storicoObiettivi,
}: {
  giorni: GiornoStorico[];
  focusGiorno?: FocusGiorno | null;
  storicoObiettivi: PuntoStoricoObiettivo[];
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
  const limiti = accumulaLimitiPeriodo(giorniBase, periodoEffettivo, storicoObiettivi, [...CAMPI_MACRO]);
  const dati = datiBase.map((d) => ({
    ...d,
    ...(limiti.get(d.chiave) ?? { proteineG: null, carboidratiG: null, grassiG: null }),
  }));

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
                    { etichetta: "Proteine", colore: colori.proteine, tipo: "barra" },
                    { etichetta: "Carboidrati", colore: colori.carboidrati, tipo: "barra" },
                    { etichetta: "Grassi", colore: colori.grassi, tipo: "barra" },
                    { etichetta: "Limite proteine", colore: colori.proteine, tipo: "linea" },
                    { etichetta: "Limite carboidrati", colore: colori.carboidrati, tipo: "linea" },
                    { etichetta: "Limite grassi", colore: colori.grassi, tipo: "linea" },
                  ]}
                />
              )}
            />
            <Bar dataKey="proteine_g" name="Proteine" fill={colori.proteine} radius={[4, 4, 0, 0]} />
            <Bar
              dataKey="carboidrati_g"
              name="Carboidrati"
              fill={colori.carboidrati}
              radius={[4, 4, 0, 0]}
            />
            <Bar dataKey="grassi_g" name="Grassi" fill={colori.grassi} radius={[4, 4, 0, 0]} />
            {/* Linee limite tratteggiate, stesso colore del proprio macronutriente (associazione
                immediata bar↔limite) - ritmi di tratteggio diversi tra loro per restare leggibili
                anche quando due limiti coincidono (stesso motivo di limite/TDEE in KcalGiornoChart). */}
            <Line
              type="stepAfter"
              dataKey="proteineG"
              name="Limite proteine"
              stroke={colori.proteine}
              strokeDasharray="4 3"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="stepAfter"
              dataKey="carboidratiG"
              name="Limite carboidrati"
              stroke={colori.carboidrati}
              strokeDasharray="8 3"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="stepAfter"
              dataKey="grassiG"
              name="Limite grassi"
              stroke={colori.grassi}
              strokeDasharray="1 3"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

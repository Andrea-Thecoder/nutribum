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

const CAMPI_ALTRO = ["fibreG", "saleG"] as const;

export const FibreSaleChart = memo(function FibreSaleChart({
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
  const limiti = accumulaLimitiPeriodo(giorniBase, periodoEffettivo, storicoObiettivi, [...CAMPI_ALTRO]);
  const dati = datiBase.map((d) => ({
    ...d,
    ...(limiti.get(d.chiave) ?? { fibreG: null, saleG: null }),
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
                    { etichetta: "Fibre", colore: colori.fibre, tipo: "barra" },
                    { etichetta: "Sale", colore: colori.sale, tipo: "barra" },
                    { etichetta: "Limite fibre", colore: colori.fibre, tipo: "linea" },
                    { etichetta: "Limite sale", colore: colori.sale, tipo: "linea" },
                  ]}
                />
              )}
            />
            {/* Barre affiancate (niente stackId): fibre e sale non sono legati tra loro come
                lo sono proteine/carbo/grassi, che insieme compongono le kcal totali */}
            <Bar dataKey="fibre_g" name="Fibre" fill={colori.fibre} radius={[4, 4, 0, 0]} />
            <Bar dataKey="sale_g" name="Sale" fill={colori.sale} radius={[4, 4, 0, 0]} />
            {/* Linee limite tratteggiate, stesso colore del proprio nutriente — stesso criterio di
                MacroGiornoChart (vedi commento lì). */}
            <Line
              type="stepAfter"
              dataKey="fibreG"
              name="Limite fibre"
              stroke={colori.fibre}
              strokeDasharray="4 3"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="stepAfter"
              dataKey="saleG"
              name="Limite sale"
              stroke={colori.sale}
              strokeDasharray="8 3"
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

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { paletteGrafici } from "../../lib/chartColors";
import type {
  PuntoKcalReport,
  PuntoMacroReport,
  PuntoFibreSaleReport,
  PuntoPesoReport,
  PuntoTDEEReport,
} from "../../lib/report";

// Versioni "mute" degli stessi grafici usati nei pannelli interattivi, pensate solo per essere
// catturate come immagine da lib/captureChart (vedi generaReportPdf.tsx): niente Tooltip/Legend
// (sono elementi DOM fuori dall'<svg>, andrebbero persi nella cattura - la legenda nel PDF è
// costruita a parte in ReportDocument dagli stessi colori usati qui) e palette chiara forzata,
// indipendente dal tema dell'app in quel momento: un PDF su sfondo bianco coi colori "dark mode"
// (pensati per contrastare su nero) sarebbe illeggibile.
const colori = paletteGrafici(false);

function formattaChiave(chiave: string): string {
  // "yyyy-MM" (mese) o "yyyy-MM-dd" (giorno) - new Date("yyyy-MM") non è affidabile in tutti i
  // browser, si forza il giorno 1 per i mesi prima di formattare.
  const data = chiave.length === 7 ? new Date(`${chiave}-01`) : new Date(chiave);
  return chiave.length === 7 ? format(data, "MMM yyyy", { locale: it }) : format(data, "d MMM", { locale: it });
}

export function GraficoKcalReport({ dati }: { dati: PuntoKcalReport[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dati}>
        <CartesianGrid stroke={colori.griglia} />
        <XAxis dataKey="chiave" tickFormatter={formattaChiave} fontSize={11} stroke={colori.asse} />
        <YAxis fontSize={11} stroke={colori.asse} />
        <Bar dataKey="kcal" fill={colori.kcal} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Line
          type="stepAfter"
          dataKey="limiteKcal"
          stroke={colori.limite}
          strokeDasharray="4 3"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="tdeeStimato"
          stroke={colori.tdee}
          strokeDasharray="12 6"
          strokeWidth={2.5}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="stepAfter"
          dataKey="limiteKcalMin"
          stroke={colori.limiteMin}
          strokeDasharray="4 3"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="bmrStimato"
          stroke={colori.bmr}
          strokeDasharray="12 6"
          strokeWidth={2.5}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GraficoMacroReport({ dati }: { dati: PuntoMacroReport[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dati}>
        <CartesianGrid stroke={colori.griglia} />
        <XAxis dataKey="chiave" tickFormatter={formattaChiave} fontSize={11} stroke={colori.asse} />
        <YAxis fontSize={11} stroke={colori.asse} />
        <Bar dataKey="proteine_g" fill={colori.proteine} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="carboidrati_g" fill={colori.carboidrati} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="grassi_g" fill={colori.grassi} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoFibreSaleReport({ dati }: { dati: PuntoFibreSaleReport[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dati}>
        <CartesianGrid stroke={colori.griglia} />
        <XAxis dataKey="chiave" tickFormatter={formattaChiave} fontSize={11} stroke={colori.asse} />
        <YAxis fontSize={11} stroke={colori.asse} />
        <Bar dataKey="fibre_g" fill={colori.fibre} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="sale_g" fill={colori.sale} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoPesoReport({ dati }: { dati: PuntoPesoReport[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dati}>
        <CartesianGrid stroke={colori.griglia} />
        <XAxis dataKey="chiave" tickFormatter={formattaChiave} fontSize={11} stroke={colori.asse} />
        <YAxis domain={["auto", "auto"]} fontSize={11} stroke={colori.asse} />
        <Line
          type="monotone"
          dataKey="peso"
          stroke={colori.peso}
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
        <Line
          type="stepAfter"
          dataKey="obiettivoStorico"
          stroke={colori.obiettivoPeso}
          strokeDasharray="6 3"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GraficoTDEEReport({ dati }: { dati: PuntoTDEEReport[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dati}>
        <CartesianGrid stroke={colori.griglia} />
        <XAxis dataKey="chiave" tickFormatter={formattaChiave} fontSize={11} stroke={colori.asse} />
        <YAxis domain={["auto", "auto"]} fontSize={11} stroke={colori.asse} />
        <Line
          type="monotone"
          dataKey="tdee"
          stroke={colori.tdee}
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="bmr"
          stroke={colori.asse}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={{ r: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

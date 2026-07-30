import { memo, useEffect, useState, type ReactElement } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { elencaStoricoObiettivo, type PuntoStoricoObiettivo, type Ambito } from "../../lib/dailyGoal";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";
import { registraErroreNonBloccante } from "../../lib/errorLog";

interface PuntoGrafico {
  chiave: string;
  kcal: number | null;
  proteine_g: number | null;
  carboidrati_g: number | null;
  grassi_g: number | null;
  fibre_g: number | null;
  sale_g: number | null;
  ambito: Ambito;
  validoDal: string;
  validoAl: string | null;
}

const ETICHETTE_AMBITO: Record<Ambito, string> = {
  daOra: "Da ora in poi",
  sempre: "Sempre",
  settimana: "Questa settimana",
  mese: "Questo mese",
};

function mappaPunti(storico: PuntoStoricoObiettivo[]): PuntoGrafico[] {
  return storico.map((p) => ({
    // Chiave = quando il salvataggio è stato davvero fatto (non l'inizio dell'intervallo di
    // validità, che per "sempre" è convenzionalmente l'inizio dei tempi e non avrebbe senso in
    // asse): un timestamp ISO completo, univoco anche con più modifiche lo stesso giorno — usare
    // solo la data formattata causava collisioni tra punti dello stesso giorno, con recharts che al
    // passaggio del mouse mostrava sempre il valore del primo invece di quello corretto.
    chiave: p.registratoIl,
    kcal: p.kcal,
    proteine_g: p.proteineG,
    carboidrati_g: p.carboidratiG,
    grassi_g: p.grassiG,
    fibre_g: p.fibreG,
    sale_g: p.saleG,
    ambito: p.ambito,
    validoDal: p.validoDal,
    validoAl: p.validoAl,
  }));
}

function formattaChiave(chiave: string): string {
  return format(new Date(chiave), "d MMM yyyy", { locale: it });
}

function formattaChiaveCompleta(chiave: unknown): string {
  return format(new Date(String(chiave)), "d MMM yyyy HH:mm", { locale: it });
}

// Descrive l'ambito di validità di un punto, per la riga extra nel tooltip — "da ora in poi" non
// aggiunge nulla che non sia già ovvio dalla posizione del punto, quindi non mostra riga.
function descrizioneAmbito(punto: PuntoGrafico): string | null {
  if (punto.ambito === "daOra") return null;
  if (punto.ambito === "sempre") return "Sempre (tutta la cronologia)";
  const dal = format(new Date(punto.validoDal), "d MMM", { locale: it });
  const al = punto.validoAl ? format(new Date(punto.validoAl), "d MMM yyyy", { locale: it }) : "";
  return `${ETICHETTE_AMBITO[punto.ambito]}: ${dal} – ${al}`;
}

// Marcatore custom per ogni punto: cerchio vuoto e tratteggiato per un ambito diverso da "da ora in
// poi" (cioè un valore che vale anche fuori dalla semplice progressione temporale), pieno altrimenti.
function PuntoLinea(props: {
  cx?: number;
  cy?: number;
  stroke?: string;
  payload?: PuntoGrafico;
}) {
  const { cx, cy, stroke, payload } = props;
  if (cx == null || cy == null) return null;
  if (payload && payload.ambito !== "daOra") {
    return <circle cx={cx} cy={cy} r={4} fill="none" stroke={stroke} strokeWidth={2} strokeDasharray="2 2" />;
  }
  return <circle cx={cx} cy={cy} r={3} fill={stroke} stroke={stroke} />;
}

// Tooltip custom: alla riga della data/ora aggiunge l'ambito di validità scelto per quel salvataggio.
function ContenutoTooltipStorico(props: {
  active?: boolean;
  payload?: { dataKey?: string; name?: string; value?: number | string; color?: string }[];
  label?: unknown;
  isDark: boolean;
}) {
  const { active, payload, label, isDark } = props;
  if (!active || !payload || payload.length === 0) return null;
  const stile = stileTooltip(isDark);
  const punto = (payload[0] as unknown as { payload: PuntoGrafico }).payload;
  const descrizione = punto ? descrizioneAmbito(punto) : null;

  return (
    <div style={stile.contentStyle}>
      <div style={stile.labelStyle}>{formattaChiaveCompleta(label)}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ ...stile.itemStyle, color: entry.color }}>
          {entry.name}: {entry.value}
        </div>
      ))}
      {descrizione && (
        <div style={{ ...stile.itemStyle, marginTop: 4, fontStyle: "italic" }}>{descrizione}</div>
      )}
    </div>
  );
}

interface AndamentoObiettiviChartProps {
  versione: number;
}

export const AndamentoObiettiviChart = memo(function AndamentoObiettiviChart({
  versione,
}: AndamentoObiettiviChartProps) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);
  const [storico, setStorico] = useState<PuntoStoricoObiettivo[] | null>(null);

  useEffect(() => {
    elencaStoricoObiettivo()
      .then(setStorico)
      .catch((err) => registraErroreNonBloccante(err, "Caricamento storico obiettivi (grafico andamento) fallito"));
  }, [versione]);

  if (storico === null) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Caricamento…</p>;
  }
  if (storico.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nessun obiettivo impostato ancora — Impostazioni → "Imposta limite giornaliero di…".
      </p>
    );
  }

  const dati = mappaPunti(storico);
  const haDato = (chiavi: (keyof PuntoGrafico)[]) => dati.some((d) => chiavi.some((c) => d[c] !== null));
  const tooltipStorico = (props: object) => <ContenutoTooltipStorico {...props} isDark={isDark} />;

  return (
    <div className="flex h-full flex-col gap-3">
      <SezioneStorico titolo="Kcal" mostra={haDato(["kcal"])}>
        <LineChart data={dati}>
          <CartesianGrid stroke={colori.griglia} />
          <XAxis dataKey="chiave" tickFormatter={formattaChiave} fontSize={11} stroke={colori.asse} />
          <YAxis fontSize={11} stroke={colori.asse} />
          <Tooltip content={tooltipStorico} cursor={stileTooltip(isDark).cursor} />
          <Line
            type="monotone"
            dataKey="kcal"
            name="Kcal"
            stroke={colori.kcal}
            strokeWidth={2}
            dot={(p: object) => <PuntoLinea {...p} />}
          />
        </LineChart>
      </SezioneStorico>

      <SezioneStorico
        titolo="Macronutrienti"
        mostra={haDato(["proteine_g", "carboidrati_g", "grassi_g"])}
      >
        <LineChart data={dati}>
          <CartesianGrid stroke={colori.griglia} />
          <XAxis dataKey="chiave" tickFormatter={formattaChiave} fontSize={11} stroke={colori.asse} />
          <YAxis fontSize={11} stroke={colori.asse} />
          <Tooltip content={tooltipStorico} cursor={stileTooltip(isDark).cursor} />
          <Legend />
          <Line
            type="monotone"
            dataKey="proteine_g"
            name="Proteine"
            stroke={colori.proteine}
            strokeWidth={2}
            dot={(p: object) => <PuntoLinea {...p} />}
          />
          <Line
            type="monotone"
            dataKey="carboidrati_g"
            name="Carboidrati"
            stroke={colori.carboidrati}
            strokeWidth={2}
            dot={(p: object) => <PuntoLinea {...p} />}
          />
          <Line
            type="monotone"
            dataKey="grassi_g"
            name="Grassi"
            stroke={colori.grassi}
            strokeWidth={2}
            dot={(p: object) => <PuntoLinea {...p} />}
          />
        </LineChart>
      </SezioneStorico>

      <SezioneStorico titolo="Altro" mostra={haDato(["fibre_g", "sale_g"])}>
        <LineChart data={dati}>
          <CartesianGrid stroke={colori.griglia} />
          <XAxis dataKey="chiave" tickFormatter={formattaChiave} fontSize={11} stroke={colori.asse} />
          <YAxis fontSize={11} stroke={colori.asse} />
          <Tooltip content={tooltipStorico} cursor={stileTooltip(isDark).cursor} />
          <Legend />
          <Line
            type="monotone"
            dataKey="fibre_g"
            name="Fibre"
            stroke={colori.fibre}
            strokeWidth={2}
            dot={(p: object) => <PuntoLinea {...p} />}
          />
          <Line
            type="monotone"
            dataKey="sale_g"
            name="Sale"
            stroke={colori.sale}
            strokeWidth={2}
            dot={(p: object) => <PuntoLinea {...p} />}
          />
        </LineChart>
      </SezioneStorico>
    </div>
  );
});

function SezioneStorico({
  titolo,
  mostra,
  children,
}: {
  titolo: string;
  mostra: boolean;
  children: ReactElement;
}) {
  return (
    <div className="min-h-0 flex-1">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {titolo}
      </p>
      {mostra ? (
        <ResponsiveContainer width="100%" height="90%">
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[90%] items-center justify-center rounded border border-dashed border-slate-200 dark:border-slate-800">
          <p className="px-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Nessun limite impostato ancora per questa categoria.
          </p>
        </div>
      )}
    </div>
  );
}

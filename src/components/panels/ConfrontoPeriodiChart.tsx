import { memo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { GiornoStorico } from "../../lib/schema";
import {
  raggruppaPerPeriodo,
  elencoIstanze,
  etichettaPeriodo,
  chiavePeriodo,
  type Periodo,
  type PuntoPeriodo,
} from "../../lib/aggregate";
import type { VocePeso } from "../../lib/weight";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";
import { SelettorePeriodo } from "../SelettorePeriodo";
import { SelettoreIstanza } from "../SelettoreIstanza";

export type VistaConfronto = "tabella" | "grafico";

// "peso" non è una chiave di PuntoPeriodo (quello è dato dal diario alimentare, il peso ha una
// fonte e un'aggregazione diverse - media, non somma) ma va confrontato con le stesse identiche
// meccaniche di tabella/grafico delle altre metriche, quindi si estende l'unione delle chiavi
// valide invece di duplicare tutta la logica di rendering per una metrica in più.
// Esclude "chiave" (il campo string di PuntoPeriodo con la chiave del periodo, non una metrica
// numerica): senza l'Exclude, l'indicizzazione valoriA[r.chiave]/valoriB[r.chiave] più sotto
// risulterebbe "string | number" anche se "chiave" non compare mai realmente in RigaMetrica.
type ChiaveRigaMetrica = Exclude<keyof PuntoPeriodo, "chiave"> | "peso";

interface RigaMetrica {
  chiave: ChiaveRigaMetrica;
  etichetta: string;
  unita: string;
  decimali: number;
  colore: string;
}

// Media (non somma, a differenza delle metriche del diario): il peso è una misura puntuale, non
// una quantità che si accumula durante il periodo - "quanto ho mangiato in totale questa
// settimana" ha senso, "quanto ho pesato in totale questa settimana" no.
function mediaPesoPerPeriodo(peso: VocePeso[], periodo: Periodo): Map<string, number> {
  const somme = new Map<string, { totale: number; conteggio: number }>();
  for (const v of peso) {
    const chiave = chiavePeriodo(v.data, periodo);
    const attuale = somme.get(chiave) ?? { totale: 0, conteggio: 0 };
    somme.set(chiave, { totale: attuale.totale + v.pesoKg, conteggio: attuale.conteggio + 1 });
  }
  const medie = new Map<string, number>();
  for (const [chiave, { totale, conteggio }] of somme) {
    medie.set(chiave, totale / conteggio);
  }
  return medie;
}

// Tetto visivo per la lunghezza della barra: se il periodo B è vicino a zero (es. sale non
// tracciato quella settimana) la percentuale può esplodere a 4-5 cifre. Oltre questa soglia la barra
// si ferma qui e l'etichetta mostra "+", ma il valore vero resta visibile nel tooltip.
const PERCENTUALE_VISIVA_MASSIMA = 200;

function calcolaPercentuale(b: number, a: number): number {
  if (b === 0) return a === 0 ? 0 : 100;
  return ((a - b) / b) * 100;
}

function formattaDelta(b: number, a: number, decimali: number, unita: string): string {
  const delta = a - b;
  const segno = delta > 0 ? "+" : "";
  const valore = `${segno}${delta.toFixed(decimali)}${unita}`;
  if (b === 0) {
    return a === 0 ? `= 0${unita}` : valore;
  }
  const percentuale = calcolaPercentuale(b, a);
  return `${valore} (${percentuale > 0 ? "+" : ""}${percentuale.toFixed(0)}%)`;
}

function frecciaDelta(b: number, a: number): string {
  if (a > b) return "↑";
  if (a < b) return "↓";
  return "→";
}

function ContenutoTooltipConfronto(props: {
  active?: boolean;
  payload?: { payload: RigaMetrica & { b: number | null; a: number | null; percentuale: number | null } }[];
  isDark: boolean;
}) {
  const { active, payload, isDark } = props;
  if (!active || !payload || payload.length === 0) return null;
  const stile = stileTooltip(isDark);
  const d = payload[0].payload;
  if (d.b === null || d.a === null || d.percentuale === null) {
    return (
      <div style={stile.contentStyle}>
        <div style={stile.labelStyle}>{d.etichetta}</div>
        <div style={stile.itemStyle}>Nessuna misurazione in uno dei due periodi.</div>
      </div>
    );
  }
  return (
    <div style={stile.contentStyle}>
      <div style={stile.labelStyle}>{d.etichetta}</div>
      <div style={stile.itemStyle}>
        {d.b.toFixed(d.decimali)}
        {d.unita} → {d.a.toFixed(d.decimali)}
        {d.unita}
      </div>
      <div style={stile.itemStyle}>
        {d.percentuale > 0 ? "+" : ""}
        {d.percentuale.toFixed(1)}%
      </div>
    </div>
  );
}

// Toggle tabella/grafico: renderizzato nell'header del pannello (accanto al titolo), non nel corpo
// - per questo è un componente a parte, usato da headerExtraPannello in App.tsx invece che da
// ConfrontoPeriodiChart stesso.
export function SelettoreVistaConfronto({
  vista,
  onChange,
}: {
  vista: VistaConfronto;
  onChange: (v: VistaConfronto) => void;
}) {
  return (
    <div
      // Ancora per i mini-tour delle anteprime "?" (vedi lib/tourAnteprimaContenuti.tsx): condivisa
      // tra Confronto Periodi e Peso Corporeo, gli unici due usi di questo toggle - mai insieme
      // nella stessa modale, un valore fisso basta.
      data-tour="selettore-vista"
      className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800"
    >
      {(["grafico", "tabella"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={
            "rounded-md px-2 py-1 font-medium capitalize transition " +
            (vista === v
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700")
          }
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export const ConfrontoPeriodiChart = memo(function ConfrontoPeriodiChart({
  giorni,
  peso,
  vista,
}: {
  giorni: GiornoStorico[];
  peso: VocePeso[];
  vista: VistaConfronto;
}) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);
  const [periodo, setPeriodo] = useState<Periodo>("settimana");
  // A = termine di sinistra ("confronta A"), B = termine di destra ("...con B"). Di default le due
  // istanze con dati più recenti, ma entrambe scelte esplicitamente dall'utente - non calcolate
  // (es. "il periodo prima"), per poter confrontare due punti qualsiasi, non solo consecutivi.
  const istanzeIniziali = elencoIstanze(giorni, "settimana");
  const [istanzaA, setIstanzaA] = useState<string>(() => istanzeIniziali[0]?.chiave ?? "");
  const [istanzaB, setIstanzaB] = useState<string>(() => istanzeIniziali[1]?.chiave ?? istanzeIniziali[0]?.chiave ?? "");

  if (giorni.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Nessun giorno importato ancora.</p>;
  }

  function cambiaPeriodo(nuovo: Periodo) {
    const istanze = elencoIstanze(giorni, nuovo);
    setPeriodo(nuovo);
    setIstanzaA(istanze[0]?.chiave ?? "");
    setIstanzaB(istanze[1]?.chiave ?? istanze[0]?.chiave ?? "");
  }

  const mappaPerChiave = new Map(raggruppaPerPeriodo(giorni, periodo).map((p) => [p.chiave, p]));
  const datiA = mappaPerChiave.get(istanzaA);
  const datiB = mappaPerChiave.get(istanzaB);

  const mediaPesoPerChiave = mediaPesoPerPeriodo(peso, periodo);
  const pesoA = mediaPesoPerChiave.get(istanzaA);
  const pesoB = mediaPesoPerChiave.get(istanzaB);

  const righe: RigaMetrica[] = [
    { chiave: "kcal", etichetta: "Kcal", unita: "", decimali: 0, colore: colori.kcal },
    { chiave: "proteine_g", etichetta: "Proteine", unita: "g", decimali: 1, colore: colori.proteine },
    { chiave: "carboidrati_g", etichetta: "Carboidrati", unita: "g", decimali: 1, colore: colori.carboidrati },
    { chiave: "grassi_g", etichetta: "Grassi", unita: "g", decimali: 1, colore: colori.grassi },
    { chiave: "fibre_g", etichetta: "Fibre", unita: "g", decimali: 1, colore: colori.fibre },
    { chiave: "sale_g", etichetta: "Sale", unita: "g", decimali: 1, colore: colori.sale },
    // Sempre presente se è stato registrato ALMENO un peso in tutta la storia (non solo nei due
    // periodi in confronto): a differenza delle metriche sopra (garantite dal controllo
    // "!datiA || !datiB" più sotto), il peso è tracciato separatamente dal diario alimentare e può
    // mancare per uno dei due periodi anche quando l'altro ce l'ha - la riga resta visibile con
    // "-" per il lato senza misurazioni, invece di sparire senza spiegazione (motivo per cui prima
    // sembrava che il confronto peso "non fosse stato aggiunto").
    ...(peso.length > 0
      ? [{ chiave: "peso" as const, etichetta: "Peso", unita: " kg", decimali: 1, colore: colori.peso }]
      : []),
  ];

  // "peso" diventa una proprietà normale di questi oggetti uniti, leggibile con lo stesso
  // r.chiave usato per le altre metriche - nessuna diramazione speciale nel rendering sotto.
  const valoriA = datiA ? { ...datiA, peso: pesoA } : undefined;
  const valoriB = datiB ? { ...datiB, peso: pesoB } : undefined;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SelettorePeriodo periodo={periodo} onChange={cambiaPeriodo} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>Confronta</span>
        <SelettoreIstanza
          giorni={giorni}
          periodo={periodo}
          istanza={istanzaA}
          onChange={setIstanzaA}
          mostraTutto={false}
          dataTour="selettore-istanza-a"
        />
        <span>con</span>
        <SelettoreIstanza
          giorni={giorni}
          periodo={periodo}
          istanza={istanzaB}
          onChange={setIstanzaB}
          mostraTutto={false}
          dataTour="selettore-istanza-b"
        />
      </div>

      {!valoriA || !valoriB ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Servono almeno due periodi con dati per fare un confronto - prova un periodo più corto (es.
          "Giorno" invece di "Anno").
        </p>
      ) : vista === "tabella" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 dark:text-slate-500">
                <th className="pb-1.5 font-medium">Metrica</th>
                <th className="pb-1.5 text-right font-medium">{etichettaPeriodo(istanzaB, periodo)}</th>
                <th className="pb-1.5 text-right font-medium">{etichettaPeriodo(istanzaA, periodo)}</th>
                <th className="pb-1.5 text-right font-medium">Differenza</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => {
                const b = valoriB[r.chiave];
                const a = valoriA[r.chiave];
                const entrambiPresenti = b !== undefined && a !== undefined;
                return (
                  <tr key={r.chiave} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5">
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ backgroundColor: r.colore }}
                      />
                      <span className="text-slate-600 dark:text-slate-300">{r.etichetta}</span>
                    </td>
                    <td className="py-1.5 text-right text-slate-500 dark:text-slate-400">
                      {b === undefined ? "-" : `${b.toFixed(r.decimali)}${r.unita}`}
                    </td>
                    <td className="py-1.5 text-right font-medium text-slate-700 dark:text-slate-200">
                      {a === undefined ? "-" : `${a.toFixed(r.decimali)}${r.unita}`}
                    </td>
                    <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                      {entrambiPresenti ? `${frecciaDelta(b, a)} ${formattaDelta(b, a, r.decimali, r.unita)}` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1">
          {/* Non ci sono "due lati per due giorni": ogni barra è la variazione di UN SOLO periodo
              (A) rispetto all'altro (B, il riferimento fisso a 0%) - a destra vuol dire "più alto
              in A", a sinistra "più basso in A", indipendentemente da quale data sia A o B.
              Esplicitato a parole invece che con una freccia unica, che si era rivelata ambigua. */}
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            Variazione di <span className="font-medium">{etichettaPeriodo(istanzaA, periodo)}</span> rispetto a{" "}
            <span className="font-medium">{etichettaPeriodo(istanzaB, periodo)}</span>
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>← più basso</span>
            <span>più alto →</span>
          </div>
          {/* Scala unica in % di variazione: kcal e grammi sulla stessa scala assoluta sarebbero
              illeggibili - la % rispetto a B normalizza tutte le metriche insieme. */}
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={righe.map((r) => {
                  const b = valoriB[r.chiave];
                  const a = valoriA[r.chiave];
                  // Riga presente ma senza dato in uno dei due periodi (es. peso non tracciato
                  // quella settimana): niente barra reale (percentualeVisiva resta 0, invisibile
                  // sulla ReferenceLine a x=0), ma l'etichetta "N/D" scritta sulla riga della
                  // metrica invece di sparire - motivo per cui prima sembrava mancante del tutto.
                  if (b === undefined || a === undefined) {
                    // "percentualeEtichetta" è sempre una stringa (mai null/undefined): Recharts
                    // (Label.js) salta la resa PRIMA di chiamare il formatter quando il valore letto
                    // da dataKey è nullish, quindi un formatter che trasforma null in "N/D" non
                    // verrebbe mai invocato - da qui una stringa già pronta invece di un numero nullable.
                    return { ...r, b: null, a: null, percentuale: null, percentualeVisiva: 0, percentualeEtichetta: "N/D" };
                  }
                  const percentuale = calcolaPercentuale(b, a);
                  const percentualeVisiva = Math.max(
                    -PERCENTUALE_VISIVA_MASSIMA,
                    Math.min(PERCENTUALE_VISIVA_MASSIMA, percentuale),
                  );
                  const n = Math.round(percentuale);
                  const percentualeEtichetta = `${n > 0 ? "+" : ""}${n}%`;
                  return { ...r, b, a, percentuale, percentualeVisiva, percentualeEtichetta };
                })}
                layout="vertical"
                margin={{ left: 8, right: 40, top: 8, bottom: 8 }}
              >
                <CartesianGrid stroke={colori.griglia} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-PERCENTUALE_VISIVA_MASSIMA, PERCENTUALE_VISIVA_MASSIMA]}
                  unit="%"
                  fontSize={11}
                  stroke={colori.asse}
                />
                <YAxis type="category" dataKey="etichetta" width={80} fontSize={11} stroke={colori.asse} />
                <ReferenceLine x={0} stroke={colori.asse} />
                <Tooltip
                  content={(p: object) => <ContenutoTooltipConfronto {...p} isDark={isDark} />}
                  cursor={stileTooltip(isDark).cursor}
                />
                <Bar dataKey="percentualeVisiva" radius={4}>
                  {righe.map((r) => (
                    <Cell key={r.chiave} fill={r.colore} />
                  ))}
                  {/* dataKey punta a una stringa già pronta ("N/D" o "+12%"), non al numero grezzo:
                      Recharts salta la resa del Label quando il valore letto da dataKey è
                      null/undefined PRIMA di chiamare un eventuale formatter, quindi un formatter
                      che trasforma null in "N/D" non verrebbe mai invocato per quelle righe. */}
                  <LabelList dataKey="percentualeEtichetta" position="right" fill={colori.asse} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
});

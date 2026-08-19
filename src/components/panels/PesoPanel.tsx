import { memo, useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import {
  type VocePeso,
  type PuntoStoricoObiettivoPeso,
  nelObiettivoPeso,
  calcolaRitmoKgSettimana,
  GIORNI_FINESTRA_RITMO_PESO,
  GIORNI_MINIMI_RITMO_PESO,
} from "../../lib/weight";
import { filtraIstanza, chiavePeriodo, TUTTO_IL_PERIODO, type Periodo, type FocusGiorno } from "../../lib/aggregate";
import { paletteGrafici, stileTooltip } from "../../lib/chartColors";
import { useIsDarkMode } from "../../lib/useIsDarkMode";
import { SelettorePeriodo } from "../SelettorePeriodo";
import { SelettoreIstanza } from "../SelettoreIstanza";
import type { VistaConfronto } from "./ConfrontoPeriodiChart";

// Niente "Giorno": una pesata al giorno rende quel livello di filtro quasi sempre un grafico/tabella
// con un unico punto, poco utile - il confronto puntuale tra due giorni specifici è già il compito
// dedicato del pannello "Confronto periodi", non va duplicato qui.
const PERIODI_DISPONIBILI: Periodo[] = ["settimana", "mese", "anno"];

interface Proiezione {
  ritmoKgSettimana: number;
  versoObiettivo: boolean;
  giorniStimati: number | null;
  dataStimata: string | null;
}

// Proiezione basata sul ritmo di variazione OSSERVATO (primo/ultimo peso nella finestra), non su un
// calcolo da deficit calorico: senza un TDEE reale (non ancora in NutriBum) il deficit rispetto al
// solo obiettivo kcal auto-impostato sarebbe fuorviante (l'obiettivo non è necessariamente il
// fabbisogno reale). Il ritmo osservato è più onesto: riflette quello che è VERAMENTE successo.
//
// Riceve "giaNellObiettivo" già calcolato (non lo ricalcola qui) apposta per non mescolare "sono
// nell'obiettivo?" (fatto puntuale, vedi nelObiettivoPeso) con "a che ritmo mi ci sto muovendo?"
// (trend): due domande indipendenti, che prima di questa modifica erano nello stesso valore di
// ritorno e generavano frasi che sembravano contraddittorie (es. un ritmo di crescita mostrato
// insieme a "sei già sotto l'obiettivo", corretto ma fuorviante letto tutto insieme).
function calcolaProiezione(
  voci: VocePeso[],
  obiettivoKg: number | null,
  giaNellObiettivo: boolean,
): Proiezione | null {
  if (obiettivoKg === null) return null;
  const ritmoKgSettimana = calcolaRitmoKgSettimana(voci);
  if (ritmoKgSettimana === null) return null;
  const kgPerGiorno = ritmoKgSettimana / 7;
  const ultimo = voci[voci.length - 1];

  if (giaNellObiettivo || kgPerGiorno >= -0.005) {
    return { ritmoKgSettimana, versoObiettivo: giaNellObiettivo, giorniStimati: null, dataStimata: null };
  }

  const differenzaObiettivo = obiettivoKg - ultimo.pesoKg;
  const giorniStimati = Math.round(differenzaObiettivo / kgPerGiorno);
  const dataStimata = format(addDays(new Date(ultimo.data), giorniStimati), "d MMMM yyyy", { locale: it });
  return { ritmoKgSettimana, versoObiettivo: true, giorniStimati, dataStimata };
}

// Icona "ⓘ" cliccabile: mostra un popover con spiegazione per un tempo fisso invece di un tooltip
// a hover, poco visibile e inutilizzabile su schermi touch - poi si richiude da sola senza bisogno
// di un secondo click altrove. Usata sia nell'header della tabella (allineamento a destra) che in
// linea nel testo del ritmo (allineamento a sinistra), da qui il prop "allineamento". Durata
// regolabile per testo: 4s bastano per una riga ("Variazione"), non per la spiegazione del ritmo
// (molto più lunga) che spariva prima di finire di leggerla.
function InfoClickabile({
  testo,
  allineamento = "sinistra",
  durataMs = 4000,
  dataTour,
}: {
  testo: string;
  allineamento?: "sinistra" | "destra";
  durataMs?: number;
  // Ancora per i mini-tour delle anteprime "?" (vedi lib/tourAnteprimaContenuti.tsx) - le due
  // istanze di questo componente in PesoPanel condividono lo stesso aria-label, serve un valore
  // diverso per puntare a quella giusta.
  dataTour?: string;
}) {
  const [visibile, setVisibile] = useState(false);

  function mostra() {
    setVisibile(true);
    window.setTimeout(() => setVisibile(false), durataMs);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        data-tour={dataTour}
        onClick={mostra}
        className="rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label="Maggiori informazioni"
      >
        ⓘ
      </button>
      {visibile && (
        <div
          className={
            // z-30, non z-20: i pulsanti di SelettoreIstanza in questo stesso pannello hanno anche
            // loro z-20 sempre attivo (non solo da aperti) - a parità di z-index vince l'elemento
            // più avanti nel DOM, e quel selettore viene DOPO questo tooltip, quindi lo copriva.
            "absolute top-full z-30 mt-1 w-72 whitespace-normal rounded-lg border border-slate-200 bg-white p-2 text-left text-[11px] font-normal text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 " +
            (allineamento === "destra" ? "right-0" : "left-0")
          }
        >
          {testo}
        </div>
      )}
    </span>
  );
}

// L'obiettivo in vigore in un giorno passato non è per forza quello di oggi: cerca l'ultima voce di
// storico registrata IL O PRIMA di quel giorno (storico ordinato per registratoIl crescente).
function obiettivoAttivoAlla(data: string, storico: PuntoStoricoObiettivoPeso[]): number | null {
  let corrente: number | null = null;
  for (const punto of storico) {
    if (punto.registratoIl.slice(0, 10) <= data) {
      corrente = punto.targetKg;
    } else {
      break;
    }
  }
  return corrente;
}

// Pulsanti nell'header del pannello (accanto al titolo "PESO CORPOREO"), non nel corpo - per questo
// un componente a parte, usato da headerExtraPannello in App.tsx. Aprono le stesse modali
// raggiungibili da NavBar → Diario del Peso: un solo posto dove vive ciascun form, due scorciatoie
// per aprirlo. L'etichetta è dinamica: "Aggiorna" se un record esiste già (peso di oggi già
// registrato, o un obiettivo già impostato), "Aggiungi" altrimenti.
export function AzioniPesoHeader({
  haPesoOggi,
  haObiettivo,
  onApriInserimentoPeso,
  onApriObiettivoPeso,
}: {
  haPesoOggi: boolean;
  haObiettivo: boolean;
  onApriInserimentoPeso: () => void;
  onApriObiettivoPeso: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onApriInserimentoPeso}
        className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
      >
        {haPesoOggi ? "Aggiorna peso" : "Aggiungi peso"}
      </button>
      <button
        onClick={onApriObiettivoPeso}
        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {haObiettivo ? "Aggiorna obiettivo peso" : "Aggiungi obiettivo peso"}
      </button>
    </div>
  );
}

export const PesoPanel = memo(function PesoPanel({
  peso,
  obiettivoKg,
  storicoObiettivo,
  vista,
  focusGiorno,
  margineKg,
}: {
  peso: VocePeso[];
  obiettivoKg: number | null;
  storicoObiettivo: PuntoStoricoObiettivoPeso[];
  vista: VistaConfronto;
  focusGiorno?: FocusGiorno | null;
  margineKg: number;
}) {
  const isDark = useIsDarkMode();
  const colori = paletteGrafici(isDark);
  const [periodo, setPeriodo] = useState<Periodo>("settimana");
  const [istanza, setIstanza] = useState<string>(TUTTO_IL_PERIODO);

  // Stessa convenzione di sincronizzazione degli altri grafici (vedi KcalGiornoChart), ma alla
  // settimana invece che al giorno esatto: qui "Giorno" non è tra i periodi disponibili (vedi
  // PERIODI_DISPONIBILI), quindi ci si allinea alla settimana che contiene il giorno cliccato.
  useEffect(() => {
    if (!focusGiorno) return;
    setPeriodo("settimana");
    setIstanza(chiavePeriodo(focusGiorno.data, "settimana"));
  }, [focusGiorno]);

  // Lo stato attuale (peso più recente, ritmo, proiezione) resta sempre sulla storia COMPLETA,
  // indipendentemente dal filtro periodo/istanza qui sotto: quel filtro riguarda solo cosa mostrano
  // grafico e tabella, non "dove sono adesso".
  const ultimo = peso.length > 0 ? peso[peso.length - 1] : null;
  const penultimo = peso.length > 1 ? peso[peso.length - 2] : null;
  const giaNellObiettivo =
    obiettivoKg !== null && ultimo !== null && nelObiettivoPeso(ultimo.pesoKg, obiettivoKg, margineKg);
  const proiezione = calcolaProiezione(peso, obiettivoKg, giaNellObiettivo);

  const pesoFiltrato = filtraIstanza(peso, periodo, istanza);

  const datiGrafico = pesoFiltrato.map((v) => ({
    chiave: v.data,
    peso: v.pesoKg,
    obiettivoStorico: obiettivoAttivoAlla(v.data, storicoObiettivo),
  }));

  // Un pallino solo dove l'obiettivo è CAMBIATO rispetto al punto precedente (non su ogni giorno):
  // la spezzata a gradini rende già visibile il valore costante fra un cambio e l'altro, marcare
  // ogni singolo giorno sarebbe puro rumore visivo.
  const chiaviCambioObiettivo = new Set<string>();
  let obiettivoPrecedente: number | null = null;
  for (const d of datiGrafico) {
    if (d.obiettivoStorico !== obiettivoPrecedente && d.obiettivoStorico !== null) {
      chiaviCambioObiettivo.add(d.chiave);
    }
    obiettivoPrecedente = d.obiettivoStorico;
  }

  function puntoCambioObiettivo(props: { cx?: number; cy?: number; payload?: { chiave: string } }) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload || !chiaviCambioObiettivo.has(payload.chiave)) return null;
    return <circle cx={cx} cy={cy} r={4} fill={colori.obiettivoPeso} stroke="none" />;
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div>
        {ultimo ? (
          <>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {ultimo.pesoKg.toFixed(1)} kg
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {format(new Date(ultimo.data), "d MMMM yyyy", { locale: it })}
              {penultimo && (
                <>
                  {" · "}
                  {ultimo.pesoKg > penultimo.pesoKg ? "↑" : ultimo.pesoKg < penultimo.pesoKg ? "↓" : "→"}{" "}
                  {(ultimo.pesoKg - penultimo.pesoKg > 0 ? "+" : "") + (ultimo.pesoKg - penultimo.pesoKg).toFixed(1)}{" "}
                  kg dall'ultima misurazione
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nessuna misurazione ancora.</p>
        )}
      </div>

      {/* Fatto puntuale ("sono nell'obiettivo?"), indipendente dal ritmo - vedi nelObiettivoPeso. */}
      {obiettivoKg !== null && ultimo !== null && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {giaNellObiettivo ? (
            ultimo.pesoKg <= obiettivoKg ? (
              "Sei al di sotto del tuo obiettivo di peso."
            ) : (
              `Sei nell'obiettivo di peso (entro il margine di tolleranza di ±${margineKg} kg).`
            )
          ) : (
            <>
              Non sei ancora nell'obiettivo di peso: mancano{" "}
              {(ultimo.pesoKg - obiettivoKg - margineKg).toFixed(1)} kg (margine di tolleranza ±
              {margineKg} kg incluso).
            </>
          )}
        </p>
      )}

      {/* Trend ("a che ritmo mi ci sto muovendo?"), separato dal fatto sopra apposta - vedi il
          commento su calcolaProiezione per il perché di questa separazione. */}
      {proiezione && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ritmo attuale{" "}
          <InfoClickabile
            durataMs={10000}
            dataTour="peso-info-ritmo"
            testo={`Prende il primo e l'ultimo peso registrato negli ultimi ${GIORNI_FINESTRA_RITMO_PESO} giorni e calcola (ultimo − primo) ÷ giorni trascorsi, poi ×7 per ottenere un valore settimanale. Ignora le misurazioni intermedie: due sole pesate contano, non una media di tutte. Serve almeno ${GIORNI_MINIMI_RITMO_PESO} giorni tra le due per essere mostrato, altrimenti due pesate troppo ravvicinate darebbero un ritmo esagerato una volta moltiplicato ×7.`}
          />
          : {proiezione.ritmoKgSettimana > 0 ? "+" : ""}
          {proiezione.ritmoKgSettimana.toFixed(2)} kg/settimana.
          {!giaNellObiettivo &&
            (proiezione.versoObiettivo ? (
              <>
                {" "}
                Di questo passo raggiungi l'obiettivo il{" "}
                <span className="font-medium text-slate-700 dark:text-slate-200">{proiezione.dataStimata}</span>.
              </>
            ) : (
              " Il ritmo attuale non sta andando verso l'obiettivo."
            ))}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SelettorePeriodo
          periodo={periodo}
          opzioni={PERIODI_DISPONIBILI}
          onChange={(p) => {
            setPeriodo(p);
            setIstanza(TUTTO_IL_PERIODO);
          }}
        />
        <SelettoreIstanza giorni={peso} periodo={periodo} istanza={istanza} onChange={setIstanza} />
      </div>

      {vista === "tabella" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 dark:text-slate-500">
                <th className="pb-1.5 font-medium">Data</th>
                <th className="pb-1.5 text-right font-medium">Peso</th>
                <th className="pb-1.5 text-right font-medium">Obiettivo</th>
                <th className="pb-1.5 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    Variazione
                    <InfoClickabile
                      allineamento="destra"
                      dataTour="peso-info-variazione"
                      testo="Differenza rispetto alla misurazione nella riga sopra (la precedente in ordine di data), non rispetto all'obiettivo."
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pesoFiltrato.map((v, i) => {
                const precedente = i > 0 ? pesoFiltrato[i - 1] : null;
                const variazione = precedente ? v.pesoKg - precedente.pesoKg : null;
                const obiettivoAllaData = obiettivoAttivoAlla(v.data, storicoObiettivo);
                return (
                  <tr key={v.data} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">
                      {format(new Date(v.data), "d MMMM yyyy", { locale: it })}
                    </td>
                    <td className="py-1.5 text-right font-medium text-slate-700 dark:text-slate-200">
                      {v.pesoKg.toFixed(1)} kg
                    </td>
                    <td className="py-1.5 text-right text-slate-500 dark:text-slate-400">
                      {obiettivoAllaData === null ? "-" : `${obiettivoAllaData.toFixed(1)} kg`}
                    </td>
                    <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                      {variazione === null ? (
                        "-"
                      ) : (
                        <>
                          {variazione > 0 ? "↑" : variazione < 0 ? "↓" : "→"}{" "}
                          {(variazione > 0 ? "+" : "") + variazione.toFixed(1)} kg
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datiGrafico}>
              <CartesianGrid stroke={colori.griglia} />
              <XAxis
                dataKey="chiave"
                tickFormatter={(v: string) => format(new Date(v), "d MMM", { locale: it })}
                fontSize={11}
                stroke={colori.asse}
              />
              <YAxis domain={["auto", "auto"]} fontSize={11} stroke={colori.asse} unit="kg" />
              <Tooltip
                {...stileTooltip(isDark)}
                labelFormatter={(v) => format(new Date(String(v)), "d MMMM yyyy", { locale: it })}
                formatter={(v, nome) => [v == null ? "-" : `${v} kg`, nome]}
              />
              {storicoObiettivo.length > 0 && <Legend />}
              <Line type="monotone" dataKey="peso" name="Peso" stroke={colori.peso} strokeWidth={2} dot={{ r: 3 }} />
              {/* A gradini ("stepAfter"), non "monotone": l'obiettivo resta costante finché non lo
                  cambi di nuovo, non interpola linearmente tra un valore e l'altro - riflette
                  davvero come è cambiato nel tempo, invece di una retta piatta sul valore attuale
                  che ignorerebbe cosa era in vigore nei giorni passati. Spezzata (non connessa) nei
                  giorni precedenti al primo obiettivo mai impostato. Pallino solo sui cambi. */}
              {storicoObiettivo.length > 0 && (
                <Line
                  type="stepAfter"
                  dataKey="obiettivoStorico"
                  name="Obiettivo"
                  stroke={colori.obiettivoPeso}
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  dot={puntoCambioObiettivo}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

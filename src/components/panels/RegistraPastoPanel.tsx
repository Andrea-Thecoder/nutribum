import { memo, useEffect, useState, type FormEvent } from "react";
import {
  registraVoceDiario,
  elencaDiarioGiorno,
  eliminaVoceDiario,
  calcolaValoriPorzione,
  totaliVoci,
  TIPI_PASTO,
  type TipoPasto,
  type AlimentoCatalogo,
  type VoceDiario,
  type VocePorzione,
  type UnitaAlimento,
} from "../../lib/food";
import { useConferma } from "../ConfermaModal";
import { CalendarioPopover } from "../CalendarioPopover";
import { SelettorePersonalizzato } from "../SelettorePersonalizzato";
import { registraErroreNonBloccante } from "../../lib/errorLog";
import type { RicettaConIngredienti } from "../../lib/recipes";

interface RegistraPastoPanelProps {
  alimenti: AlimentoCatalogo[];
  ricette: RicettaConIngredienti[];
  onSalvato: () => void;
}

interface BozzaNuova extends VocePorzione {
  idBozza: string;
  alimentoId: number;
  nomeAlimento: string;
  unita: UnitaAlimento;
  data: string;
  orario: string;
  tipoPasto: TipoPasto;
  quantita: number;
}

const ETICHETTA_PASTO: Record<TipoPasto, string> = {
  colazione: "Colazione",
  pranzo: "Pranzo",
  cena: "Cena",
  spuntino: "Spuntino",
};

const CAMPO =
  "rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function oggi(): string {
  return new Date().toISOString().slice(0, 10);
}

function oraAttuale(): string {
  return new Date().toTimeString().slice(0, 5);
}

export const RegistraPastoPanel = memo(function RegistraPastoPanel({
  alimenti,
  ricette,
  onSalvato,
}: RegistraPastoPanelProps) {
  const [data, setData] = useState(oggi());
  const [dataRichiesta, setDataRichiesta] = useState<string | null>(null);
  const [orario, setOrario] = useState(oraAttuale());
  const [tipoPasto, setTipoPasto] = useState<TipoPasto>("colazione");
  const [alimentoId, setAlimentoId] = useState<number | "">("");
  const [quantitaTesto, setQuantitaTesto] = useState("100");
  const [ricettaId, setRicettaId] = useState<number | "">("");
  // Un blocco alla volta, non entrambi affiancati: mostrarli insieme sembrava suggerire due
  // percorsi indipendenti, mentre condividono davvero lo stesso giorno/orario/pasto scelti sopra.
  const [modalitaAggiunta, setModalitaAggiunta] = useState<"alimento" | "ricetta">("alimento");

  const [giaSalvate, setGiaSalvate] = useState<VoceDiario[]>([]);
  const [bozzaNuove, setBozzaNuove] = useState<BozzaNuova[]>([]);
  const [idsDaEliminare, setIdsDaEliminare] = useState<Set<number>>(new Set());

  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const { chiedi, elemento: modaleConferma } = useConferma();

  useEffect(() => {
    if (data === oggi()) {
      elencaDiarioGiorno(data)
        .then(setGiaSalvate)
        .catch((e) => {
          setErrore(e instanceof Error ? e.message : String(e));
          registraErroreNonBloccante(e, "Caricamento diario del giorno (registra pasto) fallito");
        });
    } else {
      setGiaSalvate([]);
    }
  }, [data]);

  useEffect(() => {
    if (alimentoId === "" && alimenti.length > 0) setAlimentoId(alimenti[0].id);
  }, [alimenti, alimentoId]);

  useEffect(() => {
    if (ricettaId === "" && ricette.length > 0) setRicettaId(ricette[0].id);
  }, [ricette, ricettaId]);

  const giaSalvateVisibili = giaSalvate.filter((v) => !idsDaEliminare.has(v.id));
  const numeroModifichePendenti = bozzaNuove.length + idsDaEliminare.size;
  const totali = totaliVoci([...giaSalvateVisibili, ...bozzaNuove]);

  // Il cambio giorno passa da "richiesta" (CalendarioPopover) a "applicato" (data) tramite questo
  // effect invece che direttamente nell'onChange: se ci sono modifiche in bozza non salvate va
  // prima chiesta conferma (dialog asincrono), e solo se confermato si scarta la bozza e si cambia
  // giorno davvero - altrimenti la richiesta viene ignorata e "data" resta quella di prima.
  useEffect(() => {
    if (dataRichiesta === null || dataRichiesta === data) {
      if (dataRichiesta !== null) setDataRichiesta(null);
      return;
    }
    const nuovaData = dataRichiesta;
    let annullato = false;

    (async () => {
      if (numeroModifichePendenti > 0) {
        const ok = await chiedi(
          `Cambiando giorno perderai le modifiche in bozza (${numeroModifichePendenti} non ancora salvate nel database). Continuare?`,
          { distruttivo: true },
        );
        if (!ok || annullato) {
          setDataRichiesta(null);
          return;
        }
      }
      setBozzaNuove([]);
      setIdsDaEliminare(new Set());
      setErrore(null);
      setData(nuovaData);
      setDataRichiesta(null);
    })();

    return () => {
      annullato = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRichiesta]);

  function handleAggiungi(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    const alimento = alimenti.find((a) => a.id === alimentoId);
    const quantitaGrezza = Number(quantitaTesto);

    if (!alimento) {
      setErrore("Seleziona un alimento");
      return;
    }
    if (!Number.isFinite(quantitaGrezza) || quantitaGrezza <= 0) {
      setErrore("La quantità deve essere un numero maggiore di zero, con al massimo un decimale");
      return;
    }
    const quantita = Math.round(quantitaGrezza * 10) / 10;

    const duplicato = [...giaSalvateVisibili, ...bozzaNuove].some(
      (v) =>
        v.alimentoId === alimento.id &&
        v.data === data &&
        v.orario === orario &&
        v.tipoPasto === tipoPasto &&
        v.quantita === quantita,
    );
    if (duplicato) {
      setErrore(
        `"${alimento.nome}" è già in lista con lo stesso giorno, orario, pasto e quantità (${quantita}${alimento.unita}).`,
      );
      return;
    }

    setBozzaNuove((prev) => [
      ...prev,
      {
        idBozza: crypto.randomUUID(),
        alimentoId: alimento.id,
        nomeAlimento: alimento.nome,
        unita: alimento.unita,
        data,
        orario,
        tipoPasto,
        quantita,
        ...calcolaValoriPorzione(alimento, quantita),
      },
    ]);
    setQuantitaTesto("100");
  }

  // Espande la ricetta in tante righe di bozza quanti sono i suoi ingredienti, con lo stesso
  // giorno/orario/pasto selezionati nel form - esattamente come se li avessi aggiunti uno per uno
  // a mano. Nessun collegamento persistente alla ricetta: da qui in poi sono normali voci di
  // food_log, modificarle o eliminarle non tocca la ricetta e viceversa (per scelta esplicita).
  function handleAggiungiDaRicetta() {
    setErrore(null);
    const ricetta = ricette.find((r) => r.id === ricettaId);
    if (!ricetta) {
      setErrore("Seleziona una ricetta");
      return;
    }

    const attuali = [...giaSalvateVisibili, ...bozzaNuove];
    const nuoveRighe: BozzaNuova[] = [];
    let saltati = 0;
    for (const ing of ricetta.ingredienti) {
      const alimento = alimenti.find((a) => a.id === ing.alimentoId);
      if (!alimento) {
        saltati++;
        continue;
      }
      const duplicato = attuali.some(
        (v) =>
          v.alimentoId === alimento.id &&
          v.data === data &&
          v.orario === orario &&
          v.tipoPasto === tipoPasto &&
          v.quantita === ing.quantita,
      );
      if (duplicato) {
        saltati++;
        continue;
      }
      nuoveRighe.push({
        idBozza: crypto.randomUUID(),
        alimentoId: alimento.id,
        nomeAlimento: alimento.nome,
        unita: alimento.unita,
        data,
        orario,
        tipoPasto,
        quantita: ing.quantita,
        ...calcolaValoriPorzione(alimento, ing.quantita),
      });
    }

    setBozzaNuove((prev) => [...prev, ...nuoveRighe]);
    if (saltati > 0) {
      setErrore(
        `${saltati} ingredient${saltati === 1 ? "e" : "i"} di "${ricetta.nome}" ${saltati === 1 ? "è già in lista" : "sono già in lista"} con lo stesso giorno/orario/pasto/quantità, non ${saltati === 1 ? "è stato" : "sono stati"} riaggiunt${saltati === 1 ? "o" : "i"}.`,
      );
    }
  }

  async function handleRimuoviGiaSalvata(id: number, nome: string) {
    const ok = await chiedi(
      `Rimuovere "${nome}" dalla lista? Verrà eliminata dal database quando premi Conferma.`,
      { distruttivo: true },
    );
    if (!ok) return;
    setIdsDaEliminare((prev) => new Set(prev).add(id));
  }

  async function handleRimuoviBozza(idBozza: string, nome: string) {
    const ok = await chiedi(`Rimuovere "${nome}" dalla bozza?`, { distruttivo: true });
    if (!ok) return;
    setBozzaNuove((prev) => prev.filter((v) => v.idBozza !== idBozza));
  }

  async function handleSvuotaLista() {
    const totale = giaSalvateVisibili.length + bozzaNuove.length;
    if (totale === 0) return;
    const ok = await chiedi(
      `Vuoi svuotare la lista? Verranno eliminati tutti i ${totale} alimenti (le voci già salvate saranno eliminate dal database, quelle in bozza scartate) quando premi Conferma.`,
      { distruttivo: true },
    );
    if (!ok) return;
    setBozzaNuove([]);
    setIdsDaEliminare(new Set(giaSalvateVisibili.map((v) => v.id)));
  }

  async function handleConferma() {
    if (numeroModifichePendenti === 0) return;

    const parti: string[] = [];
    if (bozzaNuove.length > 0) parti.push(`salvare ${bozzaNuove.length} nuovi alimenti`);
    if (idsDaEliminare.size > 0) parti.push(`eliminare ${idsDaEliminare.size} alimenti già salvati`);
    const ok = await chiedi(`Confermi di voler ${parti.join(" e ")} nel database?`);
    if (!ok) return;

    setSalvataggio(true);
    setErrore(null);
    try {
      for (const id of idsDaEliminare) {
        await eliminaVoceDiario(id);
      }
      for (const voce of bozzaNuove) {
        const alimento = alimenti.find((a) => a.id === voce.alimentoId);
        if (!alimento) continue;
        await registraVoceDiario(
          {
            alimentoId: voce.alimentoId,
            data: voce.data,
            orario: voce.orario,
            tipoPasto: voce.tipoPasto,
            quantita: voce.quantita,
          },
          alimento,
        );
      }
      setBozzaNuove([]);
      setIdsDaEliminare(new Set());
      setGiaSalvate(data === oggi() ? await elencaDiarioGiorno(data) : []);
      onSalvato();
    } catch (err) {
      const messaggio = err instanceof Error ? err.message : String(err);
      setErrore(
        messaggio.includes("UNIQUE constraint failed")
          ? "Una delle voci in bozza è identica (stesso giorno, orario, pasto, alimento e quantità) a una già presente nel database."
          : messaggio,
      );
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 text-xs">
      {modaleConferma}
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-0.5 text-sm">
          Giorno
          <CalendarioPopover value={data} onChange={setDataRichiesta} />
        </label>
        <label className="flex flex-col gap-0.5 text-sm">
          Orario
          <input type="time" value={orario} onChange={(e) => setOrario(e.target.value)} className={CAMPO} />
        </label>
      </div>

      <fieldset disabled={salvataggio} className="contents">
        {ricette.length > 0 && (
          <div className="flex gap-2 pb-1">
            <button
              type="button"
              onClick={() => setModalitaAggiunta("alimento")}
              className={
                modalitaAggiunta === "alimento"
                  ? "rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white"
                  : "rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
              }
            >
              Alimento singolo
            </button>
            <button
              type="button"
              onClick={() => setModalitaAggiunta("ricetta")}
              className={
                modalitaAggiunta === "ricetta"
                  ? "rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white"
                  : "rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
              }
            >
              Da ricetta
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            if (modalitaAggiunta === "ricetta") {
              e.preventDefault();
              handleAggiungiDaRicetta();
            } else {
              handleAggiungi(e);
            }
          }}
          className="flex flex-wrap items-end gap-2 border-b border-slate-200 pb-3 dark:border-slate-800"
        >
          <label className="flex flex-col gap-0.5">
            Pasto
            <SelettorePersonalizzato
              valore={tipoPasto}
              opzioni={TIPI_PASTO.map((t) => ({ valore: t, etichetta: ETICHETTA_PASTO[t] }))}
              onChange={setTipoPasto}
            />
          </label>

          {modalitaAggiunta === "alimento" ? (
            <>
              <label className="flex min-w-40 flex-col gap-0.5">
                Alimento
                <SelettorePersonalizzato
                  valore={alimentoId}
                  opzioni={alimenti.map((a) => ({ valore: a.id, etichetta: a.nome }))}
                  onChange={setAlimentoId}
                  placeholder="Nessun alimento in catalogo"
                />
              </label>

              <label className="flex flex-col gap-0.5">
                Quantità ({alimenti.find((a) => a.id === alimentoId)?.unita ?? "g"})
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={quantitaTesto}
                  onChange={(e) => setQuantitaTesto(e.target.value)}
                  className={`w-20 ${CAMPO}`}
                />
              </label>

              <button
                type="submit"
                disabled={alimenti.length === 0}
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Aggiungi
              </button>
            </>
          ) : (
            <>
              <label className="flex min-w-40 flex-col gap-0.5">
                Ricetta
                <SelettorePersonalizzato
                  valore={ricettaId}
                  opzioni={ricette.map((r) => ({ valore: r.id, etichetta: r.nome }))}
                  onChange={setRicettaId}
                />
              </label>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                title="Aggiunge tutti gli ingredienti della ricetta con le quantità salvate, con il giorno/orario/pasto scelti sopra"
              >
                Aggiungi da ricetta
              </button>
            </>
          )}
        </form>
      </fieldset>

      {errore && <p className="text-red-600 dark:text-red-400">{errore}</p>}

      <div className="flex flex-col gap-1 overflow-auto">
        {giaSalvateVisibili.length === 0 && bozzaNuove.length === 0 && (
          <p className="text-slate-400 dark:text-slate-500">Nessun alimento in lista per questo giorno.</p>
        )}

        {giaSalvateVisibili.map((v) => (
          <VoceRow
            key={`db-${v.id}`}
            nome={v.nomeAlimento}
            quantita={v.quantita}
            unita={v.unita}
            tipoPasto={v.tipoPasto}
            orario={v.orario}
            kcal={v.kcal}
            proteineG={v.proteineG}
            carboidratiG={v.carboidratiG}
            grassiG={v.grassiG}
            salvata
            onRimuovi={() => handleRimuoviGiaSalvata(v.id, v.nomeAlimento)}
          />
        ))}

        {bozzaNuove.map((v) => (
          <VoceRow
            key={`bozza-${v.idBozza}`}
            nome={v.nomeAlimento}
            quantita={v.quantita}
            unita={v.unita}
            tipoPasto={v.tipoPasto}
            orario={v.orario}
            kcal={v.kcal}
            proteineG={v.proteineG}
            carboidratiG={v.carboidratiG}
            grassiG={v.grassiG}
            salvata={false}
            onRimuovi={() => handleRimuoviBozza(v.idBozza, v.nomeAlimento)}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
        <div className="text-slate-600 dark:text-slate-300">
          Totale: {Math.round(totali.kcal)} kcal · Proteine {totali.proteineG.toFixed(1)}g · Carboidrati{" "}
          {totali.carboidratiG.toFixed(1)}g · Grassi {totali.grassiG.toFixed(1)}g
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={handleSvuotaLista}
            disabled={salvataggio || (giaSalvateVisibili.length === 0 && bozzaNuove.length === 0)}
            className="rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            Svuota lista
          </button>
          <button
            onClick={handleConferma}
            disabled={salvataggio || numeroModifichePendenti === 0}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvataggio ? "Salvataggio…" : "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );
});

function VoceRow({
  nome,
  quantita,
  unita,
  tipoPasto,
  orario,
  kcal,
  proteineG,
  carboidratiG,
  grassiG,
  salvata,
  onRimuovi,
}: {
  nome: string;
  quantita: number;
  unita: UnitaAlimento;
  tipoPasto: TipoPasto;
  orario: string | null;
  kcal: number;
  proteineG: number;
  carboidratiG: number;
  grassiG: number;
  salvata: boolean;
  onRimuovi: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-slate-200 px-2 py-1 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
          {nome} ({quantita}{unita}) · {ETICHETTA_PASTO[tipoPasto]}
          {orario && <span className="text-slate-400 dark:text-slate-500">· {orario}</span>}
          {!salvata && (
            <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-normal uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              in bozza
            </span>
          )}
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          {Math.round(kcal)} kcal · P {proteineG.toFixed(1)}g · C {carboidratiG.toFixed(1)}g · G{" "}
          {grassiG.toFixed(1)}g
        </div>
      </div>
      <button
        onClick={onRimuovi}
        className="shrink-0 rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        title="Rimuovi"
      >
        ✕
      </button>
    </div>
  );
}

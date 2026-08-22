import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../lib/useFocusTrap";
import {
  leggiProfilo,
  salvaProfilo,
  elencaLivelliFitness,
  leggiLivelloFitnessAttivo,
  impostaLivelloFitness,
  type Sesso,
  type LivelloFitness,
} from "../lib/profile";
import { calcolaTDEE } from "../lib/tdee";
import { registraErroreNonBloccante } from "../lib/errorLog";
import type { VocePeso } from "../lib/weight";
import { SelettorePersonalizzato } from "./SelettorePersonalizzato";
import { useConfermaChiusura } from "./ConfermaModal";
import { accettaDueDecimali } from "../lib/inputNumerico";
import { TourAnteprimaPannello } from "./TourAnteprimaPannello";
import { stepsProfilo } from "../lib/tourImpostazioni";

interface ProfileModalProps {
  peso: VocePeso[];
  onClose: () => void;
  onSaved: () => void;
}

const CAMPO =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const ETA_MIN = 1;
const ETA_MAX = 120;
const ALTEZZA_MIN_CM = 50;
const ALTEZZA_MAX_CM = 250;

// Solo anagrafica e livello di attività: NON tocca il limite kcal (goal/goal_history) - quella
// scelta si fa nella modale "Imposta limite giornaliero di… → Kcal", che può usare questo profilo
// per calcolare un TDEE live (checkbox "Usa TDEE calcolato"), ma il profilo e il limite restano due
// cose distinte che convivono, non una sostituisce l'altra.
export function ProfileModal({ peso, onClose, onSaved }: ProfileModalProps) {
  const [caricato, setCaricato] = useState(false);
  const [eta, setEta] = useState("");
  const [altezza, setAltezza] = useState("");
  const [sesso, setSesso] = useState<Sesso>("M");
  const [livelli, setLivelli] = useState<LivelloFitness[]>([]);
  const [livelloId, setLivelloId] = useState<number | "">("");
  const [livelloAttualeId, setLivelloAttualeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modificato, setModificato] = useState(false);
  const [tourAperto, setTourAperto] = useState(false);
  const { richiediChiusura, elementoConferma } = useConfermaChiusura(modificato, onClose);
  const idTitolo = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef, richiediChiusura);

  useEffect(() => {
    Promise.all([leggiProfilo(), elencaLivelliFitness(), leggiLivelloFitnessAttivo()])
      .then(([profilo, elenco, attivo]) => {
        if (profilo) {
          setEta(String(profilo.etaAnni));
          setAltezza(String(profilo.altezzaCm));
          setSesso(profilo.sesso);
        }
        setLivelli(elenco);
        if (attivo) {
          setLivelloId(attivo.id);
          setLivelloAttualeId(attivo.id);
        } else if (elenco.length > 0) {
          setLivelloId(elenco[0]!.id);
        }
        setCaricato(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Errore durante il caricamento");
        registraErroreNonBloccante(err, "Caricamento profilo/TDEE fallito");
      });
  }, []);

  const ultimoPeso = peso.length > 0 ? peso[peso.length - 1] : null;
  const livelloSelezionato = livelli.find((l) => l.id === livelloId);
  const etaNum = Number(eta);
  const altezzaNum = Number(altezza);
  const profiloValido =
    Number.isFinite(etaNum) &&
    etaNum >= ETA_MIN &&
    etaNum <= ETA_MAX &&
    Number.isFinite(altezzaNum) &&
    altezzaNum >= ALTEZZA_MIN_CM &&
    altezzaNum <= ALTEZZA_MAX_CM;

  // Solo un'anteprima informativa qui - niente di persistito finché non si salva, e non è
  // comunque questa la modale che applica il valore a un limite: serve solo a farti vedere
  // subito l'effetto di età/altezza/sesso/attività prima di andare a impostare il limite altrove.
  const risultato =
    profiloValido && ultimoPeso && livelloSelezionato
      ? calcolaTDEE(
          { etaAnni: etaNum, altezzaCm: altezzaNum, sesso },
          ultimoPeso.pesoKg,
          livelloSelezionato.moltiplicatore,
        )
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!profiloValido) {
      setError(`Età tra ${ETA_MIN} e ${ETA_MAX} anni, altezza tra ${ALTEZZA_MIN_CM} e ${ALTEZZA_MAX_CM} cm`);
      return;
    }
    if (livelloId === "") {
      setError("Seleziona un livello di attività");
      return;
    }

    setSaving(true);
    try {
      await salvaProfilo({ etaAnni: etaNum, altezzaCm: altezzaNum, sesso });
      // Una nuova riga in profile_fitness solo se il livello è davvero cambiato - riselezionare
      // lo stesso livello ogni volta che si riapre la modale non deve accumulare storico ridondante.
      if (livelloId !== livelloAttualeId) {
        await impostaLivelloFitness(livelloId);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {elementoConferma}
      {createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 text-slate-900 dark:text-slate-100" onClick={richiediChiusura}>
      <div onClick={(e) => e.stopPropagation()} className="min-h-0 p-[3vmin]">
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        tabIndex={-1}
        id="anteprima-tour-root"
        onClick={(e) => e.stopPropagation()}
        className="w-96 min-h-85 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        {tourAperto && <TourAnteprimaPannello steps={stepsProfilo} onCompletato={() => setTourAperto(false)} />}
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={idTitolo} className="text-sm font-semibold text-slate-800 dark:text-slate-100">Profilo (per il TDEE)</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTourAperto(true)}
              title="Cosa sono questi campi"
              className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              ?
            </button>
            <button
              onClick={richiediChiusura}
              className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        {!caricato ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Caricamento…</p>
        ) : (
          <form onSubmit={handleSubmit} onChange={() => setModificato(true)} className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-0.5" data-tour="profilo-eta">
                Età (anni) *
                <input
                  className={CAMPO}
                  type="number"
                  min={ETA_MIN}
                  max={ETA_MAX}
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="flex flex-1 flex-col gap-0.5" data-tour="profilo-altezza">
                Altezza (cm) *
                <input
                  className={CAMPO}
                  type="number"
                  min={ALTEZZA_MIN_CM}
                  max={ALTEZZA_MAX_CM}
                  step="0.01"
                  value={altezza}
                  onChange={(e) => {
                    if (accettaDueDecimali(e.target.value)) setAltezza(e.target.value);
                  }}
                />
              </label>
            </div>

            <label className="flex flex-col gap-0.5" data-tour="profilo-sesso">
              Sesso
              <SelettorePersonalizzato
                valore={sesso}
                opzioni={[
                  { valore: "M", etichetta: "Maschio" },
                  { valore: "F", etichetta: "Femmina" },
                ]}
                onChange={(v) => {
                  setSesso(v);
                  setModificato(true);
                }}
              />
            </label>

            <label className="flex flex-col gap-0.5" data-tour="profilo-livello-attivita">
              Livello di attività
              <SelettorePersonalizzato
                valore={livelloId}
                opzioni={livelli.map((l) => ({ valore: l.id, etichetta: `${l.etichetta} (${l.descrizione})` }))}
                onChange={(v) => {
                  setLivelloId(v);
                  setModificato(true);
                }}
              />
            </label>

            {!ultimoPeso && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Nessun peso registrato - registrane almeno uno nel pannello "Peso Corporeo" per vedere
                l'anteprima del TDEE (la formula ha bisogno anche del peso attuale).
              </p>
            )}

            {risultato && (
              <div className="rounded-lg bg-slate-100 p-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <div>
                  BMR (calorie a riposo): <span className="font-semibold">{risultato.bmr} kcal</span>
                </div>
                <div>
                  TDEE (mantenimento): <span className="font-semibold">{risultato.tdee} kcal</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Per usarlo come limite kcal, vai su Diario Alimentare → Imposta limite giornaliero di…
                  → Kcal e spunta "Usa TDEE calcolato".
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={richiediChiusura}
                className="rounded px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={saving}
                data-tour="profilo-salva"
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Salvataggio…" : "Salva profilo"}
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
        </div>,
        document.body,
      )}
    </>
  );
}

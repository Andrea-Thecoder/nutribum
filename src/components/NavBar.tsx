import { useEffect, useState, type ReactElement } from "react";
import { format } from "date-fns";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { generaModuloFeedbackPdf } from "../lib/generaModuloFeedback";
import { useImportGiorno } from "../lib/useImportGiorno";
import { useImportAlimenti } from "../lib/useImportAlimenti";
import { useImportWeight } from "../lib/useImportWeight";
import { EsitoPopup } from "./EsitoPopup";
import { ObiettivoGiornalieroModal, type TipoObiettivo } from "./ObiettivoGiornalieroModal";
import { DEFINIZIONI_PANNELLI, type TipoPannello } from "../lib/layoutSchema";
import {
  elencaStoricoObiettivo,
  calcolaStatoSforamenti,
  calcolaStatoPositivo,
  dettaglioGiorniSforati,
  calcolaStatoCarenza,
  dettaglioGiorniCarenti,
  type PuntoStoricoObiettivo,
} from "../lib/dailyGoal";
import { registraErroreNonBloccante } from "../lib/errorLog";
import type { GiornoStorico } from "../lib/schema";
import { SforamentoDettaglioModal } from "./SforamentoDettaglioModal";
import {
  calcolaStatoSforamentoPeso,
  dettaglioMisurazioniSforatePeso,
  calcolaStatoPositivoPeso,
  type VocePeso,
} from "../lib/weight";
import { ProfileModal } from "./ProfileModal";
import { ReportPdfModal } from "./report/ReportPdfModal";
import { EsportaPrimaDiCancellareModal } from "./EsportaPrimaDiCancellareModal";
import { useConferma } from "./ConfermaModal";
import { InfoModal } from "./InfoModal";
import { GlossarioContenuto } from "./GlossarioContenuto";
import { getVersion } from "@tauri-apps/api/app";
import { useAggiornamenti } from "../lib/useAggiornamenti";
import type { PuntoStoricoObiettivoPeso } from "../lib/weight";
import type { PuntoStoricoProfilo, PuntoStoricoFitness } from "../lib/profile";

interface NavBarProps {
  onImportato: () => void;
  onAddPanel: (tipo: TipoPannello) => void;
  onAddAllPanels: () => void;
  onExportHistoryJson: () => void;
  onExportHistoryCsv: () => void;
  onResetLayout: () => void;
  onNuovoAlimento: () => void;
  onNuovaRicetta: () => void;
  onAlimentiImportati: () => void;
  onExportFoodsJson: () => void;
  onExportFoodsCsv: () => void;
  onObiettivoSalvato: () => void;
  onApriGiorno: (data: string) => void;
  ancoraGriglia: boolean;
  onToggleAncoraGriglia: () => void;
  tipiEsistenti: TipoPannello[];
  giorni: GiornoStorico[];
  versioneObiettivi: number;
  peso: VocePeso[];
  obiettivoPesoKg: number | null;
  margineObiettivoPesoKg: number;
  storicoObiettivoPeso: PuntoStoricoObiettivoPeso[];
  storicoProfilo: PuntoStoricoProfilo[];
  storicoFitness: PuntoStoricoFitness[];
  onWeightImported: () => void;
  onExportWeightJson: () => void;
  onExportWeightCsv: () => void;
  onApriInserimentoPeso: () => void;
  onApriObiettivoPeso: () => void;
  onAzzeraImpostazioni: () => void;
  onSvuotaDiario: () => Promise<void>;
  onCancellaTuttiIDati: () => Promise<void>;
  onEsportaBackupCompletoJson: () => Promise<boolean>;
  onEsportaDiarioJsonPreCancellazione: () => Promise<boolean>;
  onEsportaDiarioCsvPreCancellazione: () => Promise<boolean>;
  onImportaBackupCompleto: () => Promise<void>;
}

const SOGLIA_SERIE_CONSECUTIVA = 5;
const SOGLIA_GIORNI_NEL_MESE = 15;
const SOGLIA_SERIE_PULITA = 5;
const SOGLIA_GIORNI_PULITI_MESE = 15;
// Stessi valori numerici della soglia kcal/macro (per coerenza), ma costanti separate: il peso è
// un dominio indipendente, potrebbe aver bisogno di soglie diverse in futuro senza toccare quelle.
const SOGLIA_SERIE_CONSECUTIVA_PESO = 5;
const SOGLIA_GIORNI_NEL_MESE_PESO = 15;
const SOGLIA_SERIE_PULITA_PESO = 5;
const SOGLIA_GIORNI_PULITI_MESE_PESO = 15;

type BadgePositivo =
  | { tipo: "serie"; valore: number }
  | { tipo: "settimana" }
  | { tipo: "mese"; valore: number };

// OR tra le tre condizioni (non "esattamente una"): 5 giorni di fila puliti OPPURE settimana pulita
// OPPURE 15 giorni puliti nel mese bastano da soli, con priorità serie > settimana > mese quando più
// di una è vera insieme (non serve arbitrare cosa festeggiare, si mostra il traguardo più specifico).
// Il badge va soppresso SOLO quando la stessa metrica ha ANCHE un avviso negativo attivo in
// contemporanea (es. 15 giorni puliti nel mese ma anche 15 giorni sforati nello stesso mese,
// magari in periodi diversi) - segnali contraddittori, richiesto esplicitamente - non quando sono
// vere più condizioni positive tra loro, quello è normale (una serie di 5 è quasi sempre anche una
// "settimana pulita" se cade di lunedì-venerdì). Soglie passate come parametri per poter riusare la
// stessa funzione sia per kcal/macro che per il peso, ciascuno con le proprie soglie indipendenti.
function risolviBadgePositivo(
  serieConsecutivaPulita: number,
  settimanaPulita: boolean,
  giorniPulitiNelMese: number,
  sogliaSerie: number,
  sogliaGiorniMese: number,
  sforamentoAttivo: boolean,
): BadgePositivo | null {
  if (sforamentoAttivo) return null;
  const condSerie = serieConsecutivaPulita >= sogliaSerie;
  const condSettimana = settimanaPulita;
  const condMese = giorniPulitiNelMese >= sogliaGiorniMese;
  if (condSerie) return { tipo: "serie", valore: serieConsecutivaPulita };
  if (condSettimana) return { tipo: "settimana" };
  if (condMese) return { tipo: "mese", valore: giorniPulitiNelMese };
  return null;
}

function useMenuApribile() {
  const [aperto, setAperto] = useState<string | null>(null);
  return {
    current: aperto,
    isAperto: (nome: string) => aperto === nome,
    open: (nome: string) => setAperto(nome),
    toggle: (nome: string) => setAperto((a) => (a === nome ? null : nome)),
    chiudi: () => setAperto(null),
  };
}

type ImportExportSubmenu = "import" | "export" | null;

export function NavBar({
  onImportato,
  onAddPanel,
  onAddAllPanels,
  onExportHistoryJson,
  onExportHistoryCsv,
  onResetLayout,
  onNuovoAlimento,
  onNuovaRicetta,
  onAlimentiImportati,
  onExportFoodsJson,
  onExportFoodsCsv,
  onObiettivoSalvato,
  onApriGiorno,
  ancoraGriglia,
  onToggleAncoraGriglia,
  tipiEsistenti,
  giorni,
  versioneObiettivi,
  peso,
  obiettivoPesoKg,
  margineObiettivoPesoKg,
  storicoObiettivoPeso,
  storicoProfilo,
  storicoFitness,
  onWeightImported,
  onExportWeightJson,
  onExportWeightCsv,
  onApriInserimentoPeso,
  onApriObiettivoPeso,
  onAzzeraImpostazioni,
  onSvuotaDiario,
  onCancellaTuttiIDati,
  onEsportaBackupCompletoJson,
  onEsportaDiarioJsonPreCancellazione,
  onEsportaDiarioCsvPreCancellazione,
  onImportaBackupCompleto,
}: NavBarProps) {
  const menu = useMenuApribile();
  const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);
  const [limiteSubmenuAperto, setLimiteSubmenuAperto] = useState(false);
  const [foodsSubmenu, setFoodsSubmenu] = useState<ImportExportSubmenu>(null);
  const [diarySubmenu, setDiarySubmenu] = useState<ImportExportSubmenu>(null);
  const [weightSubmenu, setWeightSubmenu] = useState<ImportExportSubmenu>(null);
  const [obiettivoModaleAperto, setObiettivoModaleAperto] = useState<TipoObiettivo | null>(null);
  const [storicoObiettivi, setStoricoObiettivi] = useState<PuntoStoricoObiettivo[]>([]);
  const [dettaglioSforamentoAperto, setDettaglioSforamentoAperto] = useState<"serie" | "mese" | null>(null);
  const [dettaglioSforamentoPesoAperto, setDettaglioSforamentoPesoAperto] = useState<"serie" | "mese" | null>(
    null,
  );
  const [dettaglioCarenzaAperto, setDettaglioCarenzaAperto] = useState<"serie" | "mese" | null>(null);
  const [profileModalAperta, setProfileModalAperta] = useState(false);
  const [reportPdfModalAperta, setReportPdfModalAperta] = useState(false);
  // Flusso di sicurezza a 2 passi per le azioni distruttive: "diario"/"tutto" apre il secondo
  // passo (EsportaPrimaDiCancellareModal) dopo che il primo (chiedi() sotto) è già stato confermato.
  const [flussoCancellazione, setFlussoCancellazione] = useState<"diario" | "tutto" | null>(null);
  const [caricamentoBackup, setCaricamentoBackup] = useState(false);
  const [esitoBackup, setEsitoBackup] = useState<{ tipo: "successo" | "errore"; messaggio: string } | null>(null);
  const { chiedi, elemento: modaleConferma } = useConferma();
  const [modaleAiuto, setModaleAiuto] = useState<"glossario" | "feedback" | "informazioni" | null>(null);
  const [versioneApp, setVersioneApp] = useState<string | null>(null);
  const [scaricamentoModuloFeedback, setScaricamentoModuloFeedback] = useState(false);
  const [erroreModuloFeedback, setErroreModuloFeedback] = useState<string | null>(null);

  useEffect(() => {
    getVersion()
      .then(setVersioneApp)
      .catch((err) => registraErroreNonBloccante(err, "Lettura versione app (menu Aiuto) fallita"));
  }, []);
  const {
    aggiornamentiAutomatici,
    controlloInCorso: controlloAggiornamentiInCorso,
    esito: esitoAggiornamento,
    chiudiEsito: chiudiEsitoAggiornamento,
    cercaAggiornamenti,
    toggleAggiornamentiAutomatici,
  } = useAggiornamenti(chiedi);

  useEffect(() => {
    elencaStoricoObiettivo()
      .then(setStoricoObiettivi)
      .catch((err) => registraErroreNonBloccante(err, "Caricamento storico obiettivi (NavBar) fallito"));
  }, [versioneObiettivi]);

  const oggi = format(new Date(), "yyyy-MM-dd");
  const { serieConsecutiva, giorniSforatiNelMese } = calcolaStatoSforamenti(giorni, storicoObiettivi, oggi);
  const sforamentoGrave = giorniSforatiNelMese >= SOGLIA_GIORNI_NEL_MESE;
  const sforamentoSerie = serieConsecutiva >= SOGLIA_SERIE_CONSECUTIVA;
  // Stesso dominio "kcal" dello sforamento (non un dominio indipendente come il peso), rischio
  // opposto: giorni sotto il limite minimo effettivo (manuale o BMR di fallback). Stesse soglie
  // dello sforamento kcal, coerente perché è la stessa metrica letta dall'altro lato.
  const { serieConsecutiva: serieConsecutivaCarenza, giorniCarentiNelMese } = calcolaStatoCarenza(
    giorni,
    storicoObiettivi,
    storicoProfilo,
    storicoFitness,
    peso,
    oggi,
  );
  const carenzaGrave = giorniCarentiNelMese >= SOGLIA_GIORNI_NEL_MESE;
  const carenzaSerie = serieConsecutivaCarenza >= SOGLIA_SERIE_CONSECUTIVA;
  const { serieConsecutiva: serieConsecutivaPeso, giorniSforatiNelMese: giorniSforatiNelMesePeso } =
    calcolaStatoSforamentoPeso(peso, obiettivoPesoKg, oggi, margineObiettivoPesoKg);
  const sforamentoPesoGrave = giorniSforatiNelMesePeso >= SOGLIA_GIORNI_NEL_MESE_PESO;
  const sforamentoPesoSerie = serieConsecutivaPeso >= SOGLIA_SERIE_CONSECUTIVA_PESO;
  const { serieConsecutivaPulita, settimanaPulita, giorniPulitiNelMese } = calcolaStatoPositivo(
    giorni,
    storicoObiettivi,
    oggi,
  );
  const badgePositivo = risolviBadgePositivo(
    serieConsecutivaPulita,
    settimanaPulita,
    giorniPulitiNelMese,
    SOGLIA_SERIE_PULITA,
    SOGLIA_GIORNI_PULITI_MESE,
    sforamentoGrave || sforamentoSerie || carenzaGrave || carenzaSerie,
  );
  const {
    serieConsecutivaPulita: serieConsecutivaPulitaPeso,
    settimanaPulita: settimanaPulitaPeso,
    giorniPulitiNelMese: giorniPulitiNelMesePeso,
  } = calcolaStatoPositivoPeso(peso, obiettivoPesoKg, oggi, margineObiettivoPesoKg);
  const badgePositivoPeso = risolviBadgePositivo(
    serieConsecutivaPulitaPeso,
    settimanaPulitaPeso,
    giorniPulitiNelMesePeso,
    SOGLIA_SERIE_PULITA_PESO,
    SOGLIA_GIORNI_PULITI_MESE_PESO,
    sforamentoPesoGrave || sforamentoPesoSerie,
  );
  const {
    importaDaJson: importaGiornoDaJson,
    importaDaCsv: importaGiornoDaCsv,
    caricamento,
    esito,
    chiudiEsito,
  } = useImportGiorno(onImportato);
  const {
    importaDaJson: importaAlimentoDaJson,
    importaDaCsv: importaAlimentoDaCsv,
    caricamento: caricamentoAlimenti,
    esito: esitoAlimenti,
    chiudiEsito: chiudiEsitoAlimenti,
  } = useImportAlimenti(onAlimentiImportati);
  const {
    importFromJson: importWeightFromJson,
    importFromCsv: importWeightFromCsv,
    loading: weightLoading,
    result: weightImportResult,
    closeResult: closeWeightImportResult,
  } = useImportWeight(onWeightImported);
  const pannelliDisponibili = DEFINIZIONI_PANNELLI.filter(
    (def) => !tipiEsistenti.includes(def.tipo),
  );

  function closeAllSubmenus() {
    setSettingsSubmenuOpen(false);
    setLimiteSubmenuAperto(false);
    setFoodsSubmenu(null);
    setDiarySubmenu(null);
    setWeightSubmenu(null);
  }

  function closeAll() {
    menu.chiudi();
    closeAllSubmenus();
  }

  function toggleTopMenu(nome: string) {
    closeAllSubmenus();
    menu.toggle(nome);
  }

  // Una volta che un menu principale è già aperto (per click), spostare il mouse su un altro passa
  // direttamente a quello - come in una vera barra dei menu - senza richiedere un secondo click.
  function switchMenuOnHover(nome: string) {
    if (menu.current !== null && menu.current !== nome) {
      closeAllSubmenus();
      menu.open(nome);
    }
  }

  // Non tocca dati utente (solo layout/margine/movimento libero), ma resta un avviso semplice:
  // l'utente potrebbe aver personalizzato la dashboard e non vuole perderla senza saperlo.
  async function handleClickAzzeraImpostazioni() {
    closeAll();
    const ok = await chiedi(
      "Questa azione riporterà il layout della dashboard, il margine obiettivo peso e il movimento libero ai valori di default (i dati - alimenti, diario, peso, obiettivi, profilo - non vengono toccati). Continuare?",
      { distruttivo: true },
    );
    if (ok) onAzzeraImpostazioni();
  }

  // Primo passo del flusso di sicurezza (conferma semplice, useConferma già usato altrove); solo se
  // confermato si apre il secondo passo (EsportaPrimaDiCancellareModal, che offre l'export prima di
  // procedere davvero). Le due azioni vere e proprie (svuota/cancella) restano dentro quella modale.
  async function handleClickSvuotaDiario() {
    closeAll();
    const ok = await chiedi(
      "Questa azione cancellerà definitivamente TUTTE le voci di TUTTI i giorni del diario alimentare (il catalogo alimenti, le ricette e il resto non vengono toccati). Continuare?",
      { distruttivo: true },
    );
    if (ok) setFlussoCancellazione("diario");
  }

  async function handleClickCancellaTuttiIDati() {
    closeAll();
    const ok = await chiedi(
      "Questa azione cancellerà DEFINITIVAMENTE tutti i dati dell'app: catalogo alimenti, diario, ricette, peso, obiettivi e profilo. Continuare?",
      { distruttivo: true },
    );
    if (ok) setFlussoCancellazione("tutto");
  }

  function handleClickCercaAggiornamenti() {
    closeAll();
    cercaAggiornamenti();
  }

  function handleClickToggleAggiornamentiAutomatici() {
    closeAll();
    toggleAggiornamentiAutomatici();
  }

  async function handleClickReimportaBackup() {
    closeAll();
    const ok = await chiedi(
      "Importare un backup sovrascriverà TUTTI i dati attuali dell'app con quelli del file scelto. Continuare?",
      { distruttivo: true },
    );
    if (!ok) return;
    setCaricamentoBackup(true);
    try {
      await onImportaBackupCompleto();
      setEsitoBackup({ tipo: "successo", messaggio: "Backup importato correttamente." });
    } catch (err) {
      setEsitoBackup({
        tipo: "errore",
        messaggio: err instanceof Error ? err.message : "Errore durante l'importazione del backup",
      });
    } finally {
      setCaricamentoBackup(false);
    }
  }

  async function handleScaricaModuloFeedback() {
    setErroreModuloFeedback(null);
    setScaricamentoModuloFeedback(true);
    try {
      const percorso = await save({
        defaultPath: "nutribum-modulo-feedback.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!percorso) return;
      const bytes = await generaModuloFeedbackPdf();
      await writeFile(percorso, bytes);
      setModaleAiuto(null);
    } catch (err) {
      setErroreModuloFeedback(
        err instanceof Error ? err.message : "Errore durante la generazione del modulo PDF",
      );
    } finally {
      setScaricamentoModuloFeedback(false);
    }
  }

  return (
    <div className="relative border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-black">
      {(menu.isAperto("file") ||
        menu.isAperto("graph") ||
        menu.isAperto("alimenti") ||
        menu.isAperto("diario") ||
        menu.isAperto("peso")) && (
        <div className="fixed inset-0 z-9998" onClick={closeAll} />
      )}

      {/* z-index molto alto e fisso: i pannelli della dashboard salgono di z-index illimitatamente
          ad ogni click (portaInPrimoPiano), la navbar deve restare sopra sempre, non solo finché
          nessun pannello supera un valore arbitrario più basso. */}
      <div className="relative z-9999 flex items-center gap-1 px-3 py-2">
        <div className="relative">
          <button
            onClick={() => toggleTopMenu("file")}
            onMouseEnter={() => switchMenuOnHover("file")}
            className="rounded px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Operazioni sull'applicazione: impostazioni e chiusura"
          >
            File
          </button>
          {menu.isAperto("file") && (
            <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
              <div className="relative">
                <button
                  onClick={() => setSettingsSubmenuOpen((a) => !a)}
                  onMouseEnter={() => setSettingsSubmenuOpen(true)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  title="Apre le opzioni di configurazione dell'app: movimento pannelli e layout"
                >
                  Impostazioni
                  <span className="text-slate-400">›</span>
                </button>
                {settingsSubmenuOpen && (
                  <div className="absolute left-full top-0 ml-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
                    <button
                      onClick={onToggleAncoraGriglia}
                      title="Se attivo, trascinamento e ridimensionamento seguono liberamente il mouse e si allineano alla griglia solo al rilascio; se disattivo, scattano a step interi di griglia durante il movimento"
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Movimento libero
                      <span className="w-4 shrink-0 text-center">{!ancoraGriglia ? "✓" : ""}</span>
                    </button>

                    <button
                      onClick={() => {
                        onResetLayout();
                        closeAll();
                      }}
                      title="Ripristina la disposizione predefinita dei pannelli sulla board (i pannelli ancorati non vengono toccati)"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Reimposta layout pannelli
                    </button>

                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

                    <button
                      onClick={handleClickCercaAggiornamenti}
                      disabled={controlloAggiornamentiInCorso}
                      title="Controlla se è disponibile una nuova versione di NutriBum (richiede una connessione a internet; nessun dato dell'app viene inviato online)"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {controlloAggiornamentiInCorso ? "Ricerca in corso…" : "Cerca aggiornamenti"}
                    </button>

                    <button
                      onClick={handleClickToggleAggiornamentiAutomatici}
                      title="Se attivo, l'app verifica da sola ad ogni avvio se è disponibile una nuova versione (richiede una connessione a internet; nessun dato dell'app viene inviato online)"
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Aggiornamenti automatici
                      <span className="w-4 shrink-0 text-center">{aggiornamentiAutomatici ? "✓" : ""}</span>
                    </button>

                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

                    <button
                      onClick={handleClickReimportaBackup}
                      disabled={caricamentoBackup}
                      title="Carica un backup completo esportato da NutriBum e sovrascrive tutti i dati attuali"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {caricamentoBackup ? "Importazione…" : "Reimporta backup completo…"}
                    </button>

                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

                    <button
                      onClick={handleClickAzzeraImpostazioni}
                      title="Riporta layout dashboard, margine obiettivo peso e movimento libero ai valori di default - non tocca alimenti/diario/peso/obiettivi/profilo"
                      className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Azzera impostazioni
                    </button>

                    <button
                      onClick={handleClickSvuotaDiario}
                      title="Cancella definitivamente tutte le voci di tutti i giorni del diario alimentare (non tocca il resto)"
                      className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Svuota diario alimentare
                    </button>

                    <button
                      onClick={handleClickCancellaTuttiIDati}
                      title="Cancella definitivamente tutti i dati dell'app (alimenti, diario, ricette, peso, obiettivi, profilo)"
                      className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Cancella tutti i dati
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => getCurrentWindow().close()}
                title="Chiude l'applicazione"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Chiudi
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => toggleTopMenu("alimenti")}
            onMouseEnter={() => switchMenuOnHover("alimenti")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Elenco degli alimenti disponibili (kcal, proteine, carboidrati, grassi per 100g o 100ml): qui importi, esporti o aggiungi alimenti al catalogo"
          >
            Scheda Alimenti
          </button>
          {menu.isAperto("alimenti") && (
            <div className="absolute left-0 top-full mt-1 w-60 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
              <div className="relative">
                <button
                  onClick={() => setFoodsSubmenu((s) => (s === "import" ? null : "import"))}
                  onMouseEnter={() => setFoodsSubmenu("import")}
                  disabled={caricamentoAlimenti}
                  title="Aggiunge nuovi alimenti al catalogo leggendoli da un file"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {caricamentoAlimenti ? "Importazione…" : "Importa alimenti"}
                  <span className="text-slate-400">›</span>
                </button>
                {foodsSubmenu === "import" && (
                  <div className="absolute left-full top-0 ml-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
                    <button
                      onClick={() => {
                        importaAlimentoDaJson();
                        closeAll();
                      }}
                      disabled={caricamentoAlimenti}
                      title="Importa alimenti da un file JSON (array di oggetti con nome e valori nutrizionali per 100g o 100ml)"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Da JSON…
                    </button>
                    <button
                      onClick={() => {
                        importaAlimentoDaCsv();
                        closeAll();
                      }}
                      disabled={caricamentoAlimenti}
                      title="Importa alimenti da un file CSV con intestazione (nome, unita, kcal_100, proteine_100, …)"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Da CSV…
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setFoodsSubmenu((s) => (s === "export" ? null : "export"))}
                  onMouseEnter={() => setFoodsSubmenu("export")}
                  title="Salva l'intero catalogo alimenti su file, in una cartella a tua scelta"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Esporta alimenti
                  <span className="text-slate-400">›</span>
                </button>
                {foodsSubmenu === "export" && (
                  <div className="absolute left-full top-0 ml-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
                    <button
                      onClick={() => {
                        onExportFoodsJson();
                        closeAll();
                      }}
                      title="Crea un file JSON con tutti gli alimenti del catalogo e i loro valori nutrizionali per 100g o 100ml; ti verrà chiesto dove salvarlo"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      In JSON…
                    </button>
                    <button
                      onClick={() => {
                        onExportFoodsCsv();
                        closeAll();
                      }}
                      title="Crea un file CSV con tutti gli alimenti del catalogo, una riga per alimento; ti verrà chiesto dove salvarlo"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      In CSV…
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  onNuovoAlimento();
                  closeAll();
                }}
                onMouseEnter={() => setFoodsSubmenu(null)}
                title="Apre il modulo per inserire manualmente un nuovo alimento nel catalogo"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Aggiungi singolo alimento
              </button>
              <button
                onClick={() => {
                  onNuovaRicetta();
                  closeAll();
                }}
                onMouseEnter={() => setFoodsSubmenu(null)}
                title="Apre il modulo per creare una nuova ricetta (combinazione di alimenti riusabile)"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Nuova ricetta…
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => toggleTopMenu("diario")}
            onMouseEnter={() => switchMenuOnHover("diario")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Il registro di ciò che mangi ogni giorno: qui importi/esporti lo storico dei pasti e imposti i limiti giornalieri"
          >
            Diario Alimentare
          </button>
          {menu.isAperto("diario") && (
            <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
              <div className="relative">
                <button
                  onClick={() => setLimiteSubmenuAperto((a) => !a)}
                  onMouseEnter={() => {
                    setLimiteSubmenuAperto(true);
                    setDiarySubmenu(null);
                  }}
                  title="Imposta un limite giornaliero (kcal, macronutrienti o altro) da monitorare"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Imposta limite giornaliero di…
                  <span className="text-slate-400">›</span>
                </button>
                {limiteSubmenuAperto && (
                  <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
                    <button
                      onClick={() => {
                        setObiettivoModaleAperto("kcal");
                        closeAll();
                      }}
                      title="Imposta il limite di calorie giornaliere"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Kcal…
                    </button>
                    <button
                      onClick={() => {
                        setObiettivoModaleAperto("macro");
                        closeAll();
                      }}
                      title="Imposta i limiti giornalieri di grassi, proteine e carboidrati"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Macronutrienti…
                    </button>
                    <button
                      onClick={() => {
                        setObiettivoModaleAperto("altro");
                        closeAll();
                      }}
                      title="Imposta i limiti giornalieri di sale e fibre"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Altro…
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setProfileModalAperta(true);
                  closeAll();
                }}
                onMouseEnter={() => setLimiteSubmenuAperto(false)}
                title="Anagrafica (età, altezza, sesso, livello di attività) usata per stimare il TDEE - poi lo puoi usare come limite kcal dalla modale 'Imposta limite giornaliero di… → Kcal'"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Profilo (per il TDEE)…
              </button>

              <div className="relative">
                <button
                  onClick={() => setDiarySubmenu((s) => (s === "import" ? null : "import"))}
                  onMouseEnter={() => {
                    setDiarySubmenu("import");
                    setLimiteSubmenuAperto(false);
                  }}
                  disabled={caricamento}
                  title="Aggiunge voci al diario alimentare leggendole da un file"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {caricamento ? "Importazione…" : "Importa diario alimentare"}
                  <span className="text-slate-400">›</span>
                </button>
                {diarySubmenu === "import" && (
                  <div className="absolute left-full top-0 ml-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
                    <button
                      onClick={() => {
                        importaGiornoDaJson();
                        closeAll();
                      }}
                      disabled={caricamento}
                      title="Importa uno o più giorni di diario da file JSON (puoi selezionare più file insieme)"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Da JSON… (uno o più file)
                    </button>
                    <button
                      onClick={() => {
                        importaGiornoDaCsv();
                        closeAll();
                      }}
                      disabled={caricamento}
                      title="Importa un giorno di diario da un file CSV"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Da CSV…
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setDiarySubmenu((s) => (s === "export" ? null : "export"))}
                  onMouseEnter={() => {
                    setDiarySubmenu("export");
                    setLimiteSubmenuAperto(false);
                  }}
                  title="Salva il diario alimentare su file, in una cartella a tua scelta"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Esporta diario alimentare
                  <span className="text-slate-400">›</span>
                </button>
                {diarySubmenu === "export" && (
                  <div className="absolute left-full top-0 ml-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
                    <button
                      onClick={() => {
                        onExportHistoryJson();
                        closeAll();
                      }}
                      title="Crea un file JSON con l'intero storico del diario alimentare; ti verrà chiesto dove salvarlo"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      In JSON…
                    </button>
                    <button
                      onClick={() => {
                        onExportHistoryCsv();
                        closeAll();
                      }}
                      title="Crea un file CSV con una riga per ogni voce registrata (data, orario, pasto, alimento, quantità, valori nutrizionali); ti verrà chiesto dove salvarlo"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      In CSV…
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setReportPdfModalAperta(true);
                  closeAll();
                }}
                title="Genera un report PDF con tabelle riassuntive e grafici (kcal/macro, peso, TDEE) per un periodo a scelta"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Esporta report PDF…
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => toggleTopMenu("peso")}
            onMouseEnter={() => switchMenuOnHover("peso")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Storico delle tue misurazioni di peso corporeo: qui imposti l'obiettivo, importi o esporti lo storico"
          >
            Diario del Peso
          </button>
          {menu.isAperto("peso") && (
            <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
              <button
                onClick={() => {
                  onApriInserimentoPeso();
                  closeAll();
                }}
                onMouseEnter={() => setWeightSubmenu(null)}
                title="Registra il peso corporeo per una data a scelta"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Imposta peso…
              </button>
              <button
                onClick={() => {
                  onApriObiettivoPeso();
                  closeAll();
                }}
                onMouseEnter={() => setWeightSubmenu(null)}
                title="Imposta il peso corporeo che vuoi raggiungere, usato per la proiezione nel grafico del peso"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Imposta obiettivo peso…
              </button>

              <div className="relative">
                <button
                  onClick={() => setWeightSubmenu((s) => (s === "import" ? null : "import"))}
                  onMouseEnter={() => setWeightSubmenu("import")}
                  disabled={weightLoading}
                  title="Aggiunge misurazioni di peso al diario leggendole da un file"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {weightLoading ? "Importazione…" : "Importa storico peso"}
                  <span className="text-slate-400">›</span>
                </button>
                {weightSubmenu === "import" && (
                  <div className="absolute left-full top-0 ml-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
                    <button
                      onClick={() => {
                        importWeightFromJson();
                        closeAll();
                      }}
                      disabled={weightLoading}
                      title="Importa lo storico peso da un file JSON (array di misurazioni con data e peso in kg)"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Da JSON…
                    </button>
                    <button
                      onClick={() => {
                        importWeightFromCsv();
                        closeAll();
                      }}
                      disabled={weightLoading}
                      title="Importa lo storico peso da un file CSV con colonne data e peso_kg"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Da CSV…
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setWeightSubmenu((s) => (s === "export" ? null : "export"))}
                  onMouseEnter={() => setWeightSubmenu("export")}
                  title="Salva lo storico delle misurazioni di peso su file, in una cartella a tua scelta"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Esporta storico peso
                  <span className="text-slate-400">›</span>
                </button>
                {weightSubmenu === "export" && (
                  <div className="absolute left-full top-0 ml-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
                    <button
                      onClick={() => {
                        onExportWeightJson();
                        closeAll();
                      }}
                      title="Crea un file JSON con tutte le misurazioni di peso registrate; ti verrà chiesto dove salvarlo"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      In JSON…
                    </button>
                    <button
                      onClick={() => {
                        onExportWeightCsv();
                        closeAll();
                      }}
                      title="Crea un file CSV con una riga per misurazione (data, peso_kg); ti verrà chiesto dove salvarlo"
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      In CSV…
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => toggleTopMenu("aiuto")}
            onMouseEnter={() => switchMenuOnHover("aiuto")}
            className="rounded px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Glossario dei termini usati nell'app, come inviare un feedback, informazioni sulla versione"
          >
            Aiuto
          </button>
          {menu.isAperto("aiuto") && (
            <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
              <button
                onClick={() => {
                  setModaleAiuto("glossario");
                  closeAll();
                }}
                title="Spiegazione dei termini usati nell'app (TDEE, BMR, sforamento, ecc.)"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Glossario
              </button>
              <button
                onClick={() => {
                  setModaleAiuto("feedback");
                  closeAll();
                }}
                title="Come segnalare un problema o un suggerimento"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Invia feedback
              </button>
              <button
                onClick={() => {
                  setModaleAiuto("informazioni");
                  closeAll();
                }}
                title="Nome e versione dell'app"
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Informazioni
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              if (pannelliDisponibili.length === 0) return;
              menu.toggle("graph");
            }}
            onMouseEnter={() => {
              if (pannelliDisponibili.length === 0) return;
              switchMenuOnHover("graph");
            }}
            disabled={pannelliDisponibili.length === 0}
            title={pannelliDisponibili.length === 0 ? "Tutti i grafici sono già presenti sulla board" : undefined}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 dark:disabled:hover:bg-slate-700"
          >
            + Aggiungi grafico
          </button>
          {menu.isAperto("graph") && pannelliDisponibili.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-black">
              <button
                onClick={() => {
                  onAddAllPanels();
                  menu.chiudi();
                }}
                title="Aggiunge tutti i grafici mancanti, disposti 3 per riga (dove possibile) con la stessa altezza nella stessa riga"
                className="block w-full px-3 py-1.5 text-left text-sm font-medium text-blue-600 hover:bg-slate-100 dark:text-blue-400 dark:hover:bg-slate-800"
              >
                Aggiungi tutti i grafici
              </button>
              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
              {pannelliDisponibili.map((def) => (
                <button
                  key={def.tipo}
                  onClick={() => {
                    onAddPanel(def.tipo);
                    menu.chiudi();
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {def.titolo}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contenitore condiviso, non più un singolo pulsante assolutamente centrato: gli avvisi
            kcal/macro e peso (negativi E positivi) possono essere entrambi attivi insieme, il
            flex li affianca - stessa dimensione/stile per tutti, nessuno "nascosto" come badge
            piccolo a parte. Al massimo un elemento per dominio (kcal, peso): negativo e positivo
            sulla stessa metrica non sono mai contemporaneamente veri (vedi risolviBadgePositivo).
            Il verde va sempre davanti (a sinistra) rispetto a un eventuale avviso rosso/ambra
            dell'altro dominio: ordina per "positivo" invece di un ordine fisso kcal-poi-peso. */}
        {(() => {
          const bannerKcal: { positivo: boolean; nodo: ReactElement } | null = sforamentoGrave
            ? {
                positivo: false,
                nodo: (
                  <button
                    key="kcal"
                    onClick={() => setDettaglioSforamentoAperto("mese")}
                    className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg hover:bg-red-700"
                    title={`${giorniSforatiNelMese} giorni sopra i limiti nutrizionali (kcal/macro/fibre/sale) questo mese - clicca per i dettagli`}
                  >
                    ⚠️ {giorniSforatiNelMese} giorni sopra i limiti nutrizionali questo mese
                  </button>
                ),
              }
            : sforamentoSerie
              ? {
                  positivo: false,
                  nodo: (
                    <button
                      key="kcal"
                      onClick={() => setDettaglioSforamentoAperto("serie")}
                      className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg hover:bg-amber-600"
                      title={`${serieConsecutiva} giorni di fila sopra i limiti nutrizionali (kcal/macro/fibre/sale) - clicca per i dettagli`}
                    >
                      ⚠️ {serieConsecutiva} giorni di fila sopra i limiti nutrizionali
                    </button>
                  ),
                }
              : badgePositivo
                ? {
                    positivo: true,
                    nodo: (
                      <span
                        key="kcal"
                        className="cursor-default select-none rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg"
                        title={
                          (badgePositivo.tipo === "serie"
                            ? `${badgePositivo.valore} giorni di fila entro i limiti`
                            : badgePositivo.tipo === "settimana"
                              ? "Nessuno sforamento questa settimana"
                              : `${badgePositivo.valore} giorni entro i limiti questo mese`) +
                          " - niente da segnalare, continua così!"
                        }
                      >
                        {badgePositivo.tipo === "serie" &&
                          `😻 ${badgePositivo.valore} giorni di fila entro i limiti`}
                        {badgePositivo.tipo === "settimana" && "😻 Settimana pulita"}
                        {badgePositivo.tipo === "mese" &&
                          `😻 ${badgePositivo.valore} giorni entro i limiti questo mese`}
                      </span>
                    ),
                  }
                : null;

          const bannerCarenza: { positivo: boolean; nodo: ReactElement } | null = carenzaGrave
            ? {
                positivo: false,
                nodo: (
                  <button
                    key="carenza"
                    onClick={() => setDettaglioCarenzaAperto("mese")}
                    className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg hover:bg-red-700"
                    title={`${giorniCarentiNelMese} giorni sotto il limite minimo di kcal questo mese - clicca per i dettagli`}
                  >
                    ⚠️ {giorniCarentiNelMese} giorni sotto il minimo kcal questo mese
                  </button>
                ),
              }
            : carenzaSerie
              ? {
                  positivo: false,
                  nodo: (
                    <button
                      key="carenza"
                      onClick={() => setDettaglioCarenzaAperto("serie")}
                      className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg hover:bg-amber-600"
                      title={`${serieConsecutivaCarenza} giorni di fila sotto il limite minimo di kcal - clicca per i dettagli`}
                    >
                      ⚠️ {serieConsecutivaCarenza} giorni di fila sotto il minimo kcal
                    </button>
                  ),
                }
              : null;

          const bannerPeso: { positivo: boolean; nodo: ReactElement } | null = sforamentoPesoGrave
            ? {
                positivo: false,
                nodo: (
                  <button
                    key="peso"
                    onClick={() => setDettaglioSforamentoPesoAperto("mese")}
                    className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg hover:bg-red-700"
                    title={`${giorniSforatiNelMesePeso} giorni sopra l'obiettivo peso questo mese - clicca per i dettagli`}
                  >
                    ⚠️ {giorniSforatiNelMesePeso} giorni sopra l'obiettivo peso questo mese
                  </button>
                ),
              }
            : sforamentoPesoSerie
              ? {
                  positivo: false,
                  nodo: (
                    <button
                      key="peso"
                      onClick={() => setDettaglioSforamentoPesoAperto("serie")}
                      className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg hover:bg-amber-600"
                      title={`${serieConsecutivaPeso} giorni di fila sopra l'obiettivo peso - clicca per i dettagli`}
                    >
                      ⚠️ {serieConsecutivaPeso} giorni di fila sopra l'obiettivo peso
                    </button>
                  ),
                }
              : badgePositivoPeso
                ? {
                    positivo: true,
                    nodo: (
                      <span
                        key="peso"
                        className="cursor-default select-none rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg"
                        title={
                          (badgePositivoPeso.tipo === "serie"
                            ? `${badgePositivoPeso.valore} giorni di fila nell'obiettivo peso`
                            : badgePositivoPeso.tipo === "settimana"
                              ? "Sempre nell'obiettivo peso questa settimana"
                              : `${badgePositivoPeso.valore} giorni nell'obiettivo peso questo mese`) +
                          " - niente da segnalare, continua così!"
                        }
                      >
                        {badgePositivoPeso.tipo === "serie" &&
                          `😻 ${badgePositivoPeso.valore} giorni di fila nell'obiettivo peso`}
                        {badgePositivoPeso.tipo === "settimana" && "😻 Settimana nell'obiettivo peso"}
                        {badgePositivoPeso.tipo === "mese" &&
                          `😻 ${badgePositivoPeso.valore} giorni nell'obiettivo peso questo mese`}
                      </span>
                    ),
                  }
                : null;

          const banner = [bannerKcal, bannerCarenza, bannerPeso]
            .filter((b): b is { positivo: boolean; nodo: ReactElement } => b !== null)
            .sort((a, b) => Number(b.positivo) - Number(a.positivo));

          return (
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
              {banner.map((b) => b.nodo)}
            </div>
          );
        })()}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-lg font-bold text-slate-800 dark:text-slate-100">NutriBum</span>
        </div>
      </div>

      {dettaglioSforamentoAperto && (
        <SforamentoDettaglioModal
          titolo={
            dettaglioSforamentoAperto === "mese"
              ? "Giorni sopra i limiti nutrizionali questo mese"
              : "Giorni di fila sopra i limiti nutrizionali"
          }
          dettagli={dettaglioGiorniSforati(giorni, storicoObiettivi, oggi, dettaglioSforamentoAperto)}
          onChiudi={() => setDettaglioSforamentoAperto(null)}
          onApriGiorno={(data) => {
            setDettaglioSforamentoAperto(null);
            onApriGiorno(data);
          }}
        />
      )}

      {dettaglioCarenzaAperto && (
        <SforamentoDettaglioModal
          titolo={
            dettaglioCarenzaAperto === "mese"
              ? "Giorni sotto il minimo kcal questo mese"
              : "Giorni di fila sotto il minimo kcal"
          }
          // Stesso riuso già fatto per il peso: DettaglioGiornoCarente ha una forma diversa
          // (kcalConsumate/kcalMinimo su una sola metrica), la adatto a quella di Sforamento
          // invece di duplicare il componente modale.
          dettagli={dettaglioGiorniCarenti(
            giorni,
            storicoObiettivi,
            storicoProfilo,
            storicoFitness,
            peso,
            oggi,
            dettaglioCarenzaAperto,
          ).map((d) => ({
            data: d.data,
            sforamenti: [{ etichetta: "Kcal (sotto il minimo)", valore: d.kcalConsumate, limite: d.kcalMinimo }],
          }))}
          onChiudi={() => setDettaglioCarenzaAperto(null)}
          onApriGiorno={(data) => {
            setDettaglioCarenzaAperto(null);
            onApriGiorno(data);
          }}
        />
      )}

      {dettaglioSforamentoPesoAperto && (
        <SforamentoDettaglioModal
          titolo={
            dettaglioSforamentoPesoAperto === "mese"
              ? "Giorni sopra l'obiettivo peso questo mese"
              : "Giorni di fila sopra l'obiettivo peso"
          }
          // "Sforamento" ha già la forma giusta (etichetta/valore/limite) per una sola metrica:
          // riuso lo stesso componente modale del kcal/macro invece di duplicarlo per il peso.
          dettagli={dettaglioMisurazioniSforatePeso(peso, obiettivoPesoKg, oggi, dettaglioSforamentoPesoAperto, margineObiettivoPesoKg).map(
            (d) => ({
              data: d.data,
              sforamenti: [{ etichetta: "Peso", valore: d.pesoKg, limite: d.obiettivoKg }],
            }),
          )}
          onChiudi={() => setDettaglioSforamentoPesoAperto(null)}
          onApriGiorno={(data) => {
            setDettaglioSforamentoPesoAperto(null);
            onApriGiorno(data);
          }}
        />
      )}

      {profileModalAperta && (
        <ProfileModal
          peso={peso}
          onClose={() => setProfileModalAperta(false)}
          onSaved={onObiettivoSalvato}
        />
      )}

      {reportPdfModalAperta && (
        <ReportPdfModal
          fonte={{
            giorni,
            storicoObiettivi,
            peso,
            storicoObiettivoPeso,
            obiettivoPesoKg,
            storicoProfilo,
            storicoFitness,
          }}
          onClose={() => setReportPdfModalAperta(false)}
        />
      )}

      {esito && <EsitoPopup tipo={esito.tipo} messaggio={esito.messaggio} onChiudi={chiudiEsito} />}
      {esitoAlimenti && (
        <EsitoPopup tipo={esitoAlimenti.tipo} messaggio={esitoAlimenti.messaggio} onChiudi={chiudiEsitoAlimenti} />
      )}
      {weightImportResult && (
        <EsitoPopup
          tipo={weightImportResult.tipo}
          messaggio={weightImportResult.messaggio}
          onChiudi={closeWeightImportResult}
        />
      )}
      {obiettivoModaleAperto && (
        <ObiettivoGiornalieroModal
          tipo={obiettivoModaleAperto}
          peso={peso}
          onChiudi={() => setObiettivoModaleAperto(null)}
          onSalvato={onObiettivoSalvato}
        />
      )}

      {modaleConferma}

      {modaleAiuto === "glossario" && (
        <InfoModal titolo="Glossario" onChiudi={() => setModaleAiuto(null)}>
          <GlossarioContenuto />
        </InfoModal>
      )}

      {modaleAiuto === "feedback" && (
        <InfoModal titolo="Invia feedback" onChiudi={() => setModaleAiuto(null)}>
          <p>Hai trovato un problema, o hai un'idea per migliorare NutriBum?</p>
          <button
            onClick={handleScaricaModuloFeedback}
            disabled={scaricamentoModuloFeedback}
            className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scaricamentoModuloFeedback ? "Generazione…" : "Scarica modulo di feedback (PDF)"}
          </button>
          {erroreModuloFeedback && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{erroreModuloFeedback}</p>
          )}
          <p className="mt-3">Compila il modulo e invialo a:</p>
          <p className="my-2 font-medium text-slate-800 dark:text-slate-100">INSERISCI-QUI-LA-TUA-EMAIL</p>
          <p>
            Descrivi il più possibile cosa stavi facendo e cosa ti aspettavi che succedesse: aiuta a
            capire e risolvere più in fretta.
          </p>
        </InfoModal>
      )}

      {modaleAiuto === "informazioni" && (
        <InfoModal titolo="Informazioni" onChiudi={() => setModaleAiuto(null)}>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">NutriBum</p>
          <p className="mt-1">Versione {versioneApp ?? "…"}</p>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            App per tracciare l'alimentazione giorno per giorno, completamente offline: nessun
            account, nessun cloud, nessuna connessione a internet richiesta.
          </p>

          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="font-medium text-slate-800 dark:text-slate-100">About me</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Andrea Leone, programmatore backend, con esperienza nello sviluppo di sistemi di
              gestione e IAM (Identity and Access Management). NutriBum nasce come progetto
              personale, per tenere traccia della propria alimentazione in modo semplice e
              completamente offline.
            </p>
          </div>
        </InfoModal>
      )}

      {flussoCancellazione === "diario" && (
        <EsportaPrimaDiCancellareModal
          titolo="Svuota diario alimentare"
          messaggio="Puoi esportare un backup del diario prima di cancellarlo definitivamente, oppure procedere senza esportare."
          opzioniExport={[
            { chiave: "json", etichetta: "Esporta in JSON e cancella", onEsporta: onEsportaDiarioJsonPreCancellazione },
            { chiave: "csv", etichetta: "Esporta in CSV e cancella", onEsporta: onEsportaDiarioCsvPreCancellazione },
          ]}
          onProcedi={onSvuotaDiario}
          onChiudi={() => setFlussoCancellazione(null)}
        />
      )}

      {flussoCancellazione === "tutto" && (
        <EsportaPrimaDiCancellareModal
          titolo="Cancella tutti i dati"
          messaggio="Puoi esportare un backup completo (alimenti, diario, ricette, peso, obiettivi, profilo) prima di cancellare tutto, oppure procedere senza esportare."
          opzioniExport={[
            { chiave: "json", etichetta: "Esporta backup in JSON e cancella", onEsporta: onEsportaBackupCompletoJson },
          ]}
          onProcedi={onCancellaTuttiIDati}
          onChiudi={() => setFlussoCancellazione(null)}
        />
      )}

      {esitoBackup && (
        <EsitoPopup tipo={esitoBackup.tipo} messaggio={esitoBackup.messaggio} onChiudi={() => setEsitoBackup(null)} />
      )}

      {esitoAggiornamento && (
        <EsitoPopup
          tipo={esitoAggiornamento.tipo}
          messaggio={esitoAggiornamento.messaggio}
          onChiudi={chiudiEsitoAggiornamento}
        />
      )}
    </div>
  );
}

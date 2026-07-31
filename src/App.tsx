import { useCallback, useEffect, useState } from "react";
import ReactGridLayout, { useContainerWidth, noCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import "./App.css";
import { NavBar } from "./components/NavBar";
import { PanelChrome } from "./components/PanelChrome";
import { CalendarioPanel } from "./components/panels/CalendarioPanel";
import { KcalGiornoChart } from "./components/panels/KcalGiornoChart";
import { MacroGiornoChart } from "./components/panels/MacroGiornoChart";
import { FibreSaleChart } from "./components/panels/FibreSaleChart";
import { TopAlimentiChart } from "./components/panels/TopAlimentiChart";
import { TopAlimentiFrequenzaChart } from "./components/panels/TopAlimentiFrequenzaChart";
import { DettaglioGiornoPanel, SchedeGiorno } from "./components/panels/DettaglioGiornoPanel";
import { RegistraPastoPanel } from "./components/panels/RegistraPastoPanel";
import { LibroAlimentiPanel } from "./components/panels/LibroAlimentiPanel";
import { AndamentoObiettiviChart } from "./components/panels/AndamentoObiettiviChart";
import { ProgressoObiettiviChart } from "./components/panels/ProgressoObiettiviChart";
import { ConfrontoPeriodiChart, SelettoreVistaConfronto, type VistaConfronto } from "./components/panels/ConfrontoPeriodiChart";
import { PesoPanel, AzioniPesoHeader } from "./components/panels/PesoPanel";
import { AndamentoTDEEChart } from "./components/panels/AndamentoTDEEChart";
import { CorrelazionePesoSforamentiChart } from "./components/panels/CorrelazionePesoSforamentiChart";
import { GestioneRicettePanel } from "./components/panels/GestioneRicettePanel";
import { AlimentoFormModal } from "./components/AlimentoFormModal";
import { RicettaFormModal } from "./components/RicettaFormModal";
import { WeightEntryModal } from "./components/WeightEntryModal";
import { WeightGoalModal } from "./components/WeightGoalModal";
import {
  elencaAlimenti,
  elencaStoricoCompleto,
  eliminaGiornoCompleto,
  type AlimentoCatalogo,
} from "./lib/food";
import {
  elencaPesoCompleto,
  leggiObiettivoPeso,
  elencaStoricoObiettivoPeso,
  type VocePeso,
  type PuntoStoricoObiettivoPeso,
} from "./lib/weight";
import { elencaStoricoObiettivo, type PuntoStoricoObiettivo } from "./lib/dailyGoal";
import { elencaRicetteConIngredienti, type RicettaConIngredienti } from "./lib/recipes";
import { elencaStoricoProfilo, elencaStoricoFitness, type PuntoStoricoProfilo, type PuntoStoricoFitness } from "./lib/profile";
import { foodsToJson, foodsToCsv } from "./lib/exportFoods";
import { historyToCsv } from "./lib/exportDiary";
import { weightToJson, weightToCsv } from "./lib/exportWeight";
import { caricaLayout, salvaLayout } from "./lib/layoutStorage";
import { caricaImpostazioni, salvaImpostazioni, IMPOSTAZIONI_DEFAULT } from "./lib/settings";
import {
  esportaBackupCompleto,
  validaBackupJson,
  ripristinaBackupCompleto,
  svuotaTuttiIDati,
  svuotaDiario,
} from "./lib/backup";
import { registraErroreFataleEChiudi, registraErroreNonBloccante } from "./lib/errorLog";
import { useDragResize } from "./lib/useDragResize";
import { COLS, ROW_HEIGHT, CAP_ALTEZZA_PX, MARGIN } from "./lib/gridConstants";
import { trovaPosizioneLibera } from "./lib/gridPacking";
import {
  DEFINIZIONI_PANNELLI,
  layoutDiDefault,
  dimensioneMinima,
  ALTEZZA_APERTURA_STANDARD,
  type Pannello,
  type TipoPannello,
} from "./lib/layoutSchema";
import type { Storico } from "./lib/schema";
import type { FocusGiorno } from "./lib/aggregate";

function contenutoPannello(
  p: Pannello,
  giorni: Storico["giorni"],
  alimenti: AlimentoCatalogo[],
  ricette: RicettaConIngredienti[],
  onApriGiorno: (chiave: string) => void,
  onEliminaGiorno: (data: string) => void,
  onStoricoSalvato: () => void,
  onAlimentiCambiati: () => void,
  onRicetteCambiate: () => void,
  versioneObiettivi: number,
  focusGiorno: FocusGiorno | null,
  peso: VocePeso[],
  obiettivoPesoKg: number | null,
  storicoObiettivoPeso: PuntoStoricoObiettivoPeso[],
  margineObiettivoPesoKg: number,
  storicoObiettiviKcal: PuntoStoricoObiettivo[],
  storicoProfilo: PuntoStoricoProfilo[],
  storicoFitness: PuntoStoricoFitness[],
) {
  switch (p.tipo) {
    case "calendario":
      return (
        <CalendarioPanel
          giorni={giorni}
          onApriGiorno={onApriGiorno}
          versioneObiettivi={versioneObiettivi}
          peso={peso}
          storicoProfilo={storicoProfilo}
          storicoFitness={storicoFitness}
        />
      );
    case "kcal-giorno":
      return (
        <KcalGiornoChart
          giorni={giorni}
          focusGiorno={focusGiorno}
          storicoObiettivi={storicoObiettiviKcal}
          peso={peso}
          storicoProfilo={storicoProfilo}
          storicoFitness={storicoFitness}
        />
      );
    case "macro-giorno":
      return (
        <MacroGiornoChart giorni={giorni} focusGiorno={focusGiorno} storicoObiettivi={storicoObiettiviKcal} />
      );
    case "fibre-sale-giorno":
      return (
        <FibreSaleChart giorni={giorni} focusGiorno={focusGiorno} storicoObiettivi={storicoObiettiviKcal} />
      );
    case "top-alimenti":
      return <TopAlimentiChart giorni={giorni} focusGiorno={focusGiorno} />;
    case "top-alimenti-frequenza":
      return <TopAlimentiFrequenzaChart giorni={giorni} focusGiorno={focusGiorno} />;
    case "dettaglio-giorno":
      return (
        <DettaglioGiornoPanel
          giorni={giorni}
          data={p.tabAttiva ?? ""}
          onElimina={onEliminaGiorno}
          versioneObiettivi={versioneObiettivi}
          peso={peso}
          storicoProfilo={storicoProfilo}
          storicoFitness={storicoFitness}
        />
      );
    case "registra-pasto":
      return <RegistraPastoPanel alimenti={alimenti} ricette={ricette} onSalvato={onStoricoSalvato} />;
    case "gestione-ricette":
      return <GestioneRicettePanel ricette={ricette} alimenti={alimenti} onCambiato={onRicetteCambiate} />;
    case "libro-alimenti":
      return <LibroAlimentiPanel alimenti={alimenti} onCambiato={onAlimentiCambiati} />;
    case "andamento-obiettivi":
      return <AndamentoObiettiviChart versione={versioneObiettivi} />;
    case "progresso-obiettivi":
      return (
        <ProgressoObiettiviChart
          giorni={giorni}
          versioneObiettivi={versioneObiettivi}
          focusGiorno={focusGiorno}
          peso={peso}
          storicoProfilo={storicoProfilo}
          storicoFitness={storicoFitness}
        />
      );
    case "confronto-periodi":
      return <ConfrontoPeriodiChart giorni={giorni} peso={peso} vista={p.vista ?? "grafico"} />;
    case "peso-corporeo":
      return (
        <PesoPanel
          peso={peso}
          obiettivoKg={obiettivoPesoKg}
          storicoObiettivo={storicoObiettivoPeso}
          vista={p.vista ?? "grafico"}
          focusGiorno={focusGiorno}
          margineKg={margineObiettivoPesoKg}
        />
      );
    case "andamento-tdee":
      return (
        <AndamentoTDEEChart peso={peso} storicoProfilo={storicoProfilo} storicoFitness={storicoFitness} />
      );
    case "correlazione-peso-sforamenti":
      return (
        <CorrelazionePesoSforamentiChart
          giorni={giorni}
          peso={peso}
          storicoObiettivi={storicoObiettiviKcal}
          storicoProfilo={storicoProfilo}
          storicoFitness={storicoFitness}
        />
      );
  }
}

// Chiudere l'ultima tab svuota il pannello (DettaglioGiornoPanel mostra il placeholder "Nessun
// giorno aperto") ma non lo rimuove dalla board: l'utente lo ha posizionato/dimensionato di
// proposito e vuole poterci riaprire un giorno senza doverlo ricreare da capo.
function chiudiTabDelPannello(p: Pannello, data: string): Pannello {
  const dataGiorni = (p.dataGiorni ?? []).filter((d) => d !== data);
  const tabAttiva =
    dataGiorni.length === 0
      ? ""
      : p.tabAttiva === data
        ? dataGiorni[dataGiorni.length - 1]
        : p.tabAttiva;
  return { ...p, dataGiorni, tabAttiva };
}

function titoloPannello(p: Pannello): string {
  return DEFINIZIONI_PANNELLI.find((d) => d.tipo === p.tipo)!.titolo;
}

function oggi(): string {
  return new Date().toISOString().slice(0, 10);
}

function headerExtraPannello(
  p: Pannello,
  onCambiaTab: (id: string, data: string) => void,
  onChiudiTab: (id: string, data: string) => void,
  onCambiaVista: (id: string, vista: VistaConfronto) => void,
  peso: VocePeso[],
  obiettivoPesoKg: number | null,
  onApriInserimentoPeso: () => void,
  onApriObiettivoPeso: () => void,
) {
  if (p.tipo === "dettaglio-giorno") {
    return (
      <SchedeGiorno
        dataGiorni={p.dataGiorni ?? []}
        tabAttiva={p.tabAttiva ?? ""}
        onCambiaTab={(data) => onCambiaTab(p.id, data)}
        onChiudiTab={(data) => onChiudiTab(p.id, data)}
      />
    );
  }
  if (p.tipo === "confronto-periodi") {
    return (
      <SelettoreVistaConfronto vista={p.vista ?? "grafico"} onChange={(v) => onCambiaVista(p.id, v)} />
    );
  }
  if (p.tipo === "peso-corporeo") {
    return (
      <>
        <SelettoreVistaConfronto vista={p.vista ?? "grafico"} onChange={(v) => onCambiaVista(p.id, v)} />
        <AzioniPesoHeader
          haPesoOggi={peso.some((v) => v.data === oggi())}
          haObiettivo={obiettivoPesoKg !== null}
          onApriInserimentoPeso={onApriInserimentoPeso}
          onApriObiettivoPeso={onApriObiettivoPeso}
        />
      </>
    );
  }
  return undefined;
}

function App() {
  const [storico, setStorico] = useState<Storico | null>(null);
  const [pannelli, setPannelli] = useState<Pannello[]>([]);
  const [alimenti, setAlimenti] = useState<AlimentoCatalogo[]>([]);
  const [ricette, setRicette] = useState<RicettaConIngredienti[]>([]);
  const [peso, setPeso] = useState<VocePeso[]>([]);
  const [obiettivoPesoKg, setObiettivoPesoKg] = useState<number | null>(null);
  const [storicoObiettivoPeso, setStoricoObiettivoPeso] = useState<PuntoStoricoObiettivoPeso[]>([]);
  // Configurabile dall'utente (WeightGoalModal), persistito in settings.json - non nel DB, vedi
  // lib/settings.ts. Il valore qui è solo il placeholder prima che caricaImpostazioni() risponda.
  const [margineObiettivoPesoKg, setMargineObiettivoPesoKg] = useState(5);
  const [modaleAlimentoAperta, setModaleAlimentoAperta] = useState(false);
  const [modaleRicettaAperta, setModaleRicettaAperta] = useState(false);
  // Sollevato qui (non locale a NavBar, come per ObiettivoGiornalieroModal) perché queste due
  // modali devono aprirsi anche dal pulsante nell'header del pannello Peso Corporeo, non solo dal
  // menu NavBar - serve uno stato condiviso da un antenato comune.
  const [weightEntryModalOpen, setWeightEntryModalOpen] = useState(false);
  const [weightGoalModalOpen, setWeightGoalModalOpen] = useState(false);
  // Movimento libero (!ancoraGriglia) di default disattivato: trascinamento/ridimensionamento
  // scattano a step interi di griglia finché l'utente non lo attiva esplicitamente.
  const [ancoraGriglia, setAncoraGriglia] = useState(true);
  const [versioneObiettivi, setVersioneObiettivi] = useState(0);
  // Storici per le linee di riferimento "Limite impostato"/"TDEE stimato" in KcalGiornoChart:
  // ricaricati insieme (vedi effect più sotto) ogni volta che versioneObiettivi cambia, perché sia
  // il salvataggio del limite kcal SIA quello del profilo/livello attività passano da quel segnale.
  const [storicoObiettiviKcal, setStoricoObiettiviKcal] = useState<PuntoStoricoObiettivo[]>([]);
  const [storicoProfilo, setStoricoProfilo] = useState<PuntoStoricoProfilo[]>([]);
  const [storicoFitness, setStoricoFitness] = useState<PuntoStoricoFitness[]>([]);
  const [focusGiorno, setFocusGiorno] = useState<FocusGiorno | null>(null);
  // Non-null mentre un drag/resize è in corso (id del pannello mosso): usato solo per sapere SE un
  // gesto è attivo - tutti i pannelli (non solo quello mosso) tolgono ombra/angoli arrotondati/clip
  // finché dura, perché WebKitGTK (webview Linux di Tauri) è lento a ricomporre queste proprietà
  // anche sui pannelli SOTTOSTANTI quando qualcosa ci transita sopra - costo confermato indipendente
  // dal numero di pannelli e assente in un browser normale, quindi non è un problema di React ma del
  // motore di rendering.
  const [pannelloInMovimento, setPannelloInMovimento] = useState<string | null>(null);
  const { width, containerRef, mounted } = useContainerWidth();

  // Stabili (useCallback) perché passate come prop a componenti memoizzati (React.memo): durante
  // il drag/resize di un pannello App si ri-renderizza ad ogni mousemove (vedi useDragResize) e
  // una funzione ricreata ogni volta vanificherebbe il memo, facendo ricalcolare/ridisegnare anche
  // i grafici non coinvolti nel trascinamento.
  const ricaricaAlimenti = useCallback(() => {
    return elencaAlimenti().then(setAlimenti);
  }, []);

  const ricaricaRicette = useCallback(() => {
    return elencaRicetteConIngredienti().then(setRicette);
  }, []);

  const ricaricaStorico = useCallback(() => {
    return elencaStoricoCompleto().then((giorni) => setStorico({ schemaVersion: "1.0", giorni }));
  }, []);

  const ricaricaPeso = useCallback(() => {
    return Promise.all([
      elencaPesoCompleto().then(setPeso),
      leggiObiettivoPeso().then(setObiettivoPesoKg),
      elencaStoricoObiettivoPeso().then(setStoricoObiettivoPeso),
    ]);
  }, []);

  const ricaricaImpostazioni = useCallback(() => {
    return caricaImpostazioni().then((imp) => setMargineObiettivoPesoKg(imp.margineObiettivoPesoKg));
  }, []);

  const handleSalvaMargineObiettivoPeso = useCallback(async (nuovoMargineKg: number) => {
    await salvaImpostazioni({ margineObiettivoPesoKg: nuovoMargineKg });
    setMargineObiettivoPesoKg(nuovoMargineKg);
  }, []);

  const ricaricaStoricoTDEE = useCallback(() => {
    return Promise.all([
      elencaStoricoObiettivo().then(setStoricoObiettiviKcal),
      elencaStoricoProfilo().then(setStoricoProfilo),
      elencaStoricoFitness().then(setStoricoFitness),
    ]);
  }, []);

  // Ricaricato ad ogni cambio di versioneObiettivi (non solo all'avvio): sia il salvataggio del
  // limite kcal (ObiettivoGiornalieroModal) sia quello di profilo/livello attività (ProfileModal)
  // passano da onObiettivoSalvato → questo stesso contatore, quindi un solo effect basta per
  // tenere aggiornate le linee di riferimento del grafico kcal/giorno indipendentemente da quale
  // dei due l'utente ha effettivamente cambiato.
  useEffect(() => {
    ricaricaStoricoTDEE().catch((err) => registraErroreNonBloccante(err, "Ricarico storico TDEE fallito"));
  }, [versioneObiettivi, ricaricaStoricoTDEE]);

  // La modifica di un alimento ricalcola a cascata anche le voci del diario che lo referenziano
  // (vedi aggiornaAlimento in food.ts): vanno quindi ricaricati sia il catalogo che lo storico.
  const gestisciAlimentiCambiati = useCallback(() => {
    ricaricaAlimenti().catch((err) => registraErroreNonBloccante(err, "Ricarico catalogo alimenti fallito"));
    ricaricaStorico().catch((err) => registraErroreNonBloccante(err, "Ricarico storico diario fallito"));
    // Il nome di un alimento modificato compare anche nell'elenco ingredienti di una ricetta (letto
    // via JOIN): senza questo, la ricetta mostrerebbe il nome vecchio finché non la riapri.
    ricaricaRicette().catch((err) => registraErroreNonBloccante(err, "Ricarico ricette fallito"));
  }, [ricaricaAlimenti, ricaricaStorico, ricaricaRicette]);

  useEffect(() => {
    const promiseLayout = caricaLayout().then((l) => {
      // Pannelli salvati da prima che esistessero i minimi per-tipo (o rimpiccioliti oltre il
      // minimo attuale) vengono riportati alla dimensione minima leggibile, invece di restare
      // bloccati troppo piccoli finché l'utente non li ridimensiona manualmente.
      const normalizzati = l.pannelli.map((p) => {
        const { w: minW, h: minH } = dimensioneMinima(p.tipo);
        return p.w >= minW && p.h >= minH ? p : { ...p, w: Math.max(p.w, minW), h: Math.max(p.h, minH) };
      });
      setPannelli(normalizzati);
      const modificato = normalizzati.some(
        (p, i) => p.w !== l.pannelli[i].w || p.h !== l.pannelli[i].h,
      );
      if (modificato) salvaLayout({ schemaVersion: "1.0", pannelli: normalizzati });
    });

    // Splash screen: resta visibile finché i dati non sono pronti E per un tempo minimo garantito
    // (altrimenti su un avvio molto rapido sparirebbe troppo in fretta per essere vista). Se il
    // caricamento fallisce (es. errore di migrazione DB) è un errore bloccante: viene registrato
    // su file (cartella "logs", creata solo quando serve davvero) e l'app si chiude, invece di
    // restare aperta ma inutilizzabile senza che l'utente sappia perché.
    const promiseDatiPronti = Promise.all([
      ricaricaStorico(),
      ricaricaAlimenti(),
      ricaricaRicette().catch((err) => registraErroreNonBloccante(err, "Caricamento ricette fallito")),
      ricaricaPeso().catch((err) => registraErroreNonBloccante(err, "Caricamento peso fallito")),
      ricaricaImpostazioni().catch((err) =>
        registraErroreNonBloccante(err, "Caricamento impostazioni fallito"),
      ),
      promiseLayout,
    ]);
    const promiseTempoMinimo = new Promise<void>((resolve) => setTimeout(resolve, 3000));
    Promise.all([promiseDatiPronti, promiseTempoMinimo])
      .then(() => {
        // Fuori da Tauri (es. `npm run dev`) il comando non esiste: si ignora quell'errore specifico.
        invoke("app_pronta").catch(() => {});
      })
      .catch((err) =>
        registraErroreFataleEChiudi(
          err,
          "Caricamento dati iniziali (storico, alimenti o layout) fallito all'avvio",
        ),
      );
  }, []);

  // Forma funzionale (calcola da "prev", non chiude su "pannelli"): così persistiLayout ha identità
  // stabile per sempre e gli handler che la usano possono restare stabili a loro volta, requisito
  // perché React.memo sui pannelli funzioni davvero (vedi commento sopra ricaricaAlimenti).
  const persistiLayout = useCallback((aggiorna: (prev: Pannello[]) => Pannello[]) => {
    setPannelli((prev) => {
      const nuovi = aggiorna(prev);
      salvaLayout({ schemaVersion: "1.0", pannelli: nuovi });
      return nuovi;
    });
  }, []);

  const { iniziaDrag, iniziaResize } = useDragResize(
    pannelli,
    setPannelli,
    width,
    (attuali) => {
      salvaLayout({ schemaVersion: "1.0", pannelli: attuali });
      setPannelloInMovimento(null);
    },
    ancoraGriglia,
    (id) => setPannelloInMovimento(id),
    containerRef,
  );

  function dimensioneDefault() {
    const altezzaContenitore = containerRef.current?.clientHeight ?? 600;
    const altezzaPx = Math.min(altezzaContenitore * 0.5, CAP_ALTEZZA_PX);
    return {
      // Larghezza fissa a 1/3 della griglia (non in pixel): così entrano sempre esattamente
      // 3 pannelli per riga, indipendentemente dalla larghezza della finestra.
      w: Math.max(2, Math.round(COLS / 3)),
      // Minimo 9 (non 2): su finestre basse altezzaPx si riduceva troppo, aprendo pannelli
      // striminziti. 9 è l'altezza di riferimento confermata (Calendario + Kcal per periodo
      // affiancati, entrambi leggibili) - sotto non si scende anche se la finestra è piccola.
      h: Math.max(9, Math.round(altezzaPx / ROW_HEIGHT)),
    };
  }

  const handleAddPanel = useCallback(
    (tipo: TipoPannello) => {
      const base = dimensioneDefault();
      const minima = dimensioneMinima(tipo);
      const w = Math.max(base.w, minima.w);
      const h = Math.max(base.h, minima.h);
      persistiLayout((prev) => {
        const { x, y } = trovaPosizioneLibera(prev, w, h);
        const nuovo: Pannello = { id: crypto.randomUUID(), tipo, x, y, w, h };
        return [...prev, nuovo];
      });
    },
    [persistiLayout],
  );

  // A differenza di handleAddPanel (un pannello alla volta, incastrato nel primo spazio libero via
  // trovaPosizioneLibera), qui serve riempire PRIMA gli spazi vuoti accanto a quello che c'è già
  // (es. il solo Calendario in cima dopo un reset) invece di ammucchiare tutto sotto - altrimenti
  // resta una riga con un buco enorme. Uso uno skyline per colonna (fino a che quota y arriva
  // l'occupazione di ciascuna delle COLS colonne): ad ogni passo trovo la quota più bassa libera,
  // ci riempio più pannelli possibile (max 3 se tutti larghi 1/3 griglia), con un'altezza uniforme
  // pari al massimo tra i minimi dei pannelli scelti E di eventuali pannelli già esistenti che
  // partono dalla stessa quota (per allinearne il bordo inferiore, es. col Calendario). I pochi
  // tipi troppo larghi per un terzo di griglia (Libro Alimenti, Correlazione Peso - Sforamenti)
  // vengono comunque provati in ogni spazio libero abbastanza largo, non solo in righe dedicate.
  const handleAddAllPanels = useCallback(() => {
    // Altezza "di apertura", identica per tutti i pannelli aggiunti qui: una costante FISSA
    // (ALTEZZA_APERTURA_STANDARD, la stessa del Calendario nel layout di default), non il valore
    // di dimensioneDefault() - quello si adatta all'altezza della finestra (fino al tetto di
    // CAP_ALTEZZA_PX), quindi su una finestra alta avrebbe prodotto un'altezza diversa da quella
    // fissa del Calendario, disallineando la prima riga. dimensioneMinima è tutt'altra cosa: è il
    // limite sotto cui un ridimensionamento manuale non può scendere - qui alza la base SOLO se il
    // minimo di un tipo specifico (o un pannello già esistente sulla stessa riga) la supera.
    const altezzaApertura = ALTEZZA_APERTURA_STANDARD;

    persistiLayout((prev) => {
      const tipiEsistenti = new Set(prev.map((p) => p.tipo));
      const coda: TipoPannello[] = DEFINIZIONI_PANNELLI.filter((d) => !tipiEsistenti.has(d.tipo)).map(
        (d) => d.tipo,
      );
      if (coda.length === 0) return prev;

      const massimoIterazioni = coda.length * 2 + COLS + 10;
      const skyline = new Array(COLS).fill(0);
      for (const p of prev) {
        for (let x = p.x; x < p.x + p.w && x < COLS; x++) {
          skyline[x] = Math.max(skyline[x], p.y + p.h);
        }
      }

      const nuovi: Pannello[] = [];
      let guardia = 0;

      while (coda.length > 0 && guardia++ < massimoIterazioni) {
        const y0 = Math.min(...skyline);

        // Tutti i blocchi di colonne contigue libere a questa quota (di solito uno solo, ma un
        // pannello preesistente in mezzo alla griglia potrebbe spezzarli in più tratti).
        const blocchi: { x: number; larghezza: number }[] = [];
        for (let x = 0; x < COLS; ) {
          if (skyline[x] !== y0) {
            x++;
            continue;
          }
          const inizio = x;
          while (x < COLS && skyline[x] === y0) x++;
          blocchi.push({ x: inizio, larghezza: x - inizio });
        }

        let piazzatoQualcosa = false;

        for (const blocco of blocchi) {
          if (coda.length === 0) break;
          let usato = 0;
          const scelti: TipoPannello[] = [];
          while (usato < blocco.larghezza && coda.length > 0) {
            const larghezza = dimensioneMinima(coda[0]).w;
            if (usato + larghezza > blocco.larghezza) break;
            scelti.push(coda.shift()!);
            usato += larghezza;
          }
          if (scelti.length === 0) continue;

          const altezzaEsistenti = prev.filter((p) => p.y === y0).map((p) => p.h);
          const altezzaRiga = Math.max(altezzaApertura, ...scelti.map((t) => dimensioneMinima(t).h), ...altezzaEsistenti);

          let cursoreX = blocco.x;
          for (const tipo of scelti) {
            const w = dimensioneMinima(tipo).w;
            nuovi.push({ id: crypto.randomUUID(), tipo, x: cursoreX, y: y0, w, h: altezzaRiga });
            cursoreX += w;
          }
          for (let i = blocco.x; i < blocco.x + usato; i++) skyline[i] = y0 + altezzaRiga;
          piazzatoQualcosa = true;
        }

        if (!piazzatoQualcosa) {
          // Nessun blocco libero a questa quota è abbastanza largo per il prossimo pannello in
          // coda: questi spazi non possono ospitarlo, si sbloccano portandoli alla prossima quota
          // libera più vicina (o, in mancanza, di un passo minimo) per non restare bloccati.
          const quoteSuperiori = skyline.filter((v) => v > y0);
          const prossimaQuota = quoteSuperiori.length > 0 ? Math.min(...quoteSuperiori) : y0 + 1;
          for (let i = 0; i < COLS; i++) if (skyline[i] === y0) skyline[i] = prossimaQuota;
        }
      }

      // Rete di sicurezza: con i tipi di pannello esistenti (tutti larghi <= COLS) non dovrebbe
      // mai servire, ma se per qualche motivo la coda non si svuotasse, meglio accodare quel che
      // resta in fondo che perderlo silenziosamente.
      if (coda.length > 0) {
        let cursoreY = Math.max(...skyline, 0);
        for (const tipo of coda) {
          const { w, h: minimo } = dimensioneMinima(tipo);
          const h = Math.max(altezzaApertura, minimo);
          nuovi.push({ id: crypto.randomUUID(), tipo, x: 0, y: cursoreY, w, h });
          cursoreY += h;
        }
      }

      return [...prev, ...nuovi];
    });
  }, [persistiLayout]);

  const handleApriGiorno = useCallback(
    (dataGiorno: string) => {
      persistiLayout((prev) => {
        const esistente = prev.find((p) => p.tipo === "dettaglio-giorno");

        if (esistente) {
          const dataGiorni = esistente.dataGiorni?.includes(dataGiorno)
            ? esistente.dataGiorni
            : [...(esistente.dataGiorni ?? []), dataGiorno];
          return prev.map((p) =>
            p.id === esistente.id ? { ...p, dataGiorni, tabAttiva: dataGiorno } : p,
          );
        }

        const base = dimensioneDefault();
        const minima = dimensioneMinima("dettaglio-giorno");
        const w = Math.max(base.w, minima.w);
        const h = Math.max(base.h, minima.h);
        const { x, y } = trovaPosizioneLibera(prev, w, h);
        const nuovo: Pannello = {
          id: crypto.randomUUID(),
          tipo: "dettaglio-giorno",
          dataGiorni: [dataGiorno],
          tabAttiva: dataGiorno,
          x,
          y,
          w,
          h,
        };
        return [...prev, nuovo];
      });
    },
    [persistiLayout],
  );

  // Usata dal click su una card giorno nel popup di sforamento: apre il dettaglio giorno E allinea
  // il filtro data di tutti i grafici aperti, per una visione d'insieme di cosa è successo quel
  // giorno - a differenza di handleApriGiorno da sola (calendario), che non tocca i grafici.
  const handleApriGiornoOvunque = useCallback(
    (dataGiorno: string) => {
      handleApriGiorno(dataGiorno);
      setFocusGiorno({ data: dataGiorno });
    },
    [handleApriGiorno],
  );

  const handleCambiaTab = useCallback(
    (id: string, data: string) => {
      persistiLayout((prev) => prev.map((p) => (p.id === id ? { ...p, tabAttiva: data } : p)));
    },
    [persistiLayout],
  );

  const handleChiudiTab = useCallback(
    (id: string, data: string) => {
      persistiLayout((prev) => prev.map((p) => (p.id === id ? chiudiTabDelPannello(p, data) : p)));
    },
    [persistiLayout],
  );

  const handleCambiaVistaConfronto = useCallback(
    (id: string, vista: VistaConfronto) => {
      persistiLayout((prev) => prev.map((p) => (p.id === id ? { ...p, vista } : p)));
    },
    [persistiLayout],
  );

  const handleRemovePanel = useCallback(
    (id: string) => {
      persistiLayout((prev) => prev.filter((p) => p.id !== id));
    },
    [persistiLayout],
  );

  const handleToggleAncora = useCallback(
    (id: string) => {
      persistiLayout((prev) => prev.map((p) => (p.id === id ? { ...p, ancorato: !p.ancorato } : p)));
    },
    [persistiLayout],
  );

  const handleEliminaGiorno = useCallback(
    async (data: string) => {
      await eliminaGiornoCompleto(data);
      ricaricaStorico().catch((err) => registraErroreNonBloccante(err, "Ricarico storico diario fallito"));
      persistiLayout((prev) =>
        prev.map((p) =>
          p.tipo === "dettaglio-giorno" && p.dataGiorni?.includes(data) ? chiudiTabDelPannello(p, data) : p,
        ),
      );
    },
    [ricaricaStorico, persistiLayout],
  );

  const handlePortaInPrimoPiano = useCallback((id: string) => {
    setPannelli((prev) => {
      const maxZ = prev.reduce((m, p) => Math.max(m, p.z ?? 0), 0);
      if ((prev.find((p) => p.id === id)?.z ?? 0) === maxZ && maxZ > 0) return prev;
      const aggiornato = prev.map((p) => (p.id === id ? { ...p, z: maxZ + 1 } : p));
      salvaLayout({ schemaVersion: "1.0", pannelli: aggiornato });
      return aggiornato;
    });
  }, []);

  const handleResetLayout = useCallback(() => {
    persistiLayout((prev) => {
      const ancorati = prev.filter((p) => p.ancorato);
      const idAncorati = new Set(ancorati.map((p) => p.id));
      const pannelliDefault = layoutDiDefault().pannelli.filter((p) => !idAncorati.has(p.id));
      return [...ancorati, ...pannelliDefault];
    });
  }, [persistiLayout]);

  // "Azzera impostazioni": tutto ciò che è preferenza dell'app (layout dashboard, margine
  // obiettivo peso, movimento libero), non un dato nutrizionale - quello resta a "Cancella tutti i
  // dati" più sotto. ancoraGriglia non è mai persistito su file (torna già a true ad ogni riavvio,
  // vedi la sua dichiarazione), ma va azzerato comunque qui per riflettersi subito nella sessione
  // corrente, non solo al prossimo avvio.
  const handleAzzeraImpostazioni = useCallback(async () => {
    handleResetLayout();
    // Patch mirata solo al margine (non tutto IMPOSTAZIONI_DEFAULT): "aggiornamenti automatici" è una
    // scelta esplicita e a parte dell'utente (vedi useAggiornamenti.ts), non una preferenza di
    // layout/aspetto - non deve essere azzerata da un'azione che promette di toccare solo quelle.
    await salvaImpostazioni({ margineObiettivoPesoKg: IMPOSTAZIONI_DEFAULT.margineObiettivoPesoKg });
    setMargineObiettivoPesoKg(IMPOSTAZIONI_DEFAULT.margineObiettivoPesoKg);
    setAncoraGriglia(true);
  }, [handleResetLayout]);

  const handleSvuotaDiario = useCallback(async () => {
    await svuotaDiario();
    await ricaricaStorico();
  }, [ricaricaStorico]);

  // DELETE, non DROP: lo schema resta intatto, si azzerano solo le righe (vedi svuotaTuttiIDati).
  const handleCancellaTuttiIDati = useCallback(async () => {
    await svuotaTuttiIDati();
    await Promise.all([ricaricaStorico(), ricaricaAlimenti(), ricaricaRicette(), ricaricaPeso(), ricaricaStoricoTDEE()]);
    setVersioneObiettivi((v) => v + 1);
  }, [ricaricaStorico, ricaricaAlimenti, ricaricaRicette, ricaricaPeso, ricaricaStoricoTDEE]);

  async function handleEsportaBackupCompletoJson(): Promise<boolean> {
    const percorso = await save({
      defaultPath: "nutribum-backup-completo.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!percorso) return false;
    const backup = await esportaBackupCompleto();
    await writeTextFile(percorso, JSON.stringify(backup, null, 2));
    return true;
  }

  async function handleEsportaDiarioJsonPreCancellazione(): Promise<boolean> {
    const percorso = await save({
      defaultPath: "diario-nutrizione.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!percorso) return false;
    await writeTextFile(percorso, JSON.stringify(storico ?? { schemaVersion: "1.0", giorni: [] }, null, 2));
    return true;
  }

  async function handleEsportaDiarioCsvPreCancellazione(): Promise<boolean> {
    const percorso = await save({
      defaultPath: "diario-nutrizione.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!percorso) return false;
    await writeTextFile(percorso, historyToCsv(storico ?? { schemaVersion: "1.0", giorni: [] }));
    return true;
  }

  async function handleImportaBackupCompleto(): Promise<void> {
    const percorso = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!percorso || Array.isArray(percorso)) return;
    const contenuto = await readTextFile(percorso);
    const backup = validaBackupJson(contenuto);
    await ripristinaBackupCompleto(backup);
    await Promise.all([ricaricaStorico(), ricaricaAlimenti(), ricaricaRicette(), ricaricaPeso(), ricaricaStoricoTDEE()]);
    setVersioneObiettivi((v) => v + 1);
  }

  const handleStoricoSalvato = useCallback(() => {
    ricaricaStorico().catch((err) =>
      registraErroreNonBloccante(err, "Ricarico storico diario (dopo salvataggio pasto) fallito"),
    );
  }, [ricaricaStorico]);

  async function handleExportHistoryJson() {
    if (!storico) return;
    const percorso = await save({
      defaultPath: "diario-nutrizione.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!percorso) return;
    await writeTextFile(percorso, JSON.stringify(storico, null, 2));
  }

  async function handleExportHistoryCsv() {
    if (!storico) return;
    const percorso = await save({
      defaultPath: "diario-nutrizione.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!percorso) return;
    await writeTextFile(percorso, historyToCsv(storico));
  }

  async function handleExportFoodsJson() {
    const percorso = await save({
      defaultPath: "alimenti.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!percorso) return;
    await writeTextFile(percorso, foodsToJson(alimenti));
  }

  async function handleExportFoodsCsv() {
    const percorso = await save({
      defaultPath: "alimenti.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!percorso) return;
    await writeTextFile(percorso, foodsToCsv(alimenti));
  }

  async function handleExportWeightJson() {
    const percorso = await save({
      defaultPath: "storico-peso.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!percorso) return;
    await writeTextFile(percorso, weightToJson(peso));
  }

  async function handleExportWeightCsv() {
    const percorso = await save({
      defaultPath: "storico-peso.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!percorso) return;
    await writeTextFile(percorso, weightToCsv(peso));
  }

  const giorni = storico?.giorni ?? [];

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-black dark:text-slate-100">
      <NavBar
        onImportato={ricaricaStorico}
        onAddPanel={handleAddPanel}
        onAddAllPanels={handleAddAllPanels}
        onExportHistoryJson={handleExportHistoryJson}
        onExportHistoryCsv={handleExportHistoryCsv}
        onResetLayout={handleResetLayout}
        onAzzeraImpostazioni={handleAzzeraImpostazioni}
        onSvuotaDiario={handleSvuotaDiario}
        onCancellaTuttiIDati={handleCancellaTuttiIDati}
        onEsportaBackupCompletoJson={handleEsportaBackupCompletoJson}
        onEsportaDiarioJsonPreCancellazione={handleEsportaDiarioJsonPreCancellazione}
        onEsportaDiarioCsvPreCancellazione={handleEsportaDiarioCsvPreCancellazione}
        onImportaBackupCompleto={handleImportaBackupCompleto}
        onNuovoAlimento={() => setModaleAlimentoAperta(true)}
        onNuovaRicetta={() => setModaleRicettaAperta(true)}
        onAlimentiImportati={ricaricaAlimenti}
        onExportFoodsJson={handleExportFoodsJson}
        onExportFoodsCsv={handleExportFoodsCsv}
        onObiettivoSalvato={() => setVersioneObiettivi((v) => v + 1)}
        onApriGiorno={handleApriGiornoOvunque}
        ancoraGriglia={ancoraGriglia}
        onToggleAncoraGriglia={() => setAncoraGriglia((a) => !a)}
        tipiEsistenti={pannelli.map((p) => p.tipo)}
        giorni={giorni}
        versioneObiettivi={versioneObiettivi}
        peso={peso}
        obiettivoPesoKg={obiettivoPesoKg}
        margineObiettivoPesoKg={margineObiettivoPesoKg}
        storicoObiettivoPeso={storicoObiettivoPeso}
        storicoProfilo={storicoProfilo}
        storicoFitness={storicoFitness}
        onWeightImported={ricaricaPeso}
        onExportWeightJson={handleExportWeightJson}
        onExportWeightCsv={handleExportWeightCsv}
        onApriInserimentoPeso={() => setWeightEntryModalOpen(true)}
        onApriObiettivoPeso={() => setWeightGoalModalOpen(true)}
      />

      {modaleAlimentoAperta && (
        <AlimentoFormModal onChiudi={() => setModaleAlimentoAperta(false)} onSalvato={ricaricaAlimenti} />
      )}

      {modaleRicettaAperta && (
        <RicettaFormModal alimenti={alimenti} onChiudi={() => setModaleRicettaAperta(false)} onSalvato={ricaricaRicette} />
      )}

      {weightEntryModalOpen && (
        <WeightEntryModal
          valoreOggi={peso.find((v) => v.data === oggi())?.pesoKg ?? null}
          onClose={() => setWeightEntryModalOpen(false)}
          onSaved={ricaricaPeso}
        />
      )}

      {weightGoalModalOpen && (
        <WeightGoalModal
          goalKg={obiettivoPesoKg}
          margineKg={margineObiettivoPesoKg}
          onClose={() => setWeightGoalModalOpen(false)}
          onSaved={ricaricaPeso}
          onSalvaMargine={handleSalvaMargineObiettivoPeso}
        />
      )}

      <div ref={containerRef} className="flex-1 overflow-auto p-3">
        {mounted && (
          <ReactGridLayout
            width={width}
            layout={pannelli.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h }))}
            gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: MARGIN }}
            dragConfig={{ enabled: false }}
            resizeConfig={{ enabled: false }}
            compactor={noCompactor}
          >
            {pannelli.map((p) => (
              <div
                key={p.id}
                style={{
                  zIndex: p.z ?? 0,
                  // Hint al motore di rendering (WebKitGTK) a promuovere QUESTO pannello a un
                  // livello di composizione GPU proprio mentre si muove: senza, il contenuto (es.
                  // l'SVG di un grafico) viene ridipinto ad ogni frame del transform invece di
                  // essere semplicemente ricomposto - costo interno al pannello stesso, distinto da
                  // quello di ombra/clip sugli ALTRI pannelli già risolto sopra.
                  willChange: pannelloInMovimento === p.id ? "transform" : undefined,
                }}
                onMouseDownCapture={() => handlePortaInPrimoPiano(p.id)}
              >
                <PanelChrome
                  titolo={titoloPannello(p)}
                  headerExtra={headerExtraPannello(
                    p,
                    handleCambiaTab,
                    handleChiudiTab,
                    handleCambiaVistaConfronto,
                    peso,
                    obiettivoPesoKg,
                    () => setWeightEntryModalOpen(true),
                    () => setWeightGoalModalOpen(true),
                  )}
                  ancorato={p.ancorato ?? false}
                  // Non solo il pannello trascinato: quando ci passa sopra, WebKitGTK deve
                  // ricomporre anche ombra/clip/angoli arrotondati dei pannelli SOTTOSTANTI, non
                  // solo quello in movimento - quindi si semplificano tutti finché il gesto è attivo.
                  inMovimento={pannelloInMovimento !== null}
                  onToggleAncora={() => handleToggleAncora(p.id)}
                  onRimuovi={() => handleRemovePanel(p.id)}
                  onIniziaDrag={(e) => iniziaDrag(p.id, e)}
                  onIniziaResize={(e, direzione) => iniziaResize(p.id, e, direzione)}
                >
                  {contenutoPannello(
                    p,
                    giorni,
                    alimenti,
                    ricette,
                    handleApriGiorno,
                    handleEliminaGiorno,
                    handleStoricoSalvato,
                    gestisciAlimentiCambiati,
                    ricaricaRicette,
                    versioneObiettivi,
                    focusGiorno,
                    peso,
                    obiettivoPesoKg,
                    storicoObiettivoPeso,
                    margineObiettivoPesoKg,
                    storicoObiettiviKcal,
                    storicoProfilo,
                    storicoFitness,
                  )}
                </PanelChrome>
              </div>
            ))}
          </ReactGridLayout>
        )}
      </div>
    </div>
  );
}

export default App;

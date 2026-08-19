import type { Step } from "react-joyride";

// Letto da TourGuidato via step.data per sapere quale menu di primo livello della navbar tenere
// forzato aperto (vedi NavBar.tsx: prop menuForzatoAperto) mentre questo step è attivo. Assente
// (undefined) per gli step che non devono aprire nessun menu.
export interface DatiStep {
  menu?: string;
}

// Target solo su bottoni fissi della navbar (sempre presenti nel DOM, anche se disabilitati) - MAI
// su un pannello specifico della dashboard: il layout di default ha solo "calendario"
// (layoutDiDefault() in layoutSchema.ts) e un rilancio manuale successivo può capitare quando
// l'utente ha già rimosso/riorganizzato i pannelli. Se in futuro un tour dovesse comunque puntare
// a un pannello non garantito, react-joyride v3 fa da solo polling del target fino a
// targetWaitTimeout (default 1000ms) prima di avanzare da solo allo step successivo - non serve
// gestirlo a mano in TourGuidato.
//
// Per ogni menu di primo livello: uno step di presentazione (menu chiuso) seguito da uno o più
// step con data.menu impostato, che tengono il menu forzato aperto per evidenziare le voci al suo
// interno. Import/export sono raggruppati in un solo step per menu (data-tour su un div wrapper in
// NavBar.tsx che copre entrambi i bottoni, non solo il primo) invece di uno step a testa - sono
// azioni gemelle, tediose da spiegare separatamente. Uniche voci deliberatamente MAI evidenziate:
// le azioni distruttive del menu File (Azzera impostazioni, Svuota diario, Cancella tutti i dati) -
// in un tour di benvenuto rischierebbero di leggersi come un invito a cliccarle, non come un avviso.

const TOUR_BENVENUTO: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Benvenuto in NutriBum",
    content: "Un giro rapido dei quattro menu principali e di come funziona la dashboard.",
  },
  {
    target: '[data-tour="navbar-file"]',
    placement: "bottom",
    title: "File",
    content:
      "Impostazioni della dashboard (griglia, compattazione automatica), backup e cancellazione dati.",
  },
  {
    target: '[data-tour="file-impostazioni"]',
    placement: "right",
    title: "Impostazioni",
    content:
      "Griglia visiva, compattazione automatica, e \"Reimposta layout pannelli\" per tornare alla disposizione di partenza.",
    data: { menu: "file" } satisfies DatiStep,
  },
  {
    target: '[data-tour="navbar-alimenti"]',
    placement: "bottom",
    title: "Scheda Alimenti",
    content: "Il catalogo degli alimenti che usi per registrare i pasti, più le ricette che crei combinandoli.",
  },
  {
    target: '[data-tour="alimenti-aggiungi-singolo"]',
    placement: "right",
    title: "Aggiungi un alimento",
    content: "Il modo più rapido per aggiungere un alimento al catalogo a mano, con i suoi valori nutrizionali.",
    data: { menu: "alimenti" } satisfies DatiStep,
  },
  {
    target: '[data-tour="alimenti-nuova-ricetta"]',
    placement: "right",
    title: "Crea una ricetta",
    content: "Combina più alimenti in una ricetta riusabile, comoda per i piatti che prepari spesso.",
    data: { menu: "alimenti" } satisfies DatiStep,
  },
  {
    target: '[data-tour="alimenti-import-export"]',
    placement: "right",
    title: "Importa ed esporta",
    content:
      "Importa più alimenti insieme da un file JSON o CSV, oppure esporta l'intero catalogo per un backup o per condividerlo.",
    data: { menu: "alimenti" } satisfies DatiStep,
  },
  {
    target: '[data-tour="navbar-diario"]',
    placement: "bottom",
    title: "Diario Alimentare",
    content:
      "Qui imposti i limiti giornalieri (kcal, macronutrienti) e il tuo profilo per il calcolo del TDEE.",
  },
  {
    target: '[data-tour="diario-limite-giornaliero"]',
    placement: "right",
    title: "Imposta i tuoi limiti",
    content:
      "Kcal, macronutrienti, fibre e sale: i limiti giornalieri che l'app usa per segnalarti sforamenti o carenze.",
    data: { menu: "diario" } satisfies DatiStep,
  },
  {
    target: '[data-tour="diario-profilo"]',
    placement: "right",
    title: "Il tuo profilo",
    content:
      "Età, altezza, sesso e livello di attività: servono a calcolare il tuo TDEE, da usare come limite kcal al posto di uno impostato a mano.",
    data: { menu: "diario" } satisfies DatiStep,
  },
  {
    target: '[data-tour="diario-import-export"]',
    placement: "right",
    title: "Importa, esporta, report PDF",
    content:
      "Importa o esporta lo storico del diario, oppure genera un report PDF con tabelle e grafici per un periodo a tua scelta.",
    data: { menu: "diario" } satisfies DatiStep,
  },
  {
    target: '[data-tour="navbar-peso"]',
    placement: "bottom",
    title: "Diario del Peso",
    content: "Registra il peso corporeo e imposta un obiettivo da seguire nel tempo.",
  },
  {
    target: '[data-tour="peso-imposta-peso"]',
    placement: "right",
    title: "Registra il peso",
    content: "Aggiungi una misurazione di peso corporeo per una data a tua scelta.",
    data: { menu: "peso" } satisfies DatiStep,
  },
  {
    target: '[data-tour="peso-imposta-obiettivo"]',
    placement: "right",
    title: "Il tuo obiettivo peso",
    content: "Imposta il peso che vuoi raggiungere: verrà usato per la proiezione nel grafico del Diario del Peso.",
    data: { menu: "peso" } satisfies DatiStep,
  },
  {
    target: '[data-tour="peso-import-export"]',
    placement: "right",
    title: "Importa ed esporta lo storico peso",
    content: "Importa più misurazioni insieme da un file, oppure esporta l'intero storico del tuo peso.",
    data: { menu: "peso" } satisfies DatiStep,
  },
  {
    target: '[data-tour="navbar-aggiungi-scheda"]',
    placement: "bottom",
    title: "Dashboard modulare",
    content:
      "La dashboard è fatta di schede che trascini e ridimensioni a piacere. Da qui ne aggiungi altre: calendario, grafici, registra pasto, ricette e altro. Ogni scheda ha un \"?\" nel suo header con tutti i dettagli su cosa mostra.",
  },
  {
    target: '[data-tour="navbar-aiuto"]',
    placement: "bottom",
    title: "Aiuto",
    content: "Glossario dei termini usati nell'app (BMR, TDEE, sforamento...) e, da qui, puoi rivedere questo tour quando vuoi.",
  },
];

export const TOURS = {
  benvenuto: TOUR_BENVENUTO,
} as const;

export type IdTour = keyof typeof TOURS;

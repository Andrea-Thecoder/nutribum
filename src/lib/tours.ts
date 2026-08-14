import type { Step } from "react-joyride";

// Target solo su bottoni fissi della navbar (sempre presenti nel DOM, anche se disabilitati) - MAI
// su un pannello specifico della dashboard: il layout di default ha solo "calendario"
// (layoutDiDefault() in layoutSchema.ts) e un rilancio manuale successivo può capitare quando
// l'utente ha già rimosso/riorganizzato i pannelli. Se in futuro un tour dovesse comunque puntare
// a un pannello non garantito, react-joyride v3 fa da solo polling del target fino a
// targetWaitTimeout (default 1000ms) prima di avanzare da solo allo step successivo - non serve
// gestirlo a mano in TourGuidato.
const TOUR_BENVENUTO: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Benvenuto in NutriBum",
    content:
      "Un giro rapido dei quattro menu principali e di come funziona la dashboard. Dura meno di un minuto, e lo trovi sempre in Aiuto → Rivedi tutorial se vuoi rifarlo.",
  },
  {
    target: '[data-tour="navbar-file"]',
    placement: "bottom",
    title: "File",
    content:
      "Impostazioni della dashboard (griglia, compattazione automatica), backup e cancellazione dati.",
  },
  {
    target: '[data-tour="navbar-alimenti"]',
    placement: "bottom",
    title: "Scheda Alimenti",
    content: "Il catalogo degli alimenti che usi per registrare i pasti, più le ricette che crei combinandoli.",
  },
  {
    target: '[data-tour="navbar-diario"]',
    placement: "bottom",
    title: "Diario Alimentare",
    content:
      "Qui imposti i limiti giornalieri (kcal, macronutrienti) e il tuo profilo per il calcolo del TDEE.",
  },
  {
    target: '[data-tour="navbar-peso"]',
    placement: "bottom",
    title: "Diario del Peso",
    content: "Registra il peso corporeo e imposta un obiettivo da seguire nel tempo.",
  },
  {
    target: '[data-tour="navbar-aggiungi-scheda"]',
    placement: "bottom",
    title: "Dashboard modulare",
    content:
      "La dashboard è fatta di schede che trascini e ridimensioni a piacere. Da qui ne aggiungi altre: calendario, grafici, registra pasto, ricette e altro.",
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

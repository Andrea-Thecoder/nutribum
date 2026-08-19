import type { Step } from "react-joyride";

// Step per il mini-tour "?" delle modali raggiunte direttamente da NavBar (limiti giornalieri,
// profilo, aggiungi alimento, nuova ricetta) - non una scheda della dashboard. A differenza di
// tourAnteprimaContenuti.tsx (che punta a una COPIA con dati finti dentro una modale "?" separata,
// per non toccare mai i dati reali) qui il tour gira direttamente sulla modale vera, sui suoi campi
// reali: non c'è scrittura accidentale possibile finché l'utente non preme "Salva"/"Crea" di sua
// iniziativa, quindi non serve nessuna sabbiera né alcun dato finto - il motore
// (TourAnteprimaPannello) resta lo stesso, invariato. NOTA: AlimentoFormModal e RicettaFormModal
// sono anche riusate DENTRO l'anteprima "?" di Libro Alimenti/Gestione Ricette (prop `anteprima`) -
// in quel caso il loro "?" e l'id di scoping restano disattivati (vedi i componenti), altrimenti
// due contenitori "anteprima-tour-root" finirebbero annidati uno dentro l'altro.

export const stepsObiettivoKcal: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Limite giornaliero - Kcal",
    content:
      "Qui imposti quante kcal puoi consumare al giorno (limite massimo) e sotto quale soglia è rischioso scendere (limite minimo). Sono i due numeri che poi vedi in Kcal per periodo, Progresso Obiettivi e negli avvisi del Calendario.",
  },
  {
    target: '[data-tour="obiettivo-kcal-max"]',
    placement: "auto",
    title: "Limite massimo",
    content: "Kcal al giorno. Non è obbligatorio: lascialo vuoto se non vuoi impostare nessun tetto.",
  },
  {
    target: '[data-tour="obiettivo-usa-tdee"]',
    placement: "auto",
    title: "Usa TDEE calcolato",
    content:
      "Spuntala per usare il TDEE calcolato da profilo, peso e livello di attività al posto di un numero fisso - il campo sopra si blocca e mostra il valore calcolato. Resta grigia e non cliccabile finché non hai completato il profilo e registrato almeno un peso.",
  },
  {
    target: '[data-tour="obiettivo-kcal-min"]',
    placement: "auto",
    title: "Limite minimo",
    content: "Kcal minimo al giorno: sotto questa soglia rischi la denutrizione. Anche questo è facoltativo.",
  },
  {
    target: '[data-tour="obiettivo-usa-bmr"]',
    placement: "auto",
    title: "Usa BMR calcolato",
    content:
      "Come sopra ma per il minimo: usa il BMR (il fabbisogno energetico a riposo) calcolato dal profilo, invece di un numero fisso.",
  },
  {
    target: '[data-tour="obiettivo-ambito"]',
    placement: "auto",
    title: "Ambito di validità",
    content:
      "Da quando vale questo limite: da ora in poi, sempre (tutta la cronologia), solo questa settimana o solo questo mese. La descrizione sotto il menu cambia con la scelta - leggila prima di salvare.",
  },
  {
    target: '[data-tour="obiettivo-salva"]',
    placement: "auto",
    title: "Salva",
    content: "Applica il limite con l'ambito scelto. \"Annulla\" chiude senza cambiare nulla.",
  },
];

export const stepsObiettivoMacro: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Limite giornaliero - Macronutrienti",
    content:
      "Grassi, proteine e carboidrati massimi al giorno, in grammi. Usati nel grafico Macronutrienti per periodo e negli avvisi del Calendario (\"macronutrienti superati\").",
  },
  {
    target: '[data-tour="obiettivo-macro-grassi"]',
    placement: "auto",
    title: "Grassi",
    content: "Grammi al giorno. Non obbligatorio: vuoto = nessun limite su questo macronutriente.",
  },
  {
    target: '[data-tour="obiettivo-macro-proteine"]',
    placement: "auto",
    title: "Proteine",
    content: "Grammi al giorno. Facoltativo, come gli altri due campi qui.",
  },
  {
    target: '[data-tour="obiettivo-macro-carboidrati"]',
    placement: "auto",
    title: "Carboidrati",
    content: "Grammi al giorno. Facoltativo.",
  },
  {
    target: '[data-tour="obiettivo-ambito"]',
    placement: "auto",
    title: "Ambito di validità",
    content:
      "Da quando vale questo limite: da ora in poi, sempre (tutta la cronologia), solo questa settimana o solo questo mese. La descrizione sotto il menu cambia con la scelta.",
  },
  {
    target: '[data-tour="obiettivo-salva"]',
    placement: "auto",
    title: "Salva",
    content: "Applica il limite con l'ambito scelto. \"Annulla\" chiude senza cambiare nulla.",
  },
];

export const stepsObiettivoAltro: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Limite giornaliero - Altro",
    content:
      "Sale e fibre massimi al giorno, in grammi. Usati nel grafico Fibre e Sale per periodo e negli avvisi del Calendario (\"fibre/sale superati\").",
  },
  {
    target: '[data-tour="obiettivo-altro-sale"]',
    placement: "auto",
    title: "Sale",
    content: "Grammi al giorno. Non obbligatorio: vuoto = nessun limite.",
  },
  {
    target: '[data-tour="obiettivo-altro-fibre"]',
    placement: "auto",
    title: "Fibre",
    content: "Grammi al giorno. Facoltativo.",
  },
  {
    target: '[data-tour="obiettivo-ambito"]',
    placement: "auto",
    title: "Ambito di validità",
    content:
      "Da quando vale questo limite: da ora in poi, sempre (tutta la cronologia), solo questa settimana o solo questo mese. La descrizione sotto il menu cambia con la scelta.",
  },
  {
    target: '[data-tour="obiettivo-salva"]',
    placement: "auto",
    title: "Salva",
    content: "Applica il limite con l'ambito scelto. \"Annulla\" chiude senza cambiare nulla.",
  },
];

export const stepsProfilo: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Profilo (per il TDEE)",
    content:
      "Età, altezza, sesso e livello di attività. Servono a calcolare BMR e TDEE, usati per suggerire in automatico i limiti di kcal (checkbox \"Usa TDEE/BMR calcolato\" nella modale dei limiti) e in diversi grafici.",
  },
  {
    target: '[data-tour="profilo-eta"]',
    placement: "auto",
    title: "Età *",
    content: "In anni, tra 1 e 120. Obbligatoria per calcolare BMR e TDEE.",
  },
  {
    target: '[data-tour="profilo-altezza"]',
    placement: "auto",
    title: "Altezza *",
    content: "In centimetri, tra 50 e 250. Obbligatoria.",
  },
  {
    target: '[data-tour="profilo-sesso"]',
    placement: "auto",
    title: "Sesso",
    content: "Usato nella formula del BMR, che varia leggermente tra uomo e donna.",
  },
  {
    target: '[data-tour="profilo-livello-attivita"]',
    placement: "auto",
    title: "Livello di attività",
    content:
      "Quanto ti muovi di solito: più è alto, più il TDEE stimato sale rispetto al BMR. Se hai già registrato un peso e i campi sopra sono validi, qui sotto compare subito un'anteprima di BMR e TDEE - non viene salvato niente finché non premi Salva.",
  },
  {
    target: '[data-tour="profilo-salva"]',
    placement: "auto",
    title: "Salva profilo",
    content: "Salva età, altezza, sesso e livello di attività. \"Annulla\" chiude senza cambiare nulla.",
  },
];

export const stepsAggiungiAlimento: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Nuovo alimento",
    content:
      "Aggiungi un alimento al catalogo: tutti i valori nutrizionali si intendono per 100g o 100ml, a seconda dell'unità che scegli.",
  },
  {
    target: '[data-tour="alimento-nome"]',
    placement: "auto",
    title: "Nome *",
    content: "Obbligatorio.",
  },
  {
    target: '[data-tour="alimento-unita"]',
    placement: "auto",
    title: "Unità di riferimento",
    content:
      "Grammi o millilitri: decide se tutti i valori sotto (kcal, proteine…) si intendono per 100g o per 100ml.",
  },
  {
    target: '[data-tour="alimento-kcal"]',
    placement: "auto",
    title: "Kcal, Proteine, Carboidrati, Grassi *",
    content: "Questi quattro sono obbligatori. Zuccheri, grassi saturi, fibre e sale (sotto) sono facoltativi.",
  },
  {
    target: '[data-tour="alimento-etichetta"]',
    placement: "auto",
    title: "Valori presi dall'etichetta nutrizionale",
    content:
      "Spuntala se hai copiato i numeri direttamente dall'etichetta del prodotto: nei grafici, i giorni che usano questo alimento vengono segnalati con \"~ stima\" invece di un numero esatto.",
  },
];

export const stepsNuovaRicetta: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Nuova ricetta",
    content:
      "Una ricetta è un elenco di alimenti del catalogo con le rispettive quantità: registrarla in un pasto aggiunge tutti gli ingredienti in un colpo solo.",
  },
  {
    target: '[data-tour="ricetta-nome"]',
    placement: "auto",
    title: "Nome ricetta *",
    content: "Obbligatorio.",
  },
  {
    target: '[data-tour="ricetta-ingredienti"]',
    placement: "auto",
    title: "Ingredienti *",
    content:
      "Almeno un ingrediente obbligatorio: per ognuno scegli l'alimento dal catalogo e la quantità (deve essere maggiore di zero). \"+ Aggiungi ingrediente\" ne aggiunge altri, la ✕ a fianco di ogni riga la rimuove.",
  },
];

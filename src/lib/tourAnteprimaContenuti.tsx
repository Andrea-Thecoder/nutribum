import type { Step } from "react-joyride";
import { GIORNI_ESEMPIO_CALENDARIO } from "./datiDimostrativi";

// Step + mappe data-tour per ogni mini-tour annidato dentro la modale "?" di una scheda (motore
// generico in components/TourAnteprimaPannello.tsx). Un file solo per tutte le schede, stesso
// principio di tours.ts per il tour di benvenuto: i contenuti stanno separati dal motore.

// ---------------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------------

// Chiave GIORNI_ESEMPIO_CALENDARIO -> data-tour da applicare alla cella corrispondente (vedi prop
// dataTourPerData di CalendarioPanel). Unica fonte di verità condivisa con anteprimaPannelli.tsx,
// che costruisce la mappa data->data-tour a partire da questo stesso oggetto - così le due parti
// (celle taggate e step del tour) non possono disallinearsi per un refuso in una stringa copiata a
// mano in due posti diversi.
export const DATA_TOUR_CELLE_CALENDARIO: Record<keyof typeof GIORNI_ESEMPIO_CALENDARIO, string> = {
  senzaDati: "cella-calendario-senza-dati",
  pulito: "cella-calendario-pulita",
  kcalSforato: "cella-calendario-kcal-sforato",
  macroSforato: "cella-calendario-macro-sforato",
  altroSforato: "cella-calendario-altro-sforato",
  sottoMinimo: "cella-calendario-sotto-minimo",
  moltoSottoMinimo: "cella-calendario-molto-sotto-minimo",
};

// Numeri veri del dataset finto (vedi STORICO_OBIETTIVI_KCAL_DIMOSTRATIVO e GIORNI_ESEMPIO in
// datiDimostrativi.ts) citati per esteso nei testi sotto: "hai superato il limite" da solo è
// un'affermazione astratta, il numero vero e quello del limite la rendono verificabile a colpo
// d'occhio guardando la cella.
export const stepsCalendario: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Calendario kcal",
    content:
      "Vista mensile con un pallino colorato per ogni giorno registrato: segnala a colpo d'occhio se hai rispettato i tuoi limiti. Un giro rapido di come si legge ogni colore, con qualche giorno di esempio.",
  },
  {
    target: `[data-tour="${DATA_TOUR_CELLE_CALENDARIO.senzaDati}"]`,
    placement: "auto",
    title: "Nessun dato",
    content: "Grigio/trasparente: non hai registrato nulla in questo giorno, quindi non c'è nulla da confrontare con i limiti.",
  },
  {
    target: `[data-tour="${DATA_TOUR_CELLE_CALENDARIO.pulito}"]`,
    placement: "auto",
    title: "Giorno pulito",
    content: "Blu: le kcal consumate (2000 in questo esempio) restano tra il limite minimo (1500) e quello massimo (2200).",
  },
  {
    target: `[data-tour="${DATA_TOUR_CELLE_CALENDARIO.kcalSforato}"]`,
    placement: "auto",
    title: "Kcal superate 🔥",
    content: "Rosso con 🔥: hai superato il limite massimo di 2200 kcal - in questo esempio, 2500.",
  },
  {
    target: `[data-tour="${DATA_TOUR_CELLE_CALENDARIO.macroSforato}"]`,
    placement: "auto",
    title: "Macronutrienti superati 💪",
    content:
      "Rosso con 💪: proteine, carboidrati o grassi hanno superato il proprio limite - qui, 180g di proteine contro un limite di 140g - anche se le kcal restano nella norma.",
  },
  {
    target: `[data-tour="${DATA_TOUR_CELLE_CALENDARIO.altroSforato}"]`,
    placement: "auto",
    title: "Fibre o sale superati 🧂",
    content: "Rosso con 🧂: fibre o sale hanno superato il proprio limite - qui, 8g di sale contro un limite di 6g.",
  },
  {
    target: `[data-tour="${DATA_TOUR_CELLE_CALENDARIO.sottoMinimo}"]`,
    placement: "auto",
    title: "Sotto il minimo ⚠️",
    content: "Ambra con ⚠️: le kcal sono scese sotto il limite minimo di 1500 - qui, 1200. Il rischio opposto allo sforamento.",
  },
  {
    target: `[data-tour="${DATA_TOUR_CELLE_CALENDARIO.moltoSottoMinimo}"]`,
    placement: "auto",
    title: "Molto sotto il minimo 🆘",
    content:
      "Ambra con 🆘 invece di ⚠️: sei sceso sotto il 25% del minimo (375 kcal) - qui, solo 300. Stesso colore del caso precedente, icona diversa per la gravità.",
  },
];

// ---------------------------------------------------------------------------
// Dettaglio Giorno
// ---------------------------------------------------------------------------

export const stepsDettaglioGiorno: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Dettaglio Giorno",
    content:
      "Il dettaglio completo di un giorno: ogni pasto con gli alimenti registrati, le quantità e il totale rispetto ai limiti in vigore quel giorno.",
  },
  {
    target: '[data-tour="dettaglio-giorno-pasto"]',
    placement: "auto",
    title: "Ogni pasto",
    content: "Ogni pasto elenca gli alimenti con quantità e kcal. Qui: un pasto di esempio da 2500 kcal in totale.",
  },
  {
    target: '[data-tour="dettaglio-giorno-stima"]',
    placement: "auto",
    title: "Valore stimato",
    content: "Il simbolo ~ segnala un valore stimato, non preso da un'etichetta nutrizionale reale.",
  },
  {
    target: '[data-tour="dettaglio-giorno-totale-kcal"]',
    placement: "auto",
    title: "Totale in rosso",
    content: "Il totale kcal del giorno diventa rosso e mostra il limite superato tra parentesi - qui, 2500 contro un limite di 2200.",
  },
  {
    target: '[data-tour="dettaglio-giorno-elimina"]',
    placement: "auto",
    title: "Elimina giorno",
    content: "Rimuove definitivamente tutte le voci di questo giorno dal diario - chiede sempre conferma prima di farlo davvero.",
  },
];

// ---------------------------------------------------------------------------
// Kcal per periodo
// ---------------------------------------------------------------------------

// Target sulla legenda custom (LegendaManuale.tsx, data-tour="legenda-<etichetta>") e sui
// selettori periodo/istanza condivisi (SelettorePeriodo.tsx, SelettoreIstanza.tsx) - stessi
// componenti usati identici in più grafici, un solo posto dove aggiungere l'aggancio.
export const stepsKcalGiorno: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Kcal per periodo",
    content:
      "Andamento delle kcal consumate nel tempo, a confronto con i tuoi limiti e con una stima di quante te ne servirebbero.",
  },
  {
    target: '[data-tour="legenda-Kcal consumate"]',
    placement: "auto",
    title: "Kcal consumate",
    content: "Una barra per giorno (o per periodo, se aggreghi): quante kcal hai consumato davvero.",
  },
  {
    target: '[data-tour="legenda-Limite massimo"]',
    placement: "auto",
    title: "Limite massimo",
    content: "Linea tratteggiata corta: il tuo limite massimo di kcal - qui, 2200.",
  },
  {
    target: '[data-tour="legenda-TDEE stimato"]',
    placement: "auto",
    title: "TDEE stimato",
    content:
      "Linea tratteggiata lunga: una stima di quante kcal ti servono per mantenere il peso attuale, calcolata dal tuo profilo (età, altezza, sesso, livello di attività) con la formula di Mifflin-St Jeor.",
  },
  {
    target: '[data-tour="legenda-Limite minimo"]',
    placement: "auto",
    title: "Limite minimo",
    content: "Il rischio opposto allo sforamento: scendere sotto questa soglia - qui, 1500.",
  },
  {
    target: '[data-tour="legenda-BMR stimato"]',
    placement: "auto",
    title: "BMR stimato",
    content: "Le kcal che consumeresti a riposo assoluto, solo per le funzioni vitali - la base da cui si calcola il TDEE.",
  },
  {
    target: '[data-tour="selettore-periodo"]',
    placement: "auto",
    title: "Periodo",
    content: "Giorno, Settimana, Mese o Anno: cambia la granularità - i valori si sommano nel periodo scelto.",
  },
  {
    target: '[data-tour="selettore-istanza"]',
    placement: "auto",
    title: "Istanza",
    content: "Scegli quale porzione di tempo guardare, oppure \"Tutto\" per l'intera cronologia registrata.",
  },
];

// ---------------------------------------------------------------------------
// Macronutrienti per periodo
// ---------------------------------------------------------------------------

export const stepsMacroGiorno: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Macronutrienti per periodo",
    content: "Andamento di proteine, carboidrati e grassi nel tempo, a confronto coi rispettivi limiti - stesso pattern del grafico Kcal.",
  },
  {
    target: '[data-tour="legenda-Proteine"]',
    placement: "auto",
    title: "Proteine",
    content: "Barra piena: proteine consumate. La linea tratteggiata dello stesso colore è il limite - qui, 140g.",
  },
  {
    target: '[data-tour="legenda-Carboidrati"]',
    placement: "auto",
    title: "Carboidrati",
    content: "Barra piena: carboidrati consumati. Limite - qui, 220g.",
  },
  {
    target: '[data-tour="legenda-Grassi"]',
    placement: "auto",
    title: "Grassi",
    content: "Barra piena: grassi consumati. Limite - qui, 70g.",
  },
  {
    target: '[data-tour="selettore-periodo"]',
    placement: "auto",
    title: "Periodo",
    content: "Giorno, Settimana, Mese o Anno - indipendente dal periodo scelto nel grafico Kcal, anche se guardi lo stesso giorno.",
  },
  {
    target: '[data-tour="selettore-istanza"]',
    placement: "auto",
    title: "Istanza",
    content: "Scegli quale porzione di tempo guardare, oppure \"Tutto\" per l'intera cronologia.",
  },
];

// ---------------------------------------------------------------------------
// Top 10 alimenti per kcal
// ---------------------------------------------------------------------------

export const stepsTopAlimenti: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Top 10 alimenti per kcal",
    content: "I 10 alimenti che pesano di più sulle kcal totali nel periodo scelto - utile per capire da dove arrivano davvero le calorie.",
  },
  {
    target: "body",
    placement: "center",
    title: "Come si legge",
    content: "Una barra orizzontale per alimento: più è lunga, più kcal ha contribuito. Il nome è sull'asse verticale, le kcal su quello orizzontale.",
  },
  {
    target: '[data-tour="selettore-periodo"]',
    placement: "auto",
    title: "Periodo",
    content: "Giorno, Settimana, Mese o Anno.",
  },
  {
    target: '[data-tour="selettore-istanza"]',
    placement: "auto",
    title: "Istanza",
    content: "Scegli quale porzione di tempo guardare, oppure \"Tutto\" per l'intera cronologia registrata.",
  },
];

// ---------------------------------------------------------------------------
// Top 10 alimenti più consumati (frequenza)
// ---------------------------------------------------------------------------

export const stepsTopAlimentiFrequenza: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Top 10 alimenti più consumati",
    content:
      "I 10 alimenti che compaiono più spesso nel diario nel periodo scelto, indipendentemente da quante kcal portano - abitudini, non picchi calorici.",
  },
  {
    target: "body",
    placement: "center",
    title: "Come si legge",
    content: "Una barra orizzontale per alimento: la lunghezza è quante volte lo hai registrato, non le kcal.",
  },
  {
    target: '[data-tour="selettore-periodo"]',
    placement: "auto",
    title: "Periodo",
    content: "Settimana, Mese o Anno - qui non c'è \"Giorno\": la frequenza si misura su più giorni, non ne ha senso una su uno solo.",
  },
  {
    target: '[data-tour="selettore-istanza"]',
    placement: "auto",
    title: "Istanza",
    content: "Scegli quale porzione di tempo guardare, oppure \"Tutto\" per l'intera cronologia.",
  },
];

// ---------------------------------------------------------------------------
// Storico obiettivi (Andamento Obiettivi)
// ---------------------------------------------------------------------------

export const stepsAndamentoObiettivi: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Storico obiettivi",
    content:
      "Come sono cambiati nel tempo i tuoi limiti giornalieri: kcal, macronutrienti, fibre e sale - uno storico separato per ciascun gruppo, in sezioni distinte più sotto.",
  },
  {
    target: "body",
    placement: "center",
    title: "Pieno o tratteggiato",
    content:
      "Un pallino pieno indica un limite valido \"da ora in poi\". Un cerchio vuoto tratteggiato indica un ambito diverso (sempre, questa settimana, questo mese) - passandoci sopra il tooltip lo specifica.",
  },
];

// ---------------------------------------------------------------------------
// Progresso Obiettivi Nutrizionali
// ---------------------------------------------------------------------------

export const stepsProgressoObiettivi: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Progresso Obiettivi Nutrizionali",
    content: "Quanto ti avvicini ai tuoi limiti nel periodo scelto, aggregato invece che giorno per giorno - una vista più \"a bilancio\".",
  },
  {
    target: "body",
    placement: "center",
    title: "Colore delle barre",
    content: "Blu = entro il limite (fino al 100% della media nel periodo). Rosso = superato (oltre il 100%).",
  },
  {
    target: "body",
    placement: "center",
    title: "La percentuale",
    content:
      "Oltre il 300% la barra si ferma lì (per non spingere l'etichetta fuori dalla scheda), ma il valore vero resta sempre nel tooltip e nell'etichetta, con un \"+\" a segnalarlo.",
  },
  {
    target: '[data-tour="selettore-periodo"]',
    placement: "auto",
    title: "Periodo",
    content: "Giorno, Settimana o Mese.",
  },
  {
    target: '[data-tour="selettore-istanza"]',
    placement: "auto",
    title: "Istanza",
    content: "Scegli quale porzione di tempo guardare.",
  },
];

// ---------------------------------------------------------------------------
// Andamento TDEE
// ---------------------------------------------------------------------------

export const stepsAndamentoTDEE: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Andamento TDEE",
    content:
      "Come cambia il tuo TDEE stimato nel tempo, in base a peso e profilo (età, altezza, sesso, livello di attività) - un punto per ogni misurazione di peso registrata.",
  },
  {
    target: "body",
    placement: "center",
    title: "Le due linee",
    content:
      "Linea continua: TDEE stimato (quante kcal ti servono per mantenere il peso). Linea tratteggiata: BMR stimato, la base del calcolo - le kcal a riposo assoluto, prima di applicare il livello di attività.",
  },
];

// ---------------------------------------------------------------------------
// Peso corporeo
// ---------------------------------------------------------------------------

export const stepsPesoCorporeo: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Peso corporeo",
    content: "Il tuo storico di misurazioni di peso, con l'obiettivo impostato e una proiezione di quando potresti raggiungerlo.",
  },
  {
    target: "body",
    placement: "center",
    title: "Le due linee",
    content:
      "Linea continua: il tuo peso. Linea tratteggiata a gradini: l'obiettivo nel tempo - si sposta solo quando lo aggiorni, un pallino segna ogni cambiamento.",
  },
  {
    target: '[data-tour="peso-info-ritmo"]',
    placement: "auto",
    title: "Ritmo attuale",
    content:
      "Clicca la ⓘ per vedere esattamente come viene calcolato: prima e ultima pesata negli ultimi 30 giorni, non una media di tutte le misurazioni.",
  },
  {
    target: '[data-tour="selettore-vista"]',
    placement: "auto",
    title: "Grafico o tabella",
    content:
      "Stessa informazione, due modi di vederla: in tabella trovi anche la colonna \"Variazione\" (differenza rispetto alla pesata precedente, non rispetto all'obiettivo - c'è una ⓘ anche lì).",
  },
  {
    target: '[data-tour="selettore-periodo"]',
    placement: "auto",
    title: "Periodo",
    content: "Settimana, Mese o Anno - niente \"Giorno\": pesarsi più volte lo stesso giorno è raro, non aiuterebbe filtrare.",
  },
];

// ---------------------------------------------------------------------------
// Confronto periodi
// ---------------------------------------------------------------------------

export const stepsConfrontoPeriodi: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Confronto periodi",
    content:
      "Mette a confronto due periodi diversi (kcal, macronutrienti, fibre, sale o peso), scelti esplicitamente da te - non \"il periodo prima\" calcolato in automatico, ma due che scegli tu.",
  },
  {
    target: '[data-tour="selettore-periodo"]',
    placement: "auto",
    title: "Tipo di periodo",
    content: "Scegli il tipo di periodo da confrontare: giorno, settimana, mese o anno.",
  },
  {
    target: '[data-tour="selettore-istanza-a"]',
    placement: "auto",
    title: "Periodo A",
    content: "Il primo periodo del confronto.",
  },
  {
    target: '[data-tour="selettore-istanza-b"]',
    placement: "auto",
    title: "Periodo B",
    content: "Il secondo periodo, quello usato come riferimento (il confronto mostra sempre \"A rispetto a B\").",
  },
  {
    target: '[data-tour="selettore-vista"]',
    placement: "auto",
    title: "Grafico o tabella",
    content: "Stessa informazione, due modi di vederla.",
  },
  {
    target: "body",
    placement: "center",
    title: "Come si legge",
    content:
      "In grafico: ogni barra è la variazione percentuale di A rispetto a B, 0% = nessun cambiamento. In tabella: stessa cosa in numeri, con la differenza assoluta e una freccia ↑↓→.",
  },
];

// ---------------------------------------------------------------------------
// Registra pasto
// ---------------------------------------------------------------------------

export const stepsRegistraPasto: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Registra pasto",
    content: "Da qui registri cosa hai mangiato: un alimento o una ricetta, la quantità, il pasto e il giorno.",
  },
  {
    target: '[data-tour="registra-pasto-giorno-orario"]',
    placement: "auto",
    title: "Giorno e orario",
    content: "Di default oggi e l'ora attuale, entrambi modificabili - puoi registrare anche un giorno passato.",
  },
  {
    target: '[data-tour="registra-pasto-modalita"]',
    placement: "auto",
    title: "Alimento singolo o da ricetta",
    content: "Aggiungi un alimento alla volta, oppure tutti gli ingredienti di una ricetta salvata in un colpo solo, con le quantità già decise.",
  },
  {
    target: '[data-tour="registra-pasto-campi"]',
    placement: "auto",
    title: "I campi obbligatori",
    content: "Pasto, Alimento (o Ricetta) e Quantità sono tutti obbligatori: senza uno dei tre non puoi aggiungere la voce alla lista.",
  },
  {
    target: '[data-tour="registra-pasto-lista"]',
    placement: "auto",
    title: "La lista",
    content:
      "Le voci aggiunte restano in bozza - modificabili o rimovibili con un click - finché non premi Conferma: niente viene scritto nel diario prima di quel momento.",
  },
  {
    target: '[data-tour="registra-pasto-conferma"]',
    placement: "auto",
    title: "Conferma",
    content: "Solo qui viene scritto davvero nel diario: salva le voci nuove ed elimina quelle rimosse dalla lista.",
  },
];

// ---------------------------------------------------------------------------
// Libro degli Alimenti
// ---------------------------------------------------------------------------

export const stepsLibroAlimenti: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Libro degli Alimenti",
    content: "Il catalogo degli alimenti disponibili per registrare i pasti - qui lo cerchi, lo modifichi o ne aggiungi di nuovi.",
  },
  {
    target: '[data-tour="libro-alimenti-cerca"]',
    placement: "auto",
    title: "Cerca",
    content: "Filtra il catalogo per nome. Oltre 20 alimenti, il catalogo si divide automaticamente in più pagine.",
  },
  {
    target: '[data-tour="libro-alimenti-tabella"]',
    placement: "auto",
    title: "Clicca un alimento",
    content: "Per modificarlo o eliminarlo dal catalogo.",
  },
  {
    target: '[data-tour="libro-alimenti-aggiungi"]',
    placement: "auto",
    title: "Aggiungi un alimento",
    content:
      "Nome, Kcal, Proteine, Carboidrati e Grassi sono obbligatori (per 100g o 100ml, a seconda dell'unità che scegli). Zuccheri, grassi saturi, fibre e sale sono facoltativi.",
  },
];

// ---------------------------------------------------------------------------
// Gestione Ricette
// ---------------------------------------------------------------------------

export const stepsGestioneRicette: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Ricette",
    content: "Le tue ricette salvate: combinazioni riusabili di alimenti e quantità, comode per i piatti che prepari spesso.",
  },
  {
    target: '[data-tour="gestione-ricette-cerca"]',
    placement: "auto",
    title: "Cerca",
    content: "Filtra le ricette per nome.",
  },
  {
    target: '[data-tour="gestione-ricette-lista"]',
    placement: "auto",
    title: "Clicca una ricetta",
    content:
      "Per visualizzarne il dettaglio, modificarla o eliminarla. Modificarla o eliminarla non cambia i pasti già registrati con quella ricetta in passato - restano voci indipendenti nel diario.",
  },
  {
    target: '[data-tour="gestione-ricette-aggiungi"]',
    placement: "auto",
    title: "Crea una ricetta",
    content: "Nome obbligatorio, più almeno un ingrediente con alimento e quantità - puoi aggiungerne quanti vuoi.",
  },
];

// ---------------------------------------------------------------------------
// Correlazione Peso - Sforamenti
// ---------------------------------------------------------------------------

export const stepsCorrelazionePesoSforamenti: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Correlazione Peso - Sforamenti",
    content: "Mette in relazione gli sforamenti kcal con l'andamento del peso, per vedere se c'è davvero un legame o no.",
  },
  {
    target: "body",
    placement: "center",
    title: "I colori dei punti",
    content:
      "Ogni punto della linea del peso è colorato in base a quel giorno: rosso se hai sforato le kcal, blu se sei rimasto entro il limite. Un punto piccolo e neutro se quel giorno non aveva un limite calcolabile.",
  },
  {
    target: "body",
    placement: "center",
    title: "Le statistiche sotto",
    content:
      "Sotto il grafico: la variazione media di peso nei giorni successivi a uno sforamento, confrontata con quella dopo un giorno pulito - e una tabella con il dettaglio giorno per giorno.",
  },
];

// ---------------------------------------------------------------------------
// Altri nutrienti per periodo (fibre e sale)
// ---------------------------------------------------------------------------

export const stepsFibreSale: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Altri nutrienti per periodo",
    content: "Andamento di fibre e sale nel tempo, a confronto coi rispettivi limiti - i due nutrienti che restano fuori dai grafici Kcal e Macronutrienti.",
  },
  {
    target: '[data-tour="legenda-Fibre"]',
    placement: "auto",
    title: "Fibre",
    content: "Barra piena: fibre consumate. La linea tratteggiata è il limite - qui, 25g.",
  },
  {
    target: '[data-tour="legenda-Sale"]',
    placement: "auto",
    title: "Sale",
    content: "Barra piena: sale consumato. Limite - qui, 6g.",
  },
  {
    target: '[data-tour="selettore-periodo"]',
    placement: "auto",
    title: "Periodo",
    content: "Giorno, Settimana, Mese o Anno.",
  },
  {
    target: '[data-tour="selettore-istanza"]',
    placement: "auto",
    title: "Istanza",
    content: "Scegli quale porzione di tempo guardare, oppure \"Tutto\" per l'intera cronologia.",
  },
];

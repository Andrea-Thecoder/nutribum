import type { TipoPannello } from "./layoutSchema";

// Spiegazione dettagliata di ciascun tipo di scheda della dashboard, aperta dal bottone "?"
// nell'header di PanelChrome (vedi App.tsx). Concetti già coperti da GlossarioContenuto (BMR, TDEE,
// sforamento, ricette come modello riusabile, ambito di validità di un limite...) non vengono
// ripetuti qui per esteso, solo richiamati - il Glossario resta la fonte per quei termini.
export const INFO_PANNELLI: Record<TipoPannello, string> = {
  calendario:
    "Vista mensile con un pallino colorato per ogni giorno registrato. Segnala a colpo d'occhio gli sforamenti (🔥 kcal, 💪 macronutrienti, 🧂 fibre/sale) e i giorni sotto il limite minimo di kcal (⚠️, o 🆘 se molto sotto). Clicca un giorno per aprirne il dettaglio completo.",
  "kcal-giorno":
    "Andamento delle kcal consumate nel periodo scelto (giorno/settimana/mese/anno), con le linee di riferimento del tuo limite massimo, del limite minimo e del TDEE/BMR stimati dal profilo, quando calcolati invece che manuali. Utile per vedere quanto ti allontani dai tuoi limiti nel tempo, non solo in un giorno isolato.",
  "macro-giorno":
    "Andamento di proteine, carboidrati e grassi nel periodo scelto, con le rispettive linee di limite se impostate. Stesso filtro periodo del grafico kcal, ma indipendente: puoi guardare un periodo diverso su ciascuno dei due.",
  "fibre-sale-giorno":
    "Andamento di fibre e sale nel periodo scelto, con le linee di limite se impostate - stesso pattern dei grafici kcal e macronutrienti, per i due nutrienti che restano fuori da quelli.",
  "top-alimenti":
    "I 10 alimenti che pesano di più sulle kcal totali in un giorno a tua scelta (non un periodo) - utile per capire da dove arrivano davvero le calorie in una giornata specifica.",
  "top-alimenti-frequenza":
    "I 10 alimenti che compaiono più spesso nel diario nel periodo scelto, indipendentemente da quante kcal portano - utile per individuare le abitudini alimentari più ricorrenti, non i picchi calorici.",
  "dettaglio-giorno":
    "Il dettaglio completo di un giorno: ogni pasto (colazione, pranzo, cena...) con gli alimenti registrati, le quantità e il totale rispetto ai limiti in vigore quel giorno. Si apre cliccando un giorno nel Calendario, oppure resta fissato su una data se lo apri come scheda a parte.",
  "registra-pasto":
    "Da qui registri cosa hai mangiato: scegli un alimento o una ricetta, la quantità e il pasto (colazione/pranzo/cena/spuntino). Usare una ricetta ne copia gli ingredienti come voci indipendenti del diario - modificarla dopo non cambia i pasti già registrati (vedi Glossario, \"Ricette\").",
  "libro-alimenti":
    "L'intero catalogo degli alimenti disponibili, con i valori nutrizionali per 100g o 100ml a seconda dell'unità dichiarata per ciascuno (vedi Glossario, \"Unità per 100\"). Da qui cerchi, modifichi o elimini un alimento esistente.",
  "andamento-obiettivi":
    "Lo storico di come sono cambiati nel tempo i tuoi limiti giornalieri (kcal, macronutrienti, fibre, sale). Ogni modifica resta in cronologia con il proprio ambito di validità (vedi Glossario), così il confronto con i giorni passati resta corretto anche se il limite è cambiato nel frattempo.",
  "progresso-obiettivi":
    "Quanto ti avvicini ai tuoi limiti nutrizionali nel periodo scelto, aggregato invece che giorno per giorno - una vista più \"a bilancio\" rispetto al grafico Kcal per periodo.",
  "confronto-periodi":
    "Mette a confronto due periodi diversi (kcal, macronutrienti, fibre, sale o peso) fianco a fianco, in grafico o in tabella - utile per capire se un cambiamento, per esempio una nuova dieta, ha davvero spostato qualcosa rispetto a prima.",
  "peso-corporeo":
    "Il tuo storico di misurazioni di peso corporeo, con l'obiettivo impostato e la proiezione di quando potresti raggiungerlo in base al ritmo osservato finora - non una stima teorica, calcolata sui tuoi dati reali.",
  "andamento-tdee":
    "Come cambia il TDEE stimato nel tempo, in base a peso e profilo (età, altezza, sesso, livello di attività) - utile per capire se il tuo fabbisogno calorico si è spostato, per esempio dopo un cambiamento di peso significativo.",
  "correlazione-peso-sforamenti":
    "Mette in relazione gli sforamenti kcal con l'andamento del peso nello stesso periodo, per vedere se i giorni sforati coincidono davvero con quello che succede sulla bilancia, o se non c'è nessun legame evidente.",
  "gestione-ricette":
    "Le ricette che hai creato: combinazioni riusabili di alimenti e quantità. Sono solo un modello (vedi Glossario, \"Ricette\") - usarle in Registra pasto ne copia gli ingredienti come voci normali del diario, senza nessun collegamento persistente con la ricetta originale.",
};

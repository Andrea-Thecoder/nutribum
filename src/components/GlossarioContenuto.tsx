const VOCI: { termine: string; spiegazione: string }[] = [
  {
    termine: "BMR (metabolismo basale)",
    spiegazione:
      "Le calorie che il corpo consuma a riposo assoluto, solo per le funzioni vitali (respirare, far battere il cuore, ecc.), calcolate dall'app con la formula di Mifflin-St Jeor a partire da età, altezza, sesso e peso attuale. Scendere sotto il BMR per periodi prolungati è considerato un rischio di denutrizione.",
  },
  {
    termine: "TDEE (fabbisogno energetico totale)",
    spiegazione:
      "Il BMR moltiplicato per il livello di attività fisica impostato nel profilo - una stima di quante kcal servono per mantenere il peso attuale, non per perderlo o guadagnarlo. È solo un punto di partenza: il ritmo osservato davvero nel grafico del peso resta il riferimento più onesto.",
  },
  {
    termine: "Limite manuale vs calcolato",
    spiegazione:
      "Per le kcal puoi impostare un limite massimo e uno minimo a mano, oppure spuntare \"Usa TDEE calcolato\"/\"Usa BMR calcolato\" per farli derivare dal profilo. Se imposti un valore manuale, quello ha sempre la priorità: il calcolo automatico interviene solo quando manca un limite manuale.",
  },
  {
    termine: "Sforamento",
    spiegazione:
      "Un giorno in cui le kcal (o un macronutriente/fibre/sale) superano il limite massimo in vigore quel giorno. Segnalato nel calendario con 🔥 (kcal), 💪 (macro) o 🧂 (fibre/sale), e nel banner in alto quando si accumulano più giorni di fila o nel mese.",
  },
  {
    termine: "Sotto il minimo",
    spiegazione:
      "Il rischio opposto allo sforamento: le kcal consumate in un giorno scendono sotto il limite minimo (manuale o BMR calcolato). Segnalato in ambra (⚠️) invece che in rosso, per non confonderlo con lo sforamento.",
  },
  {
    termine: "Unità per 100 (g/ml)",
    spiegazione:
      "Ogni alimento nel catalogo dichiara se i suoi valori nutrizionali sono per 100 grammi o per 100 millilitri - utile per i liquidi (es. olio), la cui etichetta è spesso espressa per 100ml. Nessuna conversione automatica: si registra la quantità nella stessa unità dichiarata dall'alimento.",
  },
  {
    termine: "Ricette",
    spiegazione:
      "Una ricetta è solo un modello riusabile di ingredienti e quantità. Usarla in \"Registra pasto\" copia i suoi ingredienti come normali voci del diario: non c'è nessun collegamento persistente, modificare la ricetta dopo non cambia i pasti già registrati e viceversa.",
  },
  {
    termine: "Ambito di validità",
    spiegazione:
      "Quando salvi un limite, scegli da quando vale: \"Da ora in poi\" (non tocca il passato), \"Sempre\" (vale su tutta la cronologia), oppure fissato su \"Questa settimana\"/\"Questo mese\". Serve a calcolare correttamente quale limite era in vigore in un giorno passato, anche se lo cambi oggi.",
  },
];

export function GlossarioContenuto() {
  return (
    <dl className="flex flex-col gap-3">
      {VOCI.map((v) => (
        <div key={v.termine}>
          <dt className="font-medium text-slate-800 dark:text-slate-100">{v.termine}</dt>
          <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{v.spiegazione}</dd>
        </div>
      ))}
    </dl>
  );
}

# NutriBum

## Cosa fa (in parole semplici)

NutriBum è un programma per il computer che aiuta a tenere sotto controllo cosa si
mangia ogni giorno.

In pratica funziona così:
- Prima si crea un **elenco di alimenti** (es. "Petto di pollo", "Riso", "Olio EVO") con
  i loro valori nutrizionali per 100 grammi o 100 millilitri (calorie, proteine,
  carboidrati, grassi, ecc.) — si possono inserire uno alla volta, importarne tanti
  insieme da un file, oppure salvare delle **ricette** (combinazioni di alimenti) da
  riusare senza ridigitare ogni volta gli stessi ingredienti.
- Ogni giorno si segna cosa si è mangiato, a che pasto e in che quantità: il programma
  calcola da solo quante calorie e nutrienti sono stati consumati, sommando tutto.
- Si possono impostare dei **limiti giornalieri** personali, sia un massimo che un
  minimo (es. "non più di 2000 calorie ma almeno 1500", "non più di 6 grammi di sale al
  giorno") — l'app avvisa visivamente (con un'icona e un colore diverso nel calendario)
  ogni giorno in cui questi limiti vengono superati o non raggiunti, e per quale
  motivo esattamente. Inserendo età, altezza, sesso e livello di attività, l'app può
  anche calcolare da sola dei limiti di riferimento (TDEE/BMR) invece di doverli
  inserire a mano.
- Si può tenere traccia anche del **peso corporeo**, con un obiettivo e una proiezione
  di quando lo si raggiungerà in base al ritmo osservato nelle ultime settimane.
- Un calendario mostra il riepilogo mese per mese, e dei grafici permettono di vedere
  l'andamento nel tempo (calorie, macronutrienti, peso, alimenti più consumati, e come
  cambia il proprio progresso rispetto ai limiti impostati) — compreso un **report PDF**
  scaricabile per un periodo a scelta.
- La disposizione dei grafici sullo schermo è personalizzabile: si possono spostare,
  ridimensionare e organizzare a piacere, come una piccola dashboard personale.

Tutti i dati restano **sul proprio computer** (nessun account, nessun cloud, nessuna
connessione internet richiesta — è una scelta esplicita, l'app non si collega mai a
internet) e possono essere esportati o importati come file di backup in qualsiasi momento.

## Dettagli tecnici

App desktop (Tauri + React + TypeScript) per tracciare kcal e macronutrienti giorno
per giorno: catalogo alimenti, ricette, diario dei pasti, peso corporeo, profilo/TDEE,
obiettivi/limiti giornalieri (massimo e minimo) con avvisi di sforamento, report PDF, e
una dashboard di grafici trascinabili e personalizzabili.

Per il dettaglio di architettura, schema database e stato del progetto vedi
[`../PROGETTO.md`](../PROGETTO.md).

## Sviluppo

```bash
npm install
npm run tauri dev
```

`npm run dev` avvia solo il frontend Vite (senza Tauri) — utile per iterare sulla UI,
ma le funzionalità che dipendono dai plugin Tauri (SQLite, dialog, filesystem) non
funzionano fuori dalla shell nativa.

## Build

```bash
npm run tauri build
```

## Stack

- Tauri 2 (Rust) + React 19 + Vite + TypeScript
- SQLite (`@tauri-apps/plugin-sql`) come storage principale
- Tailwind CSS v4, Recharts, date-fns (locale it), Zod

## Struttura

- `src/` — frontend React (componenti in `components/`, logica in `lib/`)
- `src-tauri/` — shell Tauri (Rust), migrazioni SQL in `src-tauri/migrations/`
- `../esempi-json/`, `../esempi-import-alimenti/` — file di esempio per l'import
  (diario e catalogo alimenti, rispettivamente)

## Installazione (utenti Windows/macOS)

Le build non sono firmate con un certificato a pagamento, quindi il sistema operativo
mostra un avviso alla prima apertura. Non è un virus: è il comportamento normale per
software distribuito fuori dagli store ufficiali (Microsoft Store / App Store) senza
un certificato commerciale.

**Windows** — al primo avvio di `NutriBum_x.y.z_x64-setup.exe` comparirà "Windows ha
protetto il tuo PC":
1. Clicca su **Ulteriori informazioni**
2. Clicca su **Esegui comunque**

**macOS** — al primo avvio comparirà "NutriBum non può essere aperto perché proviene
da uno sviluppatore non identificato":
1. Apri **Preferenze di Sistema → Privacy e Sicurezza**
2. Scorri fino alla sezione Sicurezza e clicca **Apri comunque** accanto a NutriBum
3. Conferma nella finestra di dialogo che appare

**Linux (AppImage)** — va reso eseguibile prima del primo avvio:
```bash
chmod +x NutriBum_x.y.z_amd64.AppImage
./NutriBum_x.y.z_amd64.AppImage
```

## IDE consigliato

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

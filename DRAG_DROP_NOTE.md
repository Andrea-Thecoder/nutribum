# Drag & drop dashboard - note sessione (2026-07-22)

> Riguarda `src/lib/useDragResize.ts`, `App.tsx`, `PanelChrome.tsx`.
> Vedi anche `../PROGETTO.md`, che già segnalava: "drag/resize custom, non la libreria -
> non funzionava su WebKitGTK". Questa sessione conferma quel punto (vedi "Tentativo
> fallito" sotto) e documenta il resto del lavoro fatto sulle prestazioni del drag.

## Stato attuale: accettabile, con un problema noto residuo

Il drag & drop e il resize sono tornati fluidi nella maggior parte dei casi.
Resta un problema aperto: **il movimento in diagonale fa resistenza e ha
micro-scatti interni alla scheda**, mentre il movimento su singolo asse (solo
orizzontale o solo verticale) è pulito. Non risolto in questa sessione - vedi
"Problema aperto" in fondo per le piste da provare.

## Percorso seguito in questa sessione

Punto di partenza: scatti pesanti durante il trascinamento/ridimensionamento dei
pannelli della dashboard (app Tauri, webview WebKitGTK su Linux).

1. **Memoizzazione dei pannelli** (`React.memo` su tutti i grafici Recharts e sui
   pannelli pesanti + `useCallback` sulle callback passate come prop). Riduce il
   *costo* di ogni render, ma non il *numero* di render - primo miglioramento ma
   non risolutivo da solo.

2. **Semplificazione CSS durante il gesto** (`PanelChrome.tsx`, prop
   `inMovimento`): ombra e angoli arrotondati vengono tolti su **tutti** i pannelli
   (non solo quello trascinato) finché un drag/resize è attivo, perché WebKitGTK è
   lento a ricomporre `box-shadow` + clip-mask di un bordo arrotondato ad ogni frame
   di un elemento in transform - anche sui pannelli *sottostanti* quando qualcosa ci
   passa sopra. `overflow-hidden` resta invece sempre attivo (un clip rettangolare
   piatto è economico) per evitare che il contenuto sporga durante il gesto.

3. **`will-change: transform`** sul pannello effettivamente in movimento, per
   suggerire al motore di promuoverlo a un livello di composizione GPU proprio
   invece di ridipingerne il contenuto (es. l'SVG di un grafico) ad ogni frame.

4. **Matematica colonna/riga corretta** in `useDragResize.ts`: il calcolo della
   larghezza di colonna doveva sottrarre i margini tra pannelli esattamente come fa
   `calcGridColWidth`/`calcGridItemPosition` di react-grid-layout internamente
   (`colWidth = (larghezzaContenitore - MARGIN*(COLS-1) - MARGIN*2) / COLS`, passo
   reale per colonna = `colWidth + MARGIN`). Senza, la scheda trascinata perdeva
   progressivamente il passo col cursore (i due calcoli - il nostro e quello della
   libreria - divergevano sempre di più muovendosi).

5. **Compensazione dello scroll durante il gesto**: se scrolli con la rotellina
   mentre trascini, il contenuto si sposta sotto un cursore che in coordinate di
   viewport non si è mosso. Fix: un listener sull'evento `scroll` del contenitore
   (non una lettura sincrona di `scrollTop` dentro il gestore di `mousemove` - quel
   primo tentativo causava un ciclo scrivi→leggi→scrivi ("layout thrashing") che
   produceva un tremolio ben peggiore del problema che doveva risolvere). Copre
   anche il caso "rotellina ferma, mouse fermo" (nessun `mousemove` scatterebbe).

6. **`requestAnimationFrame` per limitare gli update**: provato **due volte**,
   in due momenti diversi e in combinazioni diverse con le altre fix, ed **entrambe
   le volte ha peggiorato la fluidità percepita** invece di migliorarla. Conclusione:
   in questo ambiente Tauri/WebKitGTK, rimandare l'aggiornamento al frame successivo
   introduce più latenza/irregolarità di quanta ne risparmi. **Rimosso definitivamente**
   - ogni `mousemove`/`scroll` aggiorna lo stato subito, in modo sincrono.

## Tentativo fallito: drag/resize nativo di react-grid-layout

Per eliminare l'implementazione a mano, si è provato a passare al meccanismo
nativo della libreria (`dragConfig`/`resizeConfig` abilitati, `onDragStop`/
`onResizeStop` per persistere la posizione finale, maniglie di resize custom via
`resizeConfig.handleComponent`). **Risultato: drag e resize completamente non
funzionanti** (nessuna delle due interazioni rispondeva più). Non è stato possibile
diagnosticare la causa esatta in un ambiente senza possibilità di test visivo diretto
nell'app Tauri. Il tentativo è stato scartato e il codice riportato esattamente allo
stato precedente (build con hash identico verificato). **Non riprovare senza un modo
di testare visivamente dentro l'app** - vedi anche la nota già presente in
`PROGETTO.md` che segnalava questo stesso limite.

## Problema aperto: resistenza/scattini nel movimento diagonale

Il movimento su un solo asse (orizzontale o verticale) è pulito. Il movimento in
diagonale fa resistenza e ha micro-scatti interni alla scheda trascinata. Cause
plausibili non ancora verificate:

- Il ricalcolo di `dCols`/`dRows` avviene indipendentemente sui due assi
  (`ricalcola()` in `useDragResize.ts`) - in diagonale entrambi cambiano ad ogni
  evento, il doppio del lavoro per singolo `mousemove` rispetto a un asse solo.
- Possibile interazione tra il transform CSS 2D (traslazione simultanea su X e Y)
  e le prestazioni di compositing di WebKitGTK, già causa di diversi problemi
  simili in questa sessione (vedi punti 2-3 sopra) - una traslazione diagonale
  copre più superficie di schermo per frame a parità di velocità percepita
  (distanza euclidea maggiore della componente su un singolo asse), quindi più
  area da ricomporre.
- Non ancora escluso un problema nel calcolo stesso (es. arrotondamenti indipendenti
  su X/Y con "scatta alla griglia" attivo - ma il problema persiste anche in
  "Movimento libero", quindi non sembra essere solo quello).

Non affrontato in questa sessione per limiti di tempo/pazienza residua nella
conversazione. Prossimi passi suggeriti: profiling reale nell'app (devtools del
webview, se accessibili) durante un trascinamento diagonale, per capire se il
costo è nel calcolo JS o nel compositing del browser.

## Sessione 2026-08-24: caccia sistematica alla causa, nessuna trovata

Ripresa dell'indagine con test reali (non solo lettura del codice), grazie a un
metodo di strumentazione temporanea riusabile: `performance.now()`/`requestAnimationFrame`
iniettati in `useDragResize.ts`/`App.tsx`/`PanelChrome.tsx` per loggare timing ed
eventi su file (`@tauri-apps/plugin-fs`, cartella AppData), drag sintetici via
`python-xlib`/XTest (nessun bisogno di `xdotool`/sudo - `python-xlib` è già
disponibile di sistema), sempre seguiti da `git checkout` sui file toccati a fine
test. Utile da riusare in futuro per lo stesso genere di indagine.

Sette ipotesi verificate, **tutte escluse** (nessuna mostra una differenza
sistematica assiale/diagonale):

1. **Costo di calcolo JS** (`ricalcola()` in `useDragResize.ts`): tempo di
   gestione di ogni evento `mousemove` identico (~20ms medio) sia in assiale
   che in diagonale - il codice fa lo stesso lavoro in entrambi i casi,
   indipendentemente dalla direzione.
2. **Peso del contenuto del pannello**: pannello leggero (`registra-pasto`,
   form) vs pesante (`correlazione-peso-sforamenti`, grafico Recharts) -
   frame-rate praticamente identico trascinando in diagonale entrambi, in
   più run separati. `will-change: transform` sembra promuovere correttamente
   il pannello a un layer GPU indipendente: il motore sposta una texture già
   renderizzata, il contenuto non incide sul costo per frame.
3. **Renderer WebKitGTK** (`WEBKIT_DISABLE_DMABUF_RENDERER=1` e
   `WEBKIT_DISABLE_COMPOSITING_MODE=1`, testati con l'ambiente reale - GPU
   AMD/amdgpu, non NVIDIA): nessun miglioramento; un run con DMABUF disabilitato
   ha prodotto il *peggior* risultato misurato in tutta l'indagine (18% di
   frame lenti). Entrambe le variabili inoltre disaccoppiano `requestAnimationFrame`
   dal vero refresh dello schermo (frame-rate quasi raddoppiato in modo
   sospetto) - segno che il rendering passa a un percorso non accelerato, non
   un miglioramento genuino.
4. **Cadenza dei frame con drag umano reale** (non solo sintetico): due drag
   separati e puliti (uno assiale, uno diagonale) su un campione ampio (734 e
   189 campioni) - 3.1% vs 3.2% di frame lenti, nessuna differenza. Un primo
   drag umano misto/lungo (13s) aveva mostrato picchi fino a 73-77ms (più
   severi del sintetico), confermando che il test sintetico *sottostima* il
   problema reale, ma senza dati di posizione non era possibile isolare la
   diagonale come causa - da qui il test separato.
5. **Ritardo input→frame** ("resistenza" come possibile scarto di posizione,
   non solo scatti di frame-rate): tasso di eventi `mousemove` (56-69/s) e
   ritardo tra ultimo evento reale e frame disegnato (5-7ms medio, mai sopra i
   19ms) identici tra assiale e diagonale. Nessuna "posizione che invecchia".
6. **Anti-tearing del driver GPU** (`xrandr --set TearFree off`, sistema con
   GPU AMD, desktop Cinnamon/Muffin su X11): nessuna differenza percepita
   dall'utente durante il drag reale. Ripristinato ad `auto`.
7. **Accelerazione del puntatore** (`libinput Accel Profile Enabled`, adaptive
   vs flat sul mouse fisico - Trust GXT): passare a `flat` ha reso la
   sensazione **peggiore**, non migliore - se la curva di accelerazione fosse
   la causa, rimuoverla avrebbe dovuto aiutare o essere neutro. Ripristinato
   ad adaptive.

**Conclusione**: il problema è confermato reale (l'utente lo percepisce ancora,
"resistenza fisica" + "scatta come se laggasse", anche dopo tutte le mitigazioni
sopra), ma la causa resta elusiva a ogni livello dello stack verificabile da
JavaScript o da impostazioni di sistema riflesse. Ipotesi rimaste plausibili ma
non testabili con gli strumenti disponibili in questa sessione (nessun accesso
a profiling GPU/compositor reale, nessun test visivo diretto):

- Un problema di compositing a un livello ancora più basso (driver kernel/DRM),
  invisibile sia a `requestAnimationFrame` che alle impostazioni xrandr/libinput
  toccate qui.
- Qualcosa di specifico all'hardware del mouse (Trust GXT) non esposto dalle
  proprietà standard di libinput controllate.

**Deciso**: non investigare oltre per ora (nessuna pista rimasta senza
strumenti di profiling reali), non applicare fix di codice "alla cieca" senza
una causa confermata (rischio di aggiungere complessità per un beneficio
incerto). Il problema resta com'è, documentato, in attesa di un modo di fare
profiling visivo diretto nell'app o di un'idea nuova.

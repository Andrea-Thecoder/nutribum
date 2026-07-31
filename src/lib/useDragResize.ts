import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import { dimensioneMinima, type Pannello } from "./layoutSchema";
import { COLS, ROW_HEIGHT, MARGIN } from "./gridConstants";

// Lato/angolo da cui si trascina il ridimensionamento. "e"/"s" (e la combinazione "se", storica)
// spostano solo w/h con x/y fissi; "w"/"n" spostano anche x/y mantenendo fisso il bordo opposto.
export type DirezioneResize = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function useDragResize(
  pannelli: Pannello[],
  setPannelli: (updater: (prev: Pannello[]) => Pannello[]) => void,
  larghezzaContenitore: number,
  onCommit: (pannelli: Pannello[]) => void,
  ancorataAllaGriglia: boolean,
  onInizioMovimento: (id: string) => void,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  // Deve rispecchiare esattamente calcGridColWidth/calcGridItemPosition della libreria (containerWidth
  // meno i margini tra colonne e il padding del contenitore, quest'ultimo di default uguale a MARGIN
  // quando non specificato in gridConfig - vedi effectiveContainerPadding nella libreria), altrimenti
  // "quanti pixel vale una colonna" per noi e per lei divergono e la scheda trascinata perde
  // progressivamente il passo col mouse man mano che ci si sposta.
  const colWidth = (larghezzaContenitore - MARGIN[0] * (COLS - 1) - MARGIN[0] * 2) / COLS;
  const colStepPx = colWidth + MARGIN[0];
  const rowStepPx = ROW_HEIGHT + MARGIN[1];

  // Con ancorataAllaGriglia=true il pannello scatta a step interi di colonna/riga ad ogni
  // movimento (sistema storico). Con false segue il mouse pixel per pixel durante il movimento,
  // per un trascinamento fluido. In entrambi i casi, al rilascio i delta finali vengono
  // arrotondati alla cella di griglia più vicina, così posizione/dimensione salvate restano
  // numeri interi come il resto del sistema (persistenza, calcolo delle posizioni libere) si aspetta.
  function segui(
    onMove: (dCols: number, dRows: number) => void,
    onFine: (dCols: number, dRows: number) => void,
    e: ReactMouseEvent,
  ) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let clientXCorrente = startX;
    let clientYCorrente = startY;
    let dColsCorrente = 0;
    let dRowsCorrente = 0;

    // Il pannello è posizionato in coordinate del contenuto scrollabile, il mouse in coordinate di
    // viewport: se scrolli con la rotellina mentre trascini, il contenuto si sposta sotto un
    // cursore che (in coordinate di viewport) non si è mosso - va sommato quanto è scorso il
    // contenitore, altrimenti la scheda si stacca dal cursore nella direzione dello scroll.
    // Il valore aggiornato arriva dall'evento "scroll" del contenitore stesso (non da una lettura
    // sincrona di scrollTop dentro handleMove ad ogni mousemove: quella causava un ciclo
    // scrivi-leggi-scrivi che generava un vero e proprio tremolio, molto peggio del disallineamento
    // che doveva risolvere).
    const contenitore = containerRef.current;
    const scrollTopIniziale = contenitore?.scrollTop ?? 0;
    const scrollLeftIniziale = contenitore?.scrollLeft ?? 0;
    let scrollTopCorrente = scrollTopIniziale;
    let scrollLeftCorrente = scrollLeftIniziale;

    // NIENTE throttling a requestAnimationFrame: provato due volte (da solo e insieme ad altre
    // fix), ed entrambe le volte ha peggiorato la fluidità percepita invece di migliorarla - in
    // questo ambiente Tauri/WebKitGTK rimandare l'update al frame successivo introduce più
    // latenza/irregolarità di quanta ne risparmi. Ogni mousemove/scroll aggiorna subito, sincrono.
    function ricalcola() {
      dColsCorrente = (clientXCorrente - startX + (scrollLeftCorrente - scrollLeftIniziale)) / colStepPx;
      dRowsCorrente = (clientYCorrente - startY + (scrollTopCorrente - scrollTopIniziale)) / rowStepPx;
      onMove(
        ancorataAllaGriglia ? Math.round(dColsCorrente) : dColsCorrente,
        ancorataAllaGriglia ? Math.round(dRowsCorrente) : dRowsCorrente,
      );
    }
    function handleMove(ev: globalThis.MouseEvent) {
      clientXCorrente = ev.clientX;
      clientYCorrente = ev.clientY;
      ricalcola();
    }
    // Con la rotellina ferma sul mouse non scatta nessun mousemove (il cursore non si sposta in
    // coordinate di viewport): senza questo listener la scheda resterebbe ferma finché il mouse non
    // si muove di nuovo, anche se nel frattempo il contenitore ha scorso parecchio.
    function handleScroll() {
      if (!contenitore) return;
      scrollTopCorrente = contenitore.scrollTop;
      scrollLeftCorrente = contenitore.scrollLeft;
      ricalcola();
    }
    function handleUp() {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      contenitore?.removeEventListener("scroll", handleScroll);
      onFine(Math.round(dColsCorrente), Math.round(dRowsCorrente));
    }
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    contenitore?.addEventListener("scroll", handleScroll);
  }

  function iniziaDrag(id: string, e: ReactMouseEvent) {
    const pannello = pannelli.find((p) => p.id === id);
    if (!pannello) return;
    onInizioMovimento(id);
    const { x: startX, y: startY, w } = pannello;

    function applica(dCols: number, dRows: number) {
      return (prev: Pannello[]) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                x: Math.max(0, Math.min(COLS - w, startX + dCols)),
                y: Math.max(0, startY + dRows),
              }
            : p,
        );
    }

    segui(
      (dCols, dRows) => setPannelli(applica(dCols, dRows)),
      (dCols, dRows) =>
        setPannelli((prev) => {
          const aggiornati = applica(dCols, dRows)(prev);
          onCommit(aggiornati);
          return aggiornati;
        }),
      e,
    );
  }

  function iniziaResize(id: string, e: ReactMouseEvent, direzione: DirezioneResize = "se") {
    const pannello = pannelli.find((p) => p.id === id);
    if (!pannello) return;
    onInizioMovimento(id);
    const { x: startX, y: startY, w: startW, h: startH } = pannello;
    const { w: minW, h: minH } = dimensioneMinima(pannello.tipo);
    const usaEst = direzione.includes("e");
    const usaOvest = direzione.includes("w");
    const usaSud = direzione.includes("s");
    const usaNord = direzione.includes("n");

    function applica(dCols: number, dRows: number) {
      return (prev: Pannello[]) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          let x = startX;
          let y = startY;
          let w = startW;
          let h = startH;

          if (usaEst) {
            w = Math.max(minW, Math.min(COLS - startX, startW + dCols));
          }
          if (usaOvest) {
            // Il bordo destro resta fisso: si sposta solo x, w si adegua di conseguenza.
            const bordoDestro = startX + startW;
            x = Math.max(0, Math.min(bordoDestro - minW, startX + dCols));
            w = bordoDestro - x;
          }
          if (usaSud) {
            h = Math.max(minH, startH + dRows);
          }
          if (usaNord) {
            // Il bordo inferiore resta fisso: si sposta solo y, h si adegua di conseguenza.
            const bordoInferiore = startY + startH;
            y = Math.max(0, Math.min(bordoInferiore - minH, startY + dRows));
            h = bordoInferiore - y;
          }

          return { ...p, x, y, w, h };
        });
    }

    segui(
      (dCols, dRows) => setPannelli(applica(dCols, dRows)),
      (dCols, dRows) =>
        setPannelli((prev) => {
          const aggiornati = applica(dCols, dRows)(prev);
          onCommit(aggiornati);
          return aggiornati;
        }),
      e,
    );
  }

  return { iniziaDrag, iniziaResize };
}

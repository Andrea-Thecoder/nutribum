import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";

// Aspetta un tot di frame extra dopo che l'SVG ha una larghezza reale: anche con le animazioni di
// Recharts disattivate (vedi isAnimationActive={false} in GraficiReport.tsx, altrimenti barre/linee
// catturate a metà della loro animazione di ingresso risultano vuote), il commit del DOM e il paint
// effettivo non sono garantiti nello stesso frame in cui ResizeObserver riporta le dimensioni.
const FRAME_EXTRA_DOPO_SVG = 3;

// Aspetta che Recharts abbia disegnato l'<svg> con dimensioni reali: ResponsiveContainer usa un
// ResizeObserver interno che scatta in modo asincrono anche quando il contenitore ha già una
// dimensione fissa in px — non basta il mount sincrono, serve un polling a frame per non catturare
// un SVG ancora a larghezza 0.
function attendiSvg(host: HTMLElement, tentativiMax = 60): Promise<SVGSVGElement | null> {
  return new Promise((resolve) => {
    let tentativi = 0;
    let extraRimanenti = FRAME_EXTRA_DOPO_SVG;
    function controlla() {
      const svg = host.querySelector("svg");
      if (svg && svg.getBoundingClientRect().width > 0) {
        if (extraRimanenti > 0) {
          extraRimanenti--;
          requestAnimationFrame(controlla);
          return;
        }
        resolve(svg as SVGSVGElement);
        return;
      }
      tentativi++;
      if (tentativi >= tentativiMax) {
        resolve(null);
        return;
      }
      requestAnimationFrame(controlla);
    }
    requestAnimationFrame(controlla);
  });
}

async function svgAPng(svg: SVGSVGElement, larghezzaPx: number, altezzaPx: number, scala = 2): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(larghezzaPx));
  clone.setAttribute("height", String(altezzaPx));
  const svgString = new XMLSerializer().serializeToString(clone);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Impossibile caricare l'SVG del grafico come immagine"));
    img.src = svgDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = larghezzaPx * scala;
  canvas.height = altezzaPx * scala;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d non disponibile");
  // Sfondo bianco esplicito: l'SVG di Recharts non ha un rettangolo di fondo proprio, un PDF senza
  // questo riquadro avrebbe il grafico su fondo trasparente (che react-pdf renderizza nero).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scala, scala);
  ctx.drawImage(img, 0, 0, larghezzaPx, altezzaPx);
  return canvas.toDataURL("image/png");
}

// Monta il grafico React passato in un contenitore fuori schermo (non display:none, altrimenti
// ResponsiveContainer misurerebbe 0x0) con dimensioni fisse in px, aspetta che Recharts disegni,
// cattura l'SVG risultante come PNG, poi smonta e rimuove il contenitore. Ritorna null se l'SVG non
// compare in tempo (es. il grafico non ha dati e ritorna un messaggio testuale invece che un <svg>).
export async function catturaGraficoComePng(
  elemento: ReactElement,
  larghezzaPx: number,
  altezzaPx: number,
): Promise<string | null> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = `${larghezzaPx}px`;
  host.style.height = `${altezzaPx}px`;
  host.style.background = "#ffffff";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(elemento);

  try {
    const svg = await attendiSvg(host);
    if (!svg) return null;
    return await svgAPng(svg, larghezzaPx, altezzaPx);
  } finally {
    root.unmount();
    host.remove();
  }
}

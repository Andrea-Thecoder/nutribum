import { useEffect, useState } from "react";

// Il valore di ritorno viene letto live da matchMedia ad ogni render (non da uno stato catturato
// una tantum al mount): su Tauri/WebKitGTK-Linux il valore iniziale di matchMedia può risultare
// sbagliato per un componente montato in un momento diverso dall'avvio dell'app, restando poi
// "congelato" finché non scatta un evento "change" - che su questa piattaforma non è affidabile al
// 100%. Rileggere ad ogni render è economico e si autocorregge da solo al prossimo giro di render.
export function useIsDarkMode(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const [, forzaRender] = useState(0);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = () => forzaRender((n) => n + 1);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return window.matchMedia(query).matches;
}

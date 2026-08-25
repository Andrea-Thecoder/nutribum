import { useEffect, useState } from "react";

// Il valore di ritorno viene letto live dalla classe "dark" su <html> ad ogni render (non da uno
// stato catturato una tantum al mount): App.tsx la applica/rimuove in base al tema scelto nelle
// impostazioni (chiaro/scuro/sistema, vedi lib/settings.ts) - qui non si ridecide nulla, si legge
// solo il risultato già risolto, unica fonte di verità condivisa da questo hook e da Tailwind
// (dark:, vedi @custom-variant in App.css). Un MutationObserver forza un re-render quando la
// classe cambia, che sia per una scelta manuale o per un cambio del tema di sistema mentre
// l'impostazione è su "sistema".
export function useIsDarkMode(): boolean {
  const [, forzaRender] = useState(0);

  useEffect(() => {
    const radice = document.documentElement;
    const observer = new MutationObserver(() => forzaRender((n) => n + 1));
    observer.observe(radice, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return document.documentElement.classList.contains("dark");
}

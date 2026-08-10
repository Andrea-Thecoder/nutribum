import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(cleanup);

// jsdom non implementa scrollIntoView (usato da SelettorePersonalizzato per seguire l'opzione
// evidenziata): senza uno stub, ogni componente che lo chiama in un useEffect fa fallire il test.
// Guardia su typeof Element perché questo setup file gira anche per i test con @vitest-environment
// node (le integration test su SQLite), dove non esiste alcun DOM.
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom non implementa matchMedia (usato da useIsDarkMode in tutti i pannelli con grafico): senza
// uno stub, ogni componente che lo chiama in render fa fallire il test. Riporta sempre "chiaro"
// (matches:false) - i test che hanno bisogno di dark mode possono sovrascrivere il mock localmente.
if (typeof window !== "undefined") {
  window.matchMedia ??= (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

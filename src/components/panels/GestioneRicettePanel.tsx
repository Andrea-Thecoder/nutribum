import { memo, useState } from "react";
import type { AlimentoCatalogo } from "../../lib/food";
import { eliminaRicetta, type RicettaConIngredienti } from "../../lib/recipes";
import { RicettaFormModal } from "../RicettaFormModal";
import { EsitoPopup } from "../EsitoPopup";
import { useConferma } from "../ConfermaModal";

interface GestioneRicettePanelProps {
  ricette: RicettaConIngredienti[];
  alimenti: AlimentoCatalogo[];
  onCambiato: () => void;
}

const CAMPO =
  "rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export const GestioneRicettePanel = memo(function GestioneRicettePanel({
  ricette,
  alimenti,
  onCambiato,
}: GestioneRicettePanelProps) {
  const [filtro, setFiltro] = useState("");
  const [ricettaModifica, setRicettaModifica] = useState<RicettaConIngredienti | null>(null);
  const [nuovaRicettaAperta, setNuovaRicettaAperta] = useState(false);
  const [erroreEliminazione, setErroreEliminazione] = useState<string | null>(null);
  const { chiedi, elemento: modaleConferma } = useConferma();

  const filtrate = ricette.filter((r) => r.nome.toLowerCase().includes(filtro.trim().toLowerCase()));

  async function gestisciElimina(ricetta: RicettaConIngredienti) {
    const ok = await chiedi(`Eliminare la ricetta "${ricetta.nome}"? I pasti già registrati non vengono toccati.`, {
      distruttivo: true,
    });
    if (!ok) return;
    try {
      await eliminaRicetta(ricetta.id);
      onCambiato();
    } catch (err) {
      setErroreEliminazione(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      {modaleConferma}
      {erroreEliminazione && (
        <EsitoPopup tipo="errore" messaggio={erroreEliminazione} onChiudi={() => setErroreEliminazione(null)} />
      )}
      {ricettaModifica && (
        <RicettaFormModal
          ricetta={ricettaModifica}
          alimenti={alimenti}
          onChiudi={() => setRicettaModifica(null)}
          onSalvato={onCambiato}
        />
      )}
      {nuovaRicettaAperta && (
        <RicettaFormModal alimenti={alimenti} onChiudi={() => setNuovaRicettaAperta(false)} onSalvato={onCambiato} />
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Cerca ricetta…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className={CAMPO + " flex-1"}
        />
        <button
          onClick={() => setNuovaRicettaAperta(true)}
          disabled={alimenti.length === 0}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          title={alimenti.length === 0 ? "Serve almeno un alimento nel catalogo per creare una ricetta" : undefined}
        >
          + Nuova ricetta
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {filtrate.length === 0 ? (
          <p className="py-4 text-center text-slate-400 dark:text-slate-500">
            {ricette.length === 0 ? "Nessuna ricetta creata ancora." : "Nessuna ricetta trovata."}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtrate.map((r) => (
              <div
                key={r.id}
                onClick={() => setRicettaModifica(r)}
                className="cursor-pointer rounded border border-slate-200 px-2 py-1.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{r.nome}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      gestisciElimina(r);
                    }}
                    className="shrink-0 rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    title="Elimina"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {r.ingredienti.map((i) => `${i.nomeAlimento} (${i.quantita}${i.unita})`).join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-slate-400 dark:text-slate-500">
        {filtrate.length} ricett{filtrate.length === 1 ? "a" : "e"}
        {filtro && ` (su ${ricette.length} totali)`}
      </div>
    </div>
  );
});

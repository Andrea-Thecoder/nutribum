import { memo, useMemo, useState } from "react";
import { calcolaValoriPorzione, type AlimentoCatalogo } from "../../lib/food";
import { eliminaRicetta, type RicettaConIngredienti } from "../../lib/recipes";
import { RicettaFormModal } from "../RicettaFormModal";
import { AzioniRicettaModal } from "../AzioniRicettaModal";
import { InfoModal } from "../InfoModal";
import { TooltipVeloce } from "../TooltipVeloce";
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
  const [azioneRicetta, setAzioneRicetta] = useState<RicettaConIngredienti | null>(null);
  const [visualizzaRicetta, setVisualizzaRicetta] = useState<RicettaConIngredienti | null>(null);
  const [ricettaModifica, setRicettaModifica] = useState<RicettaConIngredienti | null>(null);
  const [nuovaRicettaAperta, setNuovaRicettaAperta] = useState(false);
  const [erroreEliminazione, setErroreEliminazione] = useState<string | null>(null);
  const { chiedi, elemento: modaleConferma } = useConferma();

  const filtrate = ricette.filter((r) => r.nome.toLowerCase().includes(filtro.trim().toLowerCase()));

  const alimentiPerId = useMemo(() => new Map(alimenti.map((a) => [a.id, a])), [alimenti]);

  // Kcal e macro (compresi i nutrienti secondari, es. fibre/sale, non sempre noti per ogni
  // alimento) non sono già salvati sulla ricetta (solo alimentoId + quantità, vedi recipes.ts):
  // si ricalcolano al volo dal catalogo corrente, coerente con "nessun collegamento persistente" -
  // se cambi i valori di un alimento, il totale qui segue quello attuale.
  function dettagliIngredienti(ricetta: RicettaConIngredienti) {
    return ricetta.ingredienti.map((i) => {
      const alimento = alimentiPerId.get(i.alimentoId);
      const v = alimento
        ? calcolaValoriPorzione(alimento, i.quantita)
        : {
            kcal: 0,
            proteineG: 0,
            carboidratiG: 0,
            grassiG: 0,
            zuccheriG: null,
            grassiSaturiG: null,
            fibreG: null,
            saleG: null,
          };
      return { ...i, ...v };
    });
  }

  // Nullable perché non ogni alimento ha il dato (es. le fibre non sono obbligatorie in
  // AlimentoCatalogo): null solo se NESSUN ingrediente lo dichiara, altrimenti somma quello che
  // c'è, coerente con come "-" viene mostrato per singolo alimento in LibroAlimentiPanel.
  function sommaNullable(a: number | null, b: number | null): number | null {
    if (a === null && b === null) return null;
    return (a ?? 0) + (b ?? 0);
  }

  function totaliRicetta(ricetta: RicettaConIngredienti) {
    return dettagliIngredienti(ricetta).reduce(
      (tot, i) => ({
        kcal: tot.kcal + i.kcal,
        proteineG: tot.proteineG + i.proteineG,
        carboidratiG: tot.carboidratiG + i.carboidratiG,
        grassiG: tot.grassiG + i.grassiG,
        zuccheriG: sommaNullable(tot.zuccheriG, i.zuccheriG),
        grassiSaturiG: sommaNullable(tot.grassiSaturiG, i.grassiSaturiG),
        fibreG: sommaNullable(tot.fibreG, i.fibreG),
        saleG: sommaNullable(tot.saleG, i.saleG),
      }),
      {
        kcal: 0,
        proteineG: 0,
        carboidratiG: 0,
        grassiG: 0,
        zuccheriG: null as number | null,
        grassiSaturiG: null as number | null,
        fibreG: null as number | null,
        saleG: null as number | null,
      },
    );
  }

  function valore(v: number | null): string {
    return v === null ? "-" : v.toFixed(1);
  }

  function righeTooltipTotale(ricetta: RicettaConIngredienti): string[] {
    const t = totaliRicetta(ricetta);
    return [
      `Kcal: ${Math.round(t.kcal)}`,
      `Proteine: ${t.proteineG.toFixed(1)}g`,
      `Carboidrati: ${t.carboidratiG.toFixed(1)}g`,
      `Grassi: ${t.grassiG.toFixed(1)}g`,
      `Zuccheri: ${valore(t.zuccheriG)}${t.zuccheriG === null ? "" : "g"}`,
      `Grassi saturi: ${valore(t.grassiSaturiG)}${t.grassiSaturiG === null ? "" : "g"}`,
      `Fibre: ${valore(t.fibreG)}${t.fibreG === null ? "" : "g"}`,
      `Sale: ${valore(t.saleG)}${t.saleG === null ? "" : "g"}`,
    ];
  }

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
      {azioneRicetta && (
        <AzioniRicettaModal
          ricetta={azioneRicetta}
          onChiudi={() => setAzioneRicetta(null)}
          onVisualizza={() => {
            setVisualizzaRicetta(azioneRicetta);
            setAzioneRicetta(null);
          }}
          onModifica={() => {
            setRicettaModifica(azioneRicetta);
            setAzioneRicetta(null);
          }}
          onElimina={() => {
            setAzioneRicetta(null);
            gestisciElimina(azioneRicetta);
          }}
        />
      )}
      {visualizzaRicetta && (
        <InfoModal
          titolo={visualizzaRicetta.nome}
          onChiudi={() => setVisualizzaRicetta(null)}
          larghezzaClasse="max-w-3xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-2 py-1.5 font-medium">Alimento</th>
                  <th className="px-2 py-1.5 text-right font-medium">Quantità</th>
                  <th className="px-2 py-1.5 text-right font-medium">Kcal</th>
                  <th className="px-2 py-1.5 text-right font-medium">Prot.</th>
                  <th className="px-2 py-1.5 text-right font-medium">Carb.</th>
                  <th className="px-2 py-1.5 text-right font-medium">Grassi</th>
                  <th className="px-2 py-1.5 text-right font-medium">Zucch.</th>
                  <th className="px-2 py-1.5 text-right font-medium">Sat.</th>
                  <th className="px-2 py-1.5 text-right font-medium">Fibre</th>
                  <th className="px-2 py-1.5 text-right font-medium">Sale</th>
                </tr>
              </thead>
              <tbody>
                {dettagliIngredienti(visualizzaRicetta).map((i) => (
                  <tr
                    key={i.alimentoId}
                    className="border-b border-slate-100 odd:bg-slate-50 dark:border-slate-800 dark:odd:bg-slate-800/40"
                  >
                    <td className="px-2 py-1.5">{i.nomeAlimento}</td>
                    <td className="px-2 py-1.5 text-right">
                      {i.quantita}
                      {i.unita}
                    </td>
                    <td className="px-2 py-1.5 text-right">{Math.round(i.kcal)}</td>
                    <td className="px-2 py-1.5 text-right">{i.proteineG.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right">{i.carboidratiG.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right">{i.grassiG.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right">{valore(i.zuccheriG)}</td>
                    <td className="px-2 py-1.5 text-right">{valore(i.grassiSaturiG)}</td>
                    <td className="px-2 py-1.5 text-right">{valore(i.fibreG)}</td>
                    <td className="px-2 py-1.5 text-right">{valore(i.saleG)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {(() => {
                  const t = totaliRicetta(visualizzaRicetta);
                  return (
                    <tr className="border-t-2 border-slate-300 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100">
                      <td className="px-2 pt-1.5">Totale</td>
                      <td className="px-2 pt-1.5"></td>
                      <td className="px-2 pt-1.5 text-right">{Math.round(t.kcal)}</td>
                      <td className="px-2 pt-1.5 text-right">{t.proteineG.toFixed(1)}</td>
                      <td className="px-2 pt-1.5 text-right">{t.carboidratiG.toFixed(1)}</td>
                      <td className="px-2 pt-1.5 text-right">{t.grassiG.toFixed(1)}</td>
                      <td className="px-2 pt-1.5 text-right">{valore(t.zuccheriG)}</td>
                      <td className="px-2 pt-1.5 text-right">{valore(t.grassiSaturiG)}</td>
                      <td className="px-2 pt-1.5 text-right">{valore(t.fibreG)}</td>
                      <td className="px-2 pt-1.5 text-right">{valore(t.saleG)}</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </InfoModal>
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
                onClick={() => setAzioneRicetta(r)}
                className="cursor-pointer rounded border border-slate-200 px-2 py-1.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <span className="block truncate font-medium text-slate-700 dark:text-slate-200">{r.nome}</span>
                <TooltipVeloce
                  contenuto={
                    <>
                      <div className="mb-1 border-b border-slate-200 pb-1 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100">
                        {r.nome}
                      </div>
                      {righeTooltipTotale(r).map((riga) => (
                        <div key={riga}>{riga}</div>
                      ))}
                    </>
                  }
                >
                  <div className="text-slate-500 dark:text-slate-400">
                    {r.ingredienti.map((i) => `${i.nomeAlimento} (${i.quantita}${i.unita})`).join(", ")}
                  </div>
                </TooltipVeloce>
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

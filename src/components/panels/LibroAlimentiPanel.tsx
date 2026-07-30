import { memo, useState } from "react";
import { eliminaAlimento, type AlimentoCatalogo } from "../../lib/food";
import { AzioniAlimentoModal } from "../AzioniAlimentoModal";
import { AlimentoFormModal } from "../AlimentoFormModal";
import { EsitoPopup } from "../EsitoPopup";
import { useConferma } from "../ConfermaModal";

interface LibroAlimentiPanelProps {
  alimenti: AlimentoCatalogo[];
  onCambiato: () => void;
}

const CAMPO =
  "rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function valore(v: number | null): string {
  return v === null ? "—" : v.toFixed(1);
}

export const LibroAlimentiPanel = memo(function LibroAlimentiPanel({
  alimenti,
  onCambiato,
}: LibroAlimentiPanelProps) {
  const [filtro, setFiltro] = useState("");
  const [alimentoAzioni, setAlimentoAzioni] = useState<AlimentoCatalogo | null>(null);
  const [alimentoModifica, setAlimentoModifica] = useState<AlimentoCatalogo | null>(null);
  const [nuovoAlimentoAperto, setNuovoAlimentoAperto] = useState(false);
  const [erroreEliminazione, setErroreEliminazione] = useState<string | null>(null);
  const { chiedi, elemento: modaleConferma } = useConferma();

  const filtrati = alimenti.filter((a) => a.nome.toLowerCase().includes(filtro.trim().toLowerCase()));

  async function gestisciElimina(alimento: AlimentoCatalogo) {
    setAlimentoAzioni(null);
    const ok = await chiedi(`Eliminare "${alimento.nome}" dal catalogo?`, { distruttivo: true });
    if (!ok) return;

    try {
      await eliminaAlimento(alimento.id);
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
      {alimentoAzioni && (
        <AzioniAlimentoModal
          alimento={alimentoAzioni}
          onChiudi={() => setAlimentoAzioni(null)}
          onModifica={() => {
            setAlimentoModifica(alimentoAzioni);
            setAlimentoAzioni(null);
          }}
          onElimina={() => gestisciElimina(alimentoAzioni)}
        />
      )}
      {alimentoModifica && (
        <AlimentoFormModal
          alimento={alimentoModifica}
          onChiudi={() => setAlimentoModifica(null)}
          onSalvato={onCambiato}
        />
      )}
      {nuovoAlimentoAperto && (
        <AlimentoFormModal onChiudi={() => setNuovoAlimentoAperto(false)} onSalvato={onCambiato} />
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Cerca alimento…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className={CAMPO + " flex-1"}
        />
        <button
          onClick={() => setNuovoAlimentoAperto(true)}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Alimento singolo
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-2 py-1 font-medium">Nome</th>
              <th className="px-2 py-1 font-medium">Unità</th>
              <th className="px-2 py-1 font-medium">Kcal</th>
              <th className="px-2 py-1 font-medium">Prot.</th>
              <th className="px-2 py-1 font-medium">Carb.</th>
              <th className="px-2 py-1 font-medium">Grassi</th>
              <th className="px-2 py-1 font-medium">Zucch.</th>
              <th className="px-2 py-1 font-medium">Sat.</th>
              <th className="px-2 py-1 font-medium">Fibre</th>
              <th className="px-2 py-1 font-medium">Sale</th>
              <th className="px-2 py-1 font-medium">Fonte</th>
            </tr>
          </thead>
          <tbody>
            {filtrati.map((a) => (
              <tr
                key={a.id}
                onClick={() => setAlimentoAzioni(a)}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <td className="px-2 py-1 font-medium text-slate-700 dark:text-slate-200">{a.nome}</td>
                <td className="px-2 py-1">{a.unita}</td>
                <td className="px-2 py-1">{Math.round(a.kcal_100)}</td>
                <td className="px-2 py-1">{a.proteine_100.toFixed(1)}</td>
                <td className="px-2 py-1">{a.carboidrati_100.toFixed(1)}</td>
                <td className="px-2 py-1">{a.grassi_100.toFixed(1)}</td>
                <td className="px-2 py-1">{valore(a.zuccheri_100)}</td>
                <td className="px-2 py-1">{valore(a.grassi_saturi_100)}</td>
                <td className="px-2 py-1">{valore(a.fibre_100)}</td>
                <td className="px-2 py-1">{valore(a.sale_100)}</td>
                <td className="px-2 py-1">{a.da_etichetta ? "Etichetta" : "Stima"}</td>
              </tr>
            ))}
            {filtrati.length === 0 && (
              <tr>
                <td colSpan={11} className="px-2 py-4 text-center text-slate-400 dark:text-slate-500">
                  Nessun alimento trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-slate-400 dark:text-slate-500">
        Valori per 100 unità (g o ml, vedi colonna "Unità") · {filtrati.length} alimento
        {filtrati.length === 1 ? "" : "i"}
        {filtro && ` (su ${alimenti.length} totali)`}
      </div>
    </div>
  );
});

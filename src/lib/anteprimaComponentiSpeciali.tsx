import { useState } from "react";
import { PesoPanel } from "../components/panels/PesoPanel";
import { ConfrontoPeriodiChart, SelettoreVistaConfronto, type VistaConfronto } from "../components/panels/ConfrontoPeriodiChart";
import { TourAnteprimaPannello } from "../components/TourAnteprimaPannello";
import { stepsPesoCorporeo, stepsConfrontoPeriodi } from "./tourAnteprimaContenuti";
import {
  GIORNI_DIMOSTRATIVI,
  PESO_DIMOSTRATIVO,
  OBIETTIVO_PESO_DIMOSTRATIVO_KG,
  STORICO_OBIETTIVO_PESO_DIMOSTRATIVO,
} from "./datiDimostrativi";

// Il toggle grafico/tabella vive nell'header del pannello in produzione (vedi headerExtraPannello
// in App.tsx), non dentro il pannello stesso - qui nella modale "?" non c'è nessun header attorno,
// quindi lo si renderizza esplicitamente sopra al grafico, con uno stato locale minimo solo per
// farlo funzionare davvero (non è "vero" stato dell'app, sparisce alla chiusura della modale).
export function AnteprimaPesoCorporeo({ onChiudiModale }: { onChiudiModale: () => void }) {
  const [vista, setVista] = useState<VistaConfronto>("grafico");
  return (
    <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
      <TourAnteprimaPannello steps={stepsPesoCorporeo} onCompletato={onChiudiModale} />
      <SelettoreVistaConfronto vista={vista} onChange={setVista} />
      <div className="min-h-0 flex-1 overflow-auto">
        <PesoPanel
          peso={PESO_DIMOSTRATIVO}
          obiettivoKg={OBIETTIVO_PESO_DIMOSTRATIVO_KG}
          storicoObiettivo={STORICO_OBIETTIVO_PESO_DIMOSTRATIVO}
          vista={vista}
          focusGiorno={null}
          margineKg={5}
        />
      </div>
    </div>
  );
}

export function AnteprimaConfrontoPeriodi({ onChiudiModale }: { onChiudiModale: () => void }) {
  const [vista, setVista] = useState<VistaConfronto>("grafico");
  return (
    <div id="anteprima-tour-root" className="flex h-full flex-col gap-2">
      <TourAnteprimaPannello steps={stepsConfrontoPeriodi} onCompletato={onChiudiModale} />
      <SelettoreVistaConfronto vista={vista} onChange={setVista} />
      <div className="min-h-0 flex-1 overflow-auto">
        <ConfrontoPeriodiChart giorni={GIORNI_DIMOSTRATIVI} peso={PESO_DIMOSTRATIVO} vista={vista} />
      </div>
    </div>
  );
}

import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { RiepilogoKcalMacro, RiepilogoPeso, RiepilogoTDEE } from "../../lib/report";

// Proprietà singole (borderBottomWidth/Color/Style) invece della scorciatoia CSS "border: ...":
// il motore di stile di @react-pdf/renderer (basato su Yoga) non garantisce di interpretare le
// stringhe shorthand nello stesso modo del CSS del browser.
// Blu-600 di Tailwind (#2563eb): stesso tono usato per i pulsanti primari/toggle attivi in tutta
// l'app (es. "Genera PDF", "Da mese a mese" selezionato) — il colore più vicino a un "tema
// principale" che l'app abbia oggi, non essendoci un vero design token di brand dedicato.
const BLU_TEMA = "#2563eb";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  headerRiga: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titolo: { fontSize: 26, fontWeight: "bold", color: BLU_TEMA },
  hamburger: { justifyContent: "center" },
  hamburgerBarra: { width: 24, height: 3.5, backgroundColor: BLU_TEMA, borderRadius: 1.5 },
  sottotitolo: { fontSize: 11, color: "#64748b", marginTop: 6, marginBottom: 20 },
  sezione: { marginBottom: 16 },
  sezioneTitolo: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
  },
  riga: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    borderBottomStyle: "solid",
  },
  etichetta: { color: "#475569" },
  valore: { fontWeight: "bold" },
  grafico: { width: "100%", marginTop: 8, marginBottom: 10 },
  legendaRiga: { flexDirection: "row", flexWrap: "wrap" },
  legendaItem: { flexDirection: "row", alignItems: "center", marginRight: 14 },
  pallino: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  vuoto: { color: "#94a3b8", fontStyle: "italic" },
});

interface RigaGraficoReport {
  titolo: string;
  immagine: string;
  legenda: { colore: string; etichetta: string }[];
}

export interface DatiReportPdf {
  titoloPeriodo: string;
  kcalMacro: RiepilogoKcalMacro | null;
  peso: RiepilogoPeso | null;
  tdee: RiepilogoTDEE | null;
  grafici: RigaGraficoReport[];
}

function RigaValore({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <View style={styles.riga}>
      <Text style={styles.etichetta}>{etichetta}</Text>
      <Text style={styles.valore}>{valore}</Text>
    </View>
  );
}

export function ReportDocument({ dati }: { dati: DatiReportPdf }) {
  const nessunDato = !dati.kcalMacro && !dati.peso && !dati.tdee;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRiga}>
          <Text style={styles.titolo}>NutriBum</Text>
          <View style={styles.hamburger}>
            <View style={styles.hamburgerBarra} />
            <View style={[styles.hamburgerBarra, { marginTop: 4 }]} />
            <View style={[styles.hamburgerBarra, { marginTop: 4 }]} />
          </View>
        </View>
        <Text style={styles.sottotitolo}>Report — {dati.titoloPeriodo}</Text>

        {nessunDato && <Text style={styles.vuoto}>Nessun dato disponibile per il periodo selezionato.</Text>}

        {dati.kcalMacro && (
          <View style={styles.sezione}>
            <Text style={styles.sezioneTitolo}>Kcal e macronutrienti (medie giornaliere)</Text>
            {dati.kcalMacro.metriche.map((m) => (
              <RigaValore
                key={m.chiave}
                etichetta={m.chiave}
                valore={`${m.valoreMedio} / ${m.limiteMedio} (${m.percentuale}%)`}
              />
            ))}
            <RigaValore
              etichetta="Giorni sforati / puliti / totale registrati"
              valore={`${dati.kcalMacro.sforamenti.sforati} / ${dati.kcalMacro.sforamenti.puliti} / ${dati.kcalMacro.sforamenti.totale}`}
            />
          </View>
        )}

        {dati.peso && (
          <View style={styles.sezione}>
            <Text style={styles.sezioneTitolo}>Peso corporeo</Text>
            <RigaValore etichetta="Peso iniziale" valore={`${dati.peso.primoKg.toFixed(1)} kg`} />
            <RigaValore etichetta="Peso finale" valore={`${dati.peso.ultimoKg.toFixed(1)} kg`} />
            <RigaValore
              etichetta="Variazione nel periodo"
              valore={`${dati.peso.variazioneKg > 0 ? "+" : ""}${dati.peso.variazioneKg.toFixed(1)} kg`}
            />
            {dati.peso.obiettivoKg !== null && (
              <RigaValore etichetta="Obiettivo attuale" valore={`${dati.peso.obiettivoKg.toFixed(1)} kg`} />
            )}
          </View>
        )}

        {dati.tdee && (
          <View style={styles.sezione}>
            <Text style={styles.sezioneTitolo}>TDEE stimato</Text>
            <RigaValore etichetta="BMR medio (a riposo)" valore={`${dati.tdee.bmrMedio} kcal`} />
            <RigaValore etichetta="TDEE medio (mantenimento)" valore={`${dati.tdee.tdeeMedio} kcal`} />
            <RigaValore etichetta="Giorni con stima disponibile" valore={String(dati.tdee.giorniStimati)} />
          </View>
        )}
      </Page>

      {dati.grafici.map((g) => (
        <Page key={g.titolo} size="A4" style={styles.page}>
          <Text style={styles.sezioneTitolo}>{g.titolo}</Text>
          <Image src={g.immagine} style={styles.grafico} />
          <View style={styles.legendaRiga}>
            {g.legenda.map((l) => (
              <View key={l.etichetta} style={styles.legendaItem}>
                <View style={[styles.pallino, { backgroundColor: l.colore }]} />
                <Text>{l.etichetta}</Text>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}

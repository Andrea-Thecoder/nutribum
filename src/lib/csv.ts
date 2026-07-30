/** Parser CSV minimale (RFC4180): delimitatore ",", campi tra virgolette con escaping "" per la virgoletta letterale. */
export function parseRigheCsv(contenuto: string): string[][] {
  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = "";
  let inQuote = false;
  const testo = contenuto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (inQuote) {
      if (c === '"') {
        if (testo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      inQuote = true;
    } else if (c === ",") {
      riga.push(campo);
      campo = "";
    } else if (c === "\n") {
      riga.push(campo);
      righe.push(riga);
      riga = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || riga.length > 0) {
    riga.push(campo);
    righe.push(riga);
  }

  return righe.filter((r) => !(r.length === 1 && r[0] === ""));
}

export interface ErroreRigaImport {
  riga: number;
  messaggio: string;
}

/** Un campo va tra virgolette se contiene il delimitatore, una virgoletta o un a-capo; le virgolette interne si raddoppiano (RFC4180). */
function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvField(value: string | number | boolean | null): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "1" : "0";
  return escapeCsvField(String(value));
}

export function generateCsv(header: string[], rows: (string | number | boolean | null)[][]): string {
  const csvRows = [header.map(escapeCsvField), ...rows.map((r) => r.map(csvField))];
  return csvRows.map((r) => r.join(",")).join("\n") + "\n";
}

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
} from "date-fns";
import type { GiornoStorico } from "./schema";
import { totaliGiorno, type Totali } from "./aggregate";

export interface CellaCalendario {
  data: Date;
  chiave: string;
  fuoriMese: boolean;
  kcal: number | null;
  totali: Totali | null;
}

export function costruisciMese(riferimento: Date, giorni: GiornoStorico[]): CellaCalendario[] {
  const totaliPerData = new Map<string, Totali>();
  for (const giorno of giorni) {
    totaliPerData.set(giorno.data, totaliGiorno(giorno));
  }

  const inizio = startOfWeek(startOfMonth(riferimento), { weekStartsOn: 1 });
  const fine = endOfWeek(endOfMonth(riferimento), { weekStartsOn: 1 });

  return eachDayOfInterval({ start: inizio, end: fine }).map((data) => {
    const chiave = format(data, "yyyy-MM-dd");
    const totali = totaliPerData.get(chiave) ?? null;
    return {
      data,
      chiave,
      fuoriMese: !isSameMonth(data, riferimento),
      kcal: totali?.kcal ?? null,
      totali,
    };
  });
}

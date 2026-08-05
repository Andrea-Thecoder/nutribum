const DUE_DECIMALI = /^\d*\.?\d{0,2}$/;

// Per i campi numerici controllati (value/onChange manuali) di questa app: l'attributo "step"
// nativo di <input type="number"> non impedisce davvero di DIGITARE più decimali di quanti
// dichiarati, segnala solo un vincolo violato se qualcosa controlla la validità - qui nessuno lo
// fa, quindi "0.005" passava comunque. Questo filtro va usato nell'onChange invece di scrivere
// direttamente e.target.value in stato, e rifiuta un carattere in più oltre il secondo decimale.
// Solo il punto (non la virgola): un input type="number" del browser non lascia comunque digitare
// nessun altro carattere non numerico a parte il punto, coerente con Number()/parseFloat più avanti.
export function accettaDueDecimali(valore: string): boolean {
  return DUE_DECIMALI.test(valore);
}

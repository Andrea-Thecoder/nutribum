import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelettoreIstanza } from "./SelettoreIstanza";

const GIORNI = [{ data: "2024-01-01" }, { data: "2024-02-01" }];

describe("SelettoreIstanza", () => {
  it("SelettoreIstanza_istanzaTutto_mostraLetichettaTutto", () => {
    render(<SelettoreIstanza giorni={GIORNI} periodo="mese" istanza="tutto" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: /Tutto/ })).toBeInTheDocument();
  });

  it("SelettoreIstanza_istanzaSpecifica_mostraLaSuaEtichettaFormattata", () => {
    render(<SelettoreIstanza giorni={GIORNI} periodo="mese" istanza="2024-01" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: /Gennaio 2024/ })).toBeInTheDocument();
  });

  it("SelettoreIstanza_mostraTuttoDefault_includeLopzioneTuttoNellaTendina", async () => {
    const utente = userEvent.setup();
    render(<SelettoreIstanza giorni={GIORNI} periodo="mese" istanza="tutto" onChange={vi.fn()} />);

    await utente.click(screen.getByRole("combobox"));

    expect(screen.getByText("Tutto")).toBeInTheDocument();
  });

  it("SelettoreIstanza_mostraTuttoFalse_nonIncludeLopzioneTuttoNellaTendina", async () => {
    const utente = userEvent.setup();
    render(
      <SelettoreIstanza giorni={GIORNI} periodo="mese" istanza="2024-01" onChange={vi.fn()} mostraTutto={false} />,
    );

    await utente.click(screen.getByRole("combobox"));

    expect(screen.queryByText("Tutto")).not.toBeInTheDocument();
  });

  it("SelettoreIstanza_clicSuUnopzione_chiamaOnChangeConLaChiaveDiQuellIstanza", async () => {
    const onChange = vi.fn();
    const utente = userEvent.setup();
    render(<SelettoreIstanza giorni={GIORNI} periodo="mese" istanza="tutto" onChange={onChange} />);
    await utente.click(screen.getByRole("combobox"));

    await utente.click(screen.getByText(/Gennaio 2024/));

    expect(onChange).toHaveBeenCalledWith("2024-01");
  });

  it("SelettoreIstanza_clicSuUnopzione_richiudeLaTendina", async () => {
    const utente = userEvent.setup();
    render(<SelettoreIstanza giorni={GIORNI} periodo="mese" istanza="tutto" onChange={vi.fn()} />);
    await utente.click(screen.getByRole("combobox"));

    await utente.click(screen.getByText(/Gennaio 2024/));

    expect(screen.queryByText(/Febbraio 2024/)).not.toBeInTheDocument();
  });

  it("SelettoreIstanza_dataTourNonSpecificato_usaIlValoreDiDefault", () => {
    render(<SelettoreIstanza giorni={GIORNI} periodo="mese" istanza="tutto" onChange={vi.fn()} />);

    expect(document.querySelector('[data-tour="selettore-istanza"]')).toBeInTheDocument();
  });

  it("SelettoreIstanza_dataTourSpecificato_sovrascriveIlDefault", () => {
    render(<SelettoreIstanza giorni={GIORNI} periodo="mese" istanza="tutto" onChange={vi.fn()} dataTour="selettore-istanza-a" />);

    expect(document.querySelector('[data-tour="selettore-istanza-a"]')).toBeInTheDocument();
    expect(document.querySelector('[data-tour="selettore-istanza"]')).not.toBeInTheDocument();
  });
});

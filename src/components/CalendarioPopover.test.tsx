import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarioPopover } from "./CalendarioPopover";

describe("CalendarioPopover", () => {
  it("CalendarioPopover_valoreCorrente_mostraLaDataFormattataSulBottone", () => {
    render(<CalendarioPopover value="2024-03-15" onChange={vi.fn()} max={new Date("2024-03-20")} />);

    expect(screen.getByRole("button", { name: /15 marzo 2024/ })).toBeInTheDocument();
  });

  it("CalendarioPopover_clicSulBottone_apreLaGrigliaDelMese", async () => {
    const utente = userEvent.setup();
    render(<CalendarioPopover value="2024-03-15" onChange={vi.fn()} max={new Date("2024-03-20")} />);

    await utente.click(screen.getByRole("button", { name: /15 marzo 2024/ }));

    expect(screen.getByText("Lu")).toBeInTheDocument();
  });

  it("CalendarioPopover_clicSuUnGiorno_chiamaOnChangeConQuellaDataEChiudeLaGriglia", async () => {
    const onChange = vi.fn();
    const utente = userEvent.setup();
    render(<CalendarioPopover value="2024-03-15" onChange={onChange} max={new Date("2024-03-20")} />);
    await utente.click(screen.getByRole("button", { name: /15 marzo 2024/ }));

    await utente.click(screen.getByText("18"));

    expect(onChange).toHaveBeenCalledWith("2024-03-18");
    expect(screen.queryByText("Lu")).not.toBeInTheDocument();
  });

  it("CalendarioPopover_giornoDopoIlMassimo_eDisabilitatoENonChiamaOnChange", async () => {
    const onChange = vi.fn();
    const utente = userEvent.setup();
    render(<CalendarioPopover value="2024-03-15" onChange={onChange} max={new Date("2024-03-20")} />);
    await utente.click(screen.getByRole("button", { name: /15 marzo 2024/ }));

    const giorno25 = screen.getByText("25");
    expect(giorno25.closest("button")).toBeDisabled();
  });

  it("CalendarioPopover_meseProssimoInteramenteFuturo_disabilitaIlBottoneAvanti", async () => {
    const utente = userEvent.setup();
    render(<CalendarioPopover value="2024-03-15" onChange={vi.fn()} max={new Date("2024-03-20")} />);
    await utente.click(screen.getByRole("button", { name: /15 marzo 2024/ }));

    expect(screen.getByText("›")).toBeDisabled();
  });

  it("CalendarioPopover_meseProssimoNonInteramenteFuturo_lasciaAttivoIlBottoneAvanti", async () => {
    const utente = userEvent.setup();
    render(<CalendarioPopover value="2024-03-15" onChange={vi.fn()} max={new Date("2024-04-15")} />);
    await utente.click(screen.getByRole("button", { name: /15 marzo 2024/ }));

    expect(screen.getByText("›")).not.toBeDisabled();
  });

  it("CalendarioPopover_clicSuAvanti_passaAlMeseSuccessivo", async () => {
    const utente = userEvent.setup();
    render(<CalendarioPopover value="2024-03-15" onChange={vi.fn()} max={new Date("2024-04-15")} />);
    await utente.click(screen.getByRole("button", { name: /15 marzo 2024/ }));

    await utente.click(screen.getByText("›"));

    expect(screen.getByText("aprile 2024")).toBeInTheDocument();
  });

  it("CalendarioPopover_clicFuori_chiudeLaGriglia", async () => {
    const utente = userEvent.setup();
    render(
      <div>
        <CalendarioPopover value="2024-03-15" onChange={vi.fn()} max={new Date("2024-03-20")} />
        <button>Fuori</button>
      </div>,
    );
    await utente.click(screen.getByRole("button", { name: /15 marzo 2024/ }));

    await utente.click(screen.getByText("Fuori"));

    expect(screen.queryByText("Lu")).not.toBeInTheDocument();
  });

  it("CalendarioPopover_tastoEsc_chiudeLaGriglia", async () => {
    const utente = userEvent.setup();
    render(<CalendarioPopover value="2024-03-15" onChange={vi.fn()} max={new Date("2024-03-20")} />);
    await utente.click(screen.getByRole("button", { name: /15 marzo 2024/ }));

    await utente.keyboard("{Escape}");

    expect(screen.queryByText("Lu")).not.toBeInTheDocument();
  });
});

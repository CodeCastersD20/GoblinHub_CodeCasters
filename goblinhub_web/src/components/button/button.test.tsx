import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Button from "./button";

describe("Button", () => {
  it("renderiza el texto del hijo correctamente", () => {
    render(<Button>Guardar</Button>);
    expect(
      screen.getByRole("button", { name: /guardar/i }),
    ).toBeInTheDocument();
  });

  it("aplica la variante primary por defecto", () => {
    render(<Button>Acción</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("primary");
  });

  it("aplica la variante secondary cuando se indica", () => {
    render(<Button variant="secondary">Cancelar</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("secondary");
  });

  it("llama a onClick cuando se hace click", () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("no llama a onClick cuando está deshabilitado", () => {
    const handler = vi.fn();
    render(
      <Button onClick={handler} disabled>
        Bloqueado
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handler).not.toHaveBeenCalled();
  });

  it('usa type="submit" cuando se especifica', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("aplica el className adicional recibido", () => {
    render(<Button className="mi-clase">Extra</Button>);
    expect(screen.getByRole("button").className).toContain("mi-clase");
  });
});

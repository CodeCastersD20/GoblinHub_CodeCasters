import { render, screen } from "@testing-library/react";
import AboutUs from "./aboutUs";

describe("AboutUs", () => {
  it("renders the contact page heading", () => {
    render(<AboutUs />);
    expect(
      screen.getByRole("heading", { name: "Página de Contacto" }),
    ).toBeInTheDocument();
  });

  it("renders only one heading", () => {
    render(<AboutUs />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });
});

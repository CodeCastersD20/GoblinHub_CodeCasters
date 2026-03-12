import { render, screen } from "@testing-library/react";
import AboutUs from "./aboutUs";

describe("AboutUs", () => {
  it("renders the contact page heading", () => {
    render(<AboutUs />);
    expect(
      screen.getByRole("heading", { name: "¿Cómo llegar a nuestra guarida?" }),
    ).toBeInTheDocument();
  });

  it("renders multiple headings", () => {
    render(<AboutUs />);
    expect(screen.getAllByRole("heading")).toHaveLength(5);
  });
});

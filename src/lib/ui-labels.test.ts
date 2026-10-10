import { describe, expect, it } from "vitest";
import { uiLabel } from "./ui-labels";

describe("ui labels", () => {
  it("never exposes core internal property/origin/module values", () => {
    expect(uiLabel("disponivel")).toBe("Disponível");
    expect(uiLabel("site")).toBe("Site");
    expect(uiLabel("novo-lead")).toBe("Novo lead");
    expect(uiLabel("imoveis")).toBe("Imóveis");
    expect(uiLabel("custom")).toBe("Personalizado");
  });

  it("humanizes unknown technical separators as a fallback", () => {
    expect(uiLabel("valor_interno-teste")).toBe("valor interno teste");
  });
});

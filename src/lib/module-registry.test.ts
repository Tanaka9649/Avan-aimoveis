import { describe, expect, it } from "vitest";
import { moduleDefinition, validModuleCombination } from "./module-registry";

describe("module registry", () => {
  it("requires declared module dependencies", () => {
    expect(validModuleCombination(["crm"])).toBe(false);
    expect(validModuleCombination(["clientes", "crm"])).toBe(true);
    expect(validModuleCombination(["propostas", "crm", "clientes"])).toBe(true);
  });

  it("keeps owner and visit dependencies explicit", () => {
    expect(moduleDefinition("proprietarios")?.dependencies).toEqual(["imoveis"]);
    expect(moduleDefinition("visitas")?.dependencies).toEqual(["clientes", "imoveis"]);
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ListFilters } from "./list-tools";

it("keeps CRM search as a GET form with the same query and clear URL", () => {
  const html = renderToStaticMarkup(
    createElement(ListFilters, {
      scope: "crm",
      userId: "test",
      query: { q: "Ana" },
    }),
  );
  expect(html).toContain('method="get"');
  expect(html).toContain('name="q"');
  expect(html).toContain('value="Ana"');
  expect(html).toContain('href="/painel/crm"');
  expect(html).toContain('type="submit"');
  expect(html).toContain("Filtros salvos");
  expect(html).toContain("crm-list-tools");
  expect(html).toContain('role="search"');
});
it("shares the professional toolbar without leaking CRM-only classes", () => {
  const html = renderToStaticMarkup(
    createElement(ListFilters, {
      scope: "clientes",
      userId: "test",
      query: {},
    }),
  );
  expect(html).not.toContain("crm-list-tools");
  expect(html).not.toContain("crm-search-field");
  expect(html).toContain("list-search-field");
  expect(html).toContain('placeholder="Buscar por nome, telefone ou e-mail"');
  expect(html).not.toContain('href="/painel/clientes"');
});

it("renders the property toolbar with accessible search and conditional clear", () => {
  const html = renderToStaticMarkup(
    createElement(ListFilters, {
      scope: "imoveis",
      userId: "test",
      query: { q: "Casa" },
    }),
  );
  expect(html).toContain("property-list-tools");
  expect(html).toContain('placeholder="Buscar por nome, código ou contato"');
  expect(html).toContain('aria-label="Buscar imóvel"');
  expect(html).toContain("Limpar filtros");
});

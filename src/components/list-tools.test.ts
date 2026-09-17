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
it("does not apply CRM presentation to other list pages", () => {
  const html = renderToStaticMarkup(
    createElement(ListFilters, {
      scope: "clientes",
      userId: "test",
      query: {},
    }),
  );
  expect(html).not.toContain("crm-list-tools");
  expect(html).not.toContain("crm-search-field");
  expect(html).toContain('placeholder="Nome, código ou contato"');
  expect(html).toContain('href="/painel/clientes"');
});

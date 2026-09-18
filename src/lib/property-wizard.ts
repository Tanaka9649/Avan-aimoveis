import { z } from "zod";
import { propertyInput } from "./property-input";
export const propertySteps = [
  {
    title: "Informações",
    heading: "Vamos começar pelo essencial",
    hint: "Dê um nome ao anúncio e informe o valor de venda.",
    fields: [
      "title",
      "type",
      "price",
      "status",
      "code",
      "slug",
      "ownerId",
      "ownerName",
      "ownerPhone",
      "ownerEmail",
    ],
  },
  {
    title: "Características",
    heading: "Como é o imóvel?",
    hint: "Informe as quantidades e a área privativa.",
    fields: ["bedrooms", "bathrooms", "parking", "area"],
  },
  {
    title: "Localização",
    heading: "Onde fica o imóvel?",
    hint: "No site será exibida apenas a região. O endereço completo é interno.",
    fields: ["address", "neighborhood", "city", "state"],
  },
  {
    title: "Descrição",
    heading: "O que torna este imóvel especial?",
    hint: "Apresente os ambientes e destaque os diferenciais.",
    fields: ["description", "features"],
  },
  {
    title: "Mídia",
    heading: "Fotos e documentos",
    hint: "Imagens do anúncio e arquivos internos em espaços separados.",
    fields: [],
  },
  {
    title: "Revisão",
    heading: "Está tudo certo?",
    hint: "Confira os dados antes de salvar ou publicar.",
    fields: [],
  },
];
export function propertySlug(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200)
    .replace(/-$/g, "");
}

export function propertyRecordId(stateId?: string, initialId?: string | number) {
  return stateId || String(initialId || "");
}
const messages: Record<string, string> = {
  title: "Use entre 8 e 180 caracteres.",
  code: "Use entre 3 e 30 caracteres.",
  slug: "Use letras minúsculas, números e hífens.",
  price:
    "Informe um valor de R$ 0,01 até R$ 21.474.836,47, com até 2 casas decimais.",
  area: "Informe uma área maior que zero, até 99.999.999,99 m².",
  bedrooms: "Informe um número inteiro de 0 a 100.",
  bathrooms: "Informe um número inteiro de 0 a 100.",
  parking: "Informe um número inteiro de 0 a 100.",
  address: "Informe o endereço completo (5 a 1.000 caracteres).",
  city: "Informe a cidade (2 a 120 caracteres).",
  neighborhood: "Informe o bairro (2 a 120 caracteres).",
  state: "Use duas letras, como MG.",
  description: "Escreva entre 30 e 20.000 caracteres.",
};
export function propertyErrors(values: Record<string, string>, step?: number) {
  const errors: Record<string, string> = {};
  const parsed = propertyInput.safeParse(values);
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      errors[field] = messages[field] || "Revise este campo.";
    }
  if (values.features?.length > 4000)
    errors.features = "Use até 4.000 caracteres.";
  if (!values.ownerId) {
    if (
      values.ownerName &&
      (values.ownerName.trim().length < 2 || values.ownerName.length > 160)
    )
      errors.ownerName = "Informe um nome entre 2 e 160 caracteres.";
    if (values.ownerPhone?.length > 30)
      errors.ownerPhone = "Use até 30 caracteres.";
    if (values.ownerEmail && !z.email().safeParse(values.ownerEmail).success)
      errors.ownerEmail = "Informe um e-mail válido.";
  }
  return step === undefined
    ? errors
    : Object.fromEntries(
        Object.entries(errors).filter(([field]) =>
          propertySteps[step].fields.includes(field),
        ),
      );
}

export const attachmentCategories = [
  "Contrato",
  "Simulação de financiamento",
  "Documento pessoal",
  "Proposta",
  "Comprovante",
  "Ficha",
  "Outro",
] as const;

export type AttachmentCategory = typeof attachmentCategories[number];

export type OpportunityAttachment = {
  id: string;
  displayName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string | null;
  createdAt: string;
};

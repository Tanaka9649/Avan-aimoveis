/** Shapes the public site renders. Built exclusively by src/lib/public-properties.ts. */
export type PublicPhoto = { id: string; url: string; blur: string; alt: string };

export type PublicPropertyCard = {
  id: string;
  code: string;
  slug: string;
  title: string;
  type: string;
  city: string;
  state: string;
  neighborhood: string;
  priceCents: number;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpaces: number;
  area: number;
  cover: PublicPhoto | null;
};

export type PublicPropertyDetail = PublicPropertyCard & {
  description: string;
  features: string[];
  gallery: PublicPhoto[];
  publishedAt: string | null;
  updatedAt: string | null;
};

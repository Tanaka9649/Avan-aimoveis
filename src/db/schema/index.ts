import {
  boolean, index, integer, jsonb, numeric, pgEnum, pgTable,
  primaryKey, text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";
import { defaultAccess, type Access } from "../../lib/permissions";

export const userRole = pgEnum("user_role", ["admin", "equipe"]);
export const propertyStatus = pgEnum("property_status", ["rascunho", "disponivel", "reservado", "vendido", "pausado"]);
export const visitStatus = pgEnum("visit_status", ["agendada", "realizada", "cancelada", "nao_compareceu"]);
export const proposalStatus = pgEnum("proposal_status", ["aberta", "aceita", "recusada", "expirada"]);

const audit = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const reminderSettings = pgTable("reminder_settings", {
  key: text("key").primaryKey(),
  panel: boolean("panel").default(true).notNull(),
  email: boolean("email").default(true).notNull(),
  recipients: jsonb("recipients").$type<string[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").default("equipe").notNull(),
  active: boolean("active").default(true).notNull(),
  access: jsonb("access").$type<Access>().default(defaultAccess).notNull(),
  ...audit,
}, (t) => [uniqueIndex("users_email_uq").on(t.email)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 30 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  status: propertyStatus("status").default("rascunho").notNull(),
  type: varchar("type", { length: 60 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  condoCents: integer("condo_cents"),
  iptuCents: integer("iptu_cents"),
  bedrooms: integer("bedrooms").default(0).notNull(),
  suites: integer("suites").default(0).notNull(),
  bathrooms: integer("bathrooms").default(0).notNull(),
  parkingSpaces: integer("parking_spaces").default(0).notNull(),
  privateArea: numeric("private_area", { precision: 10, scale: 2 }),
  description: text("description").notNull(),
  features: jsonb("features").$type<string[]>().default([]).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  neighborhood: varchar("neighborhood", { length: 120 }).notNull(),
  addressPrivate: text("address_private").notNull(),
  latitudePrivate: numeric("latitude_private", { precision: 10, scale: 7 }),
  longitudePrivate: numeric("longitude_private", { precision: 10, scale: 7 }),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }),
  acquisitionType: varchar("acquisition_type", { length: 60 }),
  acquisitionEndsAt: timestamp("acquisition_ends_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...audit,
}, (t) => [uniqueIndex("properties_code_uq").on(t.code), uniqueIndex("properties_slug_uq").on(t.slug), index("properties_search_idx").on(t.status, t.city, t.type, t.priceCents)]);

export const propertyPhotos = pgTable("property_photos", {
  id: uuid("id").defaultRandom().primaryKey(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  storagePath: text("storage_path").notNull(), alt: varchar("alt", { length: 180 }).notNull(), position: integer("position").notNull(), isCover: boolean("is_cover").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("property_photos_order_idx").on(t.propertyId, t.position)]);

export const owners = pgTable("owners", {
  id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 160 }).notNull(), phone: varchar("phone", { length: 30 }).notNull(), email: varchar("email", { length: 254 }), taxIdEncrypted: text("tax_id_encrypted"), notes: text("notes"), ...audit,
});
export const propertyOwners = pgTable("property_owners", {
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(), ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "restrict" }).notNull(), ownershipPercent: numeric("ownership_percent", { precision: 5, scale: 2 }),
}, (t) => [primaryKey({ columns: [t.propertyId, t.ownerId] })]);

export const documentCategories = pgTable("document_categories", { id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 100 }).notNull(), entityType: varchar("entity_type", { length: 30 }).notNull(), active: boolean("active").default(true).notNull(), ...audit });
export const propertyDocuments = pgTable("property_documents", { id: uuid("id").defaultRandom().primaryKey(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(), categoryId: uuid("category_id").references(() => documentCategories.id).notNull(), storagePath: text("storage_path").notNull(), originalName: varchar("original_name", { length: 240 }).notNull(), mime: varchar("mime", { length: 100 }).notNull(), size: integer("size").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });

export const clients = pgTable("clients", {
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 160 }).notNull(), phone: varchar("phone", { length: 30 }).notNull(), email: varchar("email", { length: 254 }), origin: varchar("origin", { length: 80 }).notNull(),
  budgetMinCents: integer("budget_min_cents"), budgetMaxCents: integer("budget_max_cents"), desiredTypes: jsonb("desired_types").$type<string[]>().default([]).notNull(), desiredRegions: jsonb("desired_regions").$type<string[]>().default([]).notNull(), minBedrooms: integer("min_bedrooms"), minBathrooms: integer("min_bathrooms"), minParkingSpaces: integer("min_parking_spaces"), minArea: numeric("min_area", { precision: 10, scale: 2 }), desiredFeatures: jsonb("desired_features").$type<string[]>().default([]).notNull(), lgpdConsentAt: timestamp("lgpd_consent_at", { withTimezone: true }), anonymizedAt: timestamp("anonymized_at", { withTimezone: true }), ...audit,
}, (t) => [index("clients_contact_idx").on(t.email, t.phone), index("clients_assigned_idx").on(t.assignedTo)]);

export const stages = pgTable("stages", { id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 80 }).notNull(), position: integer("position").notNull(), color: varchar("color", { length: 20 }).notNull(), isWon: boolean("is_won").default(false).notNull(), isLost: boolean("is_lost").default(false).notNull(), ...audit }, (t) => [uniqueIndex("stages_position_uq").on(t.position)]);
export const deals = pgTable("deals", { id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id").references(() => clients.id).notNull(), stageId: uuid("stage_id").references(() => stages.id).notNull(), title: varchar("title", { length: 180 }).notNull(), estimatedValueCents: integer("estimated_value_cents"), position: numeric("position", { precision: 20, scale: 10 }).notNull(), tags: jsonb("tags").$type<string[]>().default([]).notNull(), nextActionAt: timestamp("next_action_at", { withTimezone: true }), lostReason: text("lost_reason"), ...audit }, (t) => [index("deals_board_idx").on(t.stageId, t.position)]);
export const dealProperties = pgTable("deal_properties", { dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull() }, (t) => [primaryKey({ columns: [t.dealId, t.propertyId] })]);
export const activities = pgTable("activities", { id: uuid("id").defaultRandom().primaryKey(), dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }), clientId: uuid("client_id").references(() => clients.id), userId: uuid("user_id").references(() => users.id), type: varchar("type", { length: 60 }).notNull(), description: text("description").notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("activities_timeline_idx").on(t.clientId, t.occurredAt)]);
export const visits = pgTable("visits", { id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id").references(() => clients.id).notNull(), propertyId: uuid("property_id").references(() => properties.id).notNull(), dealId: uuid("deal_id").references(() => deals.id), assignedTo: uuid("assigned_to").references(() => users.id), status: visitStatus("status").default("agendada").notNull(), scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(), reminderAt: timestamp("reminder_at", { withTimezone: true }), reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }), feedback: text("feedback"), ...audit }, (t) => [index("visits_schedule_idx").on(t.status, t.scheduledAt)]);
export const proposals = pgTable("proposals", { id: uuid("id").defaultRandom().primaryKey(), dealId: uuid("deal_id").references(() => deals.id).notNull(), amountCents: integer("amount_cents").notNull(), status: proposalStatus("status").default("aberta").notNull(), validUntil: timestamp("valid_until", { withTimezone: true }), notes: text("notes"), ...audit });
export const sales = pgTable("sales", { id: uuid("id").defaultRandom().primaryKey(), dealId: uuid("deal_id").references(() => deals.id).notNull(), propertyId: uuid("property_id").references(() => properties.id).notNull(), proposalId: uuid("proposal_id").references(() => proposals.id), amountCents: integer("amount_cents").notNull(), commissionCents: integer("commission_cents").notNull(), soldAt: timestamp("sold_at", { withTimezone: true }).defaultNow().notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [uniqueIndex("sales_deal_uq").on(t.dealId), uniqueIndex("sales_property_uq").on(t.propertyId)]);

export const searchAlerts = pgTable("search_alerts", { id: uuid("id").defaultRandom().primaryKey(), email: varchar("email", { length: 254 }).notNull(), filters: jsonb("filters").$type<Record<string, unknown>>().notNull(), tokenHash: text("token_hash").notNull(), confirmedAt: timestamp("confirmed_at", { withTimezone: true }), cancelledAt: timestamp("cancelled_at", { withTimezone: true }), ...audit }, (t) => [uniqueIndex("search_alert_token_uq").on(t.tokenHash)]);
export const notifications = pgTable("notifications", { id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), title: varchar("title", { length: 160 }).notNull(), body: text("body").notNull(), href: text("href"), readAt: timestamp("read_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const activityLogs = pgTable("activity_logs", { id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").references(() => users.id), entityType: varchar("entity_type", { length: 60 }).notNull(), entityId: uuid("entity_id"), action: varchar("action", { length: 80 }).notNull(), details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("activity_logs_entity_idx").on(t.entityType, t.entityId, t.createdAt)]);
export const rateLimits = pgTable("rate_limits", { keyHash: text("key_hash").primaryKey(), count: integer("count").default(1).notNull(), windowEndsAt: timestamp("window_ends_at", { withTimezone: true }).notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() });
export const propertyViews = pgTable("property_views", { id: uuid("id").defaultRandom().primaryKey(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(), visitorHash: text("visitor_hash").notNull(), viewedOn: timestamp("viewed_on", { mode: "date" }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [uniqueIndex("property_views_dedupe_uq").on(t.propertyId, t.visitorHash, t.viewedOn)]);
export const whatsappClicks = pgTable("whatsapp_clicks", { id: uuid("id").defaultRandom().primaryKey(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }), visitorHash: text("visitor_hash").notNull(), source: varchar("source", { length: 50 }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("whatsapp_clicks_property_idx").on(t.propertyId, t.createdAt)]);

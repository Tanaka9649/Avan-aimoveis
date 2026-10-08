import {
  boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable,
  primaryKey, text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";
import { defaultAccess, type Access } from "../../lib/permissions";

export const userRole = pgEnum("user_role", ["admin", "equipe"]);
export const globalRole = pgEnum("global_role", ["user", "super_admin"]);
export const tenantStatus = pgEnum("tenant_status", ["configuring", "trial", "active", "suspended", "cancelled"]);
export const membershipRole = pgEnum("membership_role", ["owner", "admin", "manager", "agent", "viewer"]);
export const membershipStatus = pgEnum("membership_status", ["invited", "active", "suspended"]);
export const domainStatus = pgEnum("domain_status", ["pending", "verifying", "active", "error"]);
export const provisionStatus = pgEnum("provision_status", ["pending", "running", "complete", "failed"]);
export const propertyStatus = pgEnum("property_status", ["rascunho", "disponivel", "reservado", "vendido", "pausado"]);
export const visitStatus = pgEnum("visit_status", ["agendada", "realizada", "cancelada", "nao_compareceu"]);
export const proposalStatus = pgEnum("proposal_status", ["aberta", "enviada", "em_negociacao", "contraproposta", "aceita", "recusada", "expirada"]);

const audit = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  status: tenantStatus("status").default("configuring").notNull(),
  plan: varchar("plan", { length: 40 }).default("starter").notNull(),
  phone: varchar("phone", { length: 30 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  email: varchar("email", { length: 254 }),
  branding: jsonb("branding").$type<{ logoLight?: string; logoDark?: string; favicon?: string }>().default({}).notNull(),
  site: jsonb("site").$type<{ primaryColor?: string; secondaryColor?: string; accentColor?: string; title?: string; description?: string }>().default({}).notNull(),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
  quotaOverrides: jsonb("quota_overrides").$type<Record<string, number | null>>().default({}).notNull(),
  standardDomain: varchar("standard_domain", { length: 253 }),
  customDomain: varchar("custom_domain", { length: 253 }),
  domainStatus: domainStatus("domain_status").default("pending").notNull(),
  ...audit,
}, (t) => [uniqueIndex("tenants_slug_uq").on(t.slug), uniqueIndex("tenants_custom_domain_uq").on(t.customDomain)]);

export const tenantSlugHistory = pgTable("tenant_slug_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("tenant_slug_history_slug_uq").on(t.slug), index("tenant_slug_history_tenant_idx").on(t.tenantId)]);

export const plans = pgTable("plans", {
  code: varchar("code", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  limits: jsonb("limits").$type<Record<string, number | null>>().default({}).notNull(),
  modules: jsonb("modules").$type<string[]>().default([]).notNull(),
  active: boolean("active").default(true).notNull(),
  ...audit,
});

export const reminderSettings = pgTable("reminder_settings", {
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  key: text("key").notNull(),
  panel: boolean("panel").default(true).notNull(),
  email: boolean("email").default(true).notNull(),
  recipients: jsonb("recipients").$type<string[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.tenantId, t.key] })]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").default("equipe").notNull(),
  globalRole: globalRole("global_role").default("user").notNull(),
  active: boolean("active").default(true).notNull(),
  access: jsonb("access").$type<Access>().default(defaultAccess).notNull(),
  ...audit,
}, (t) => [uniqueIndex("users_email_uq").on(t.email)]);

export const tenantMemberships = pgTable("tenant_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: membershipRole("role").default("agent").notNull(),
  status: membershipStatus("status").default("active").notNull(),
  permissions: jsonb("permissions").$type<Access>().default(defaultAccess).notNull(),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  ...audit,
}, (t) => [uniqueIndex("tenant_memberships_tenant_user_uq").on(t.tenantId, t.userId), index("tenant_memberships_user_idx").on(t.userId, t.status)]);

export const tenantInvites = pgTable("tenant_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  role: membershipRole("role").default("agent").notNull(),
  permissions: jsonb("permissions").$type<Access>().default(defaultAccess).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("tenant_invites_token_uq").on(t.tokenHash), index("tenant_invites_tenant_email_idx").on(t.tenantId, t.email)]);

export const tenantModules = pgTable("tenant_modules", {
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  module: varchar("module", { length: 60 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.tenantId, t.module] })]);

export const tenantProvisioning = pgTable("tenant_provisioning", {
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  step: varchar("step", { length: 60 }).notNull(),
  status: provisionStatus("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.tenantId, t.step] })]);

export const sessions = pgTable("sessions", {
  tenantId: uuid("tenant_id").references(() => tenants.id),
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

export const properties = pgTable("properties", {
  tenantId: uuid("tenant_id").references(() => tenants.id),
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
}, (t) => [uniqueIndex("properties_code_uq").on(t.tenantId, t.code), uniqueIndex("properties_slug_uq").on(t.tenantId, t.slug), index("properties_search_idx").on(t.status, t.city, t.type, t.priceCents)]);

export const propertyPhotos = pgTable("property_photos", {
  tenantId: uuid("tenant_id").references(() => tenants.id),
  id: uuid("id").defaultRandom().primaryKey(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  storagePath: text("storage_path").notNull(), alt: varchar("alt", { length: 180 }).notNull(), position: integer("position").notNull(), isCover: boolean("is_cover").default(false).notNull(),
  originalName: varchar("original_name", { length: 240 }),
  originalMime: varchar("original_mime", { length: 100 }),
  sizeBytes: integer("size_bytes"),
  processingStatus: varchar("processing_status", { length: 20 }).default("ready").notNull(),
  // Responsive variants generated asynchronously after the direct upload: { thumb, medium, full } → Neon Object Storage keys.
  // Empty for photos uploaded before the variant pipeline; those fall back to storagePath.
  variants: jsonb("variants").$type<Record<string, string>>().default({}).notNull(),
  blurData: text("blur_data"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("property_photos_order_idx").on(t.propertyId, t.position)]);

export const owners = pgTable("owners", {
  tenantId: uuid("tenant_id").references(() => tenants.id),
  id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 160 }).notNull(), phone: varchar("phone", { length: 30 }).notNull(), email: varchar("email", { length: 254 }), taxIdEncrypted: text("tax_id_encrypted"), notes: text("notes"), ...audit,
});
export const propertyOwners = pgTable("property_owners", {
  tenantId: uuid("tenant_id").references(() => tenants.id),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(), ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "restrict" }).notNull(), ownershipPercent: numeric("ownership_percent", { precision: 5, scale: 2 }),
}, (t) => [primaryKey({ columns: [t.propertyId, t.ownerId] })]);

export const documentCategories = pgTable("document_categories", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 100 }).notNull(), entityType: varchar("entity_type", { length: 30 }).notNull(), active: boolean("active").default(true).notNull(), ...audit });
export const propertyDocuments = pgTable("property_documents", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(), categoryId: uuid("category_id").references(() => documentCategories.id).notNull(), storagePath: text("storage_path").notNull(), originalName: varchar("original_name", { length: 240 }).notNull(), mime: varchar("mime", { length: 100 }).notNull(), size: integer("size").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });

export const clients = pgTable("clients", {
  tenantId: uuid("tenant_id").references(() => tenants.id),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 160 }).notNull(), phone: varchar("phone", { length: 30 }).notNull(), email: varchar("email", { length: 254 }), origin: varchar("origin", { length: 80 }).notNull(),
  budgetMinCents: integer("budget_min_cents"), budgetMaxCents: integer("budget_max_cents"), desiredTypes: jsonb("desired_types").$type<string[]>().default([]).notNull(), desiredRegions: jsonb("desired_regions").$type<string[]>().default([]).notNull(), minBedrooms: integer("min_bedrooms"), minBathrooms: integer("min_bathrooms"), minParkingSpaces: integer("min_parking_spaces"), minArea: numeric("min_area", { precision: 10, scale: 2 }), desiredFeatures: jsonb("desired_features").$type<string[]>().default([]).notNull(), lgpdConsentAt: timestamp("lgpd_consent_at", { withTimezone: true }), anonymizedAt: timestamp("anonymized_at", { withTimezone: true }), ...audit,
}, (t) => [index("clients_contact_idx").on(t.email, t.phone), index("clients_assigned_idx").on(t.assignedTo)]);

export const stages = pgTable("stages", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 80 }).notNull(), position: integer("position").notNull(), color: varchar("color", { length: 20 }).notNull(), isWon: boolean("is_won").default(false).notNull(), isLost: boolean("is_lost").default(false).notNull(), ...audit }, (t) => [uniqueIndex("stages_position_uq").on(t.tenantId, t.position)]);
export const deals = pgTable("deals", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id").references(() => clients.id).notNull(), stageId: uuid("stage_id").references(() => stages.id).notNull(), title: varchar("title", { length: 180 }).notNull(), estimatedValueCents: integer("estimated_value_cents"), position: numeric("position", { precision: 20, scale: 10 }).notNull(), tags: jsonb("tags").$type<string[]>().default([]).notNull(), nextActionAt: timestamp("next_action_at", { withTimezone: true }), nextActionType: varchar("next_action_type", { length: 80 }), nextActionNote: varchar("next_action_note", { length: 500 }), stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true }).defaultNow().notNull(), lostReason: text("lost_reason"), ...audit }, (t) => [index("deals_board_idx").on(t.stageId, t.position), index("deals_next_action_idx").on(t.nextActionAt)]);
export const opportunityAttachments = pgTable("opportunity_attachments", {
  tenantId: uuid("tenant_id").references(() => tenants.id),
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  storageKey: text("storage_key").notNull(),
  originalName: varchar("original_name", { length: 240 }).notNull(),
  displayName: varchar("display_name", { length: 240 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  category: varchar("category", { length: 60 }),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadStatus: varchar("upload_status", { length: 20 }).default("uploading").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("opportunity_attachments_deal_idx").on(t.opportunityId, t.createdAt)]);
export const dealProperties = pgTable("deal_properties", {
  tenantId: uuid("tenant_id").references(() => tenants.id), dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull() }, (t) => [primaryKey({ columns: [t.dealId, t.propertyId] })]);
export const activities = pgTable("activities", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }), clientId: uuid("client_id").references(() => clients.id), userId: uuid("user_id").references(() => users.id), type: varchar("type", { length: 60 }).notNull(), description: text("description").notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("activities_timeline_idx").on(t.clientId, t.occurredAt)]);
export const clientFavorites = pgTable("client_favorites", {
  tenantId: uuid("tenant_id").references(() => tenants.id), clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(), createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [primaryKey({ columns: [t.clientId, t.propertyId] }), index("client_favorites_property_idx").on(t.propertyId)]);
export const clientPropertyPresentations = pgTable("client_property_presentations", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(), userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), channel: varchar("channel", { length: 40 }).notNull(), presentedAt: timestamp("presented_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("client_presentations_idx").on(t.clientId, t.presentedAt), index("property_presentations_idx").on(t.propertyId, t.presentedAt)]);
export const visits = pgTable("visits", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id").references(() => clients.id).notNull(), propertyId: uuid("property_id").references(() => properties.id).notNull(), dealId: uuid("deal_id").references(() => deals.id), assignedTo: uuid("assigned_to").references(() => users.id), status: visitStatus("status").default("agendada").notNull(), scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(), reminderAt: timestamp("reminder_at", { withTimezone: true }), reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }), notes: text("notes"), feedback: text("feedback"), ...audit }, (t) => [index("visits_schedule_idx").on(t.status, t.scheduledAt)]);
export const proposals = pgTable("proposals", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), dealId: uuid("deal_id").references(() => deals.id).notNull(), propertyId: uuid("property_id").references(() => properties.id), advertisedAmountCents: integer("advertised_amount_cents"), amountCents: integer("amount_cents").notNull(), counterAmountCents: integer("counter_amount_cents"), status: proposalStatus("status").default("enviada").notNull(), validUntil: timestamp("valid_until", { withTimezone: true }), notes: text("notes"), ...audit }, (t) => [index("proposals_property_idx").on(t.propertyId, t.createdAt)]);
export const sales = pgTable("sales", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), dealId: uuid("deal_id").references(() => deals.id).notNull(), propertyId: uuid("property_id").references(() => properties.id).notNull(), proposalId: uuid("proposal_id").references(() => proposals.id), advertisedAmountCents: integer("advertised_amount_cents"), amountCents: integer("amount_cents").notNull(), commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }), commissionCents: integer("commission_cents").notNull(), notes: text("notes"), soldAt: timestamp("sold_at", { withTimezone: true }).defaultNow().notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [uniqueIndex("sales_deal_uq").on(t.dealId), uniqueIndex("sales_property_uq").on(t.propertyId)]);

export const searchAlerts = pgTable("search_alerts", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), email: varchar("email", { length: 254 }).notNull(), filters: jsonb("filters").$type<Record<string, unknown>>().notNull(), tokenHash: text("token_hash").notNull(), confirmedAt: timestamp("confirmed_at", { withTimezone: true }), cancelledAt: timestamp("cancelled_at", { withTimezone: true }), ...audit }, (t) => [uniqueIndex("search_alert_token_uq").on(t.tokenHash)]);
export const notifications = pgTable("notifications", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), title: varchar("title", { length: 160 }).notNull(), body: text("body").notNull(), href: text("href"), readAt: timestamp("read_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const activityLogs = pgTable("activity_logs", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").references(() => users.id), entityType: varchar("entity_type", { length: 60 }).notNull(), entityId: uuid("entity_id"), action: varchar("action", { length: 80 }).notNull(), details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("activity_logs_entity_idx").on(t.entityType, t.entityId, t.createdAt)]);
export const rateLimits = pgTable("rate_limits", { keyHash: text("key_hash").primaryKey(), count: integer("count").default(1).notNull(), windowEndsAt: timestamp("window_ends_at", { withTimezone: true }).notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() });
export const propertyViews = pgTable("property_views", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(), visitorHash: text("visitor_hash").notNull(), viewedOn: timestamp("viewed_on", { mode: "date" }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [uniqueIndex("property_views_dedupe_uq").on(t.tenantId, t.propertyId, t.visitorHash, t.viewedOn)]);
export const whatsappClicks = pgTable("whatsapp_clicks", {
  tenantId: uuid("tenant_id").references(() => tenants.id), id: uuid("id").defaultRandom().primaryKey(), propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }), visitorHash: text("visitor_hash").notNull(), source: varchar("source", { length: 50 }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("whatsapp_clicks_property_idx").on(t.propertyId, t.createdAt)]);


export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 40 }).notNull(),
  anonymousSessionId: text("anonymous_session_id").notNull(),
  utmSource: varchar("utm_source", { length: 160 }),
  utmMedium: varchar("utm_medium", { length: 160 }),
  utmCampaign: varchar("utm_campaign", { length: 160 }),
  utmContent: varchar("utm_content", { length: 160 }),
  utmTerm: varchar("utm_term", { length: 160 }),
  referrer: text("referrer"),
  dedupeKey: text("dedupe_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("analytics_events_tenant_created_idx").on(t.tenantId, t.createdAt), index("analytics_events_tenant_property_idx").on(t.tenantId, t.propertyId, t.createdAt), uniqueIndex("analytics_events_dedupe_uq").on(t.tenantId, t.dedupeKey)]);

export const analyticsDaily = pgTable("analytics_daily", {
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  day: date("day", { mode: "date" }).notNull(),
  eventType: varchar("event_type", { length: 40 }).notNull(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  total: integer("total").default(0).notNull(),
  uniqueVisitors: integer("unique_visitors").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("analytics_daily_uq").on(t.tenantId, t.day, t.eventType, t.propertyId)]);

export const tenantAuditLogs = pgTable("tenant_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 60 }).notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("tenant_audit_logs_tenant_created_idx").on(t.tenantId, t.createdAt)]);

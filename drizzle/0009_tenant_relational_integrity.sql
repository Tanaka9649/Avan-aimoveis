-- Defense in depth for tenant-owned relationships.
-- Application queries must still scope by tenant_id; these constraints prevent a
-- malformed or compromised write from linking records that belong to two tenants.

UPDATE plans
SET modules = '["dashboard","imoveis","clientes","crm","visitas","propostas","proprietarios","analytics"]'::jsonb,
    updated_at = now()
WHERE code = 'custom' AND modules = '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS properties_tenant_id_uq ON properties (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS owners_tenant_id_uq ON owners (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS document_categories_tenant_id_uq ON document_categories (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_id_uq ON clients (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS stages_tenant_id_uq ON stages (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS deals_tenant_id_uq ON deals (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS proposals_tenant_id_uq ON proposals (tenant_id, id);
--> statement-breakpoint
ALTER TABLE property_photos
  ADD CONSTRAINT property_photos_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE property_owners
  ADD CONSTRAINT property_owners_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE property_owners
  ADD CONSTRAINT property_owners_tenant_owner_fk
  FOREIGN KEY (tenant_id, owner_id) REFERENCES owners (tenant_id, id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE property_documents
  ADD CONSTRAINT property_documents_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE property_documents
  ADD CONSTRAINT property_documents_tenant_category_fk
  FOREIGN KEY (tenant_id, category_id) REFERENCES document_categories (tenant_id, id);
--> statement-breakpoint
ALTER TABLE deals
  ADD CONSTRAINT deals_tenant_client_fk
  FOREIGN KEY (tenant_id, client_id) REFERENCES clients (tenant_id, id);
--> statement-breakpoint
ALTER TABLE deals
  ADD CONSTRAINT deals_tenant_stage_fk
  FOREIGN KEY (tenant_id, stage_id) REFERENCES stages (tenant_id, id);
--> statement-breakpoint
ALTER TABLE opportunity_attachments
  ADD CONSTRAINT opportunity_attachments_tenant_deal_fk
  FOREIGN KEY (tenant_id, opportunity_id) REFERENCES deals (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE deal_properties
  ADD CONSTRAINT deal_properties_tenant_deal_fk
  FOREIGN KEY (tenant_id, deal_id) REFERENCES deals (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE deal_properties
  ADD CONSTRAINT deal_properties_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE activities
  ADD CONSTRAINT activities_tenant_deal_fk
  FOREIGN KEY (tenant_id, deal_id) REFERENCES deals (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE activities
  ADD CONSTRAINT activities_tenant_client_fk
  FOREIGN KEY (tenant_id, client_id) REFERENCES clients (tenant_id, id);
--> statement-breakpoint
ALTER TABLE client_favorites
  ADD CONSTRAINT client_favorites_tenant_client_fk
  FOREIGN KEY (tenant_id, client_id) REFERENCES clients (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE client_favorites
  ADD CONSTRAINT client_favorites_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE client_property_presentations
  ADD CONSTRAINT client_presentations_tenant_client_fk
  FOREIGN KEY (tenant_id, client_id) REFERENCES clients (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE client_property_presentations
  ADD CONSTRAINT client_presentations_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE visits
  ADD CONSTRAINT visits_tenant_client_fk
  FOREIGN KEY (tenant_id, client_id) REFERENCES clients (tenant_id, id);
--> statement-breakpoint
ALTER TABLE visits
  ADD CONSTRAINT visits_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id);
--> statement-breakpoint
ALTER TABLE visits
  ADD CONSTRAINT visits_tenant_deal_fk
  FOREIGN KEY (tenant_id, deal_id) REFERENCES deals (tenant_id, id);
--> statement-breakpoint
ALTER TABLE proposals
  ADD CONSTRAINT proposals_tenant_deal_fk
  FOREIGN KEY (tenant_id, deal_id) REFERENCES deals (tenant_id, id);
--> statement-breakpoint
ALTER TABLE proposals
  ADD CONSTRAINT proposals_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id);
--> statement-breakpoint
ALTER TABLE sales
  ADD CONSTRAINT sales_tenant_deal_fk
  FOREIGN KEY (tenant_id, deal_id) REFERENCES deals (tenant_id, id);
--> statement-breakpoint
ALTER TABLE sales
  ADD CONSTRAINT sales_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id);
--> statement-breakpoint
ALTER TABLE sales
  ADD CONSTRAINT sales_tenant_proposal_fk
  FOREIGN KEY (tenant_id, proposal_id) REFERENCES proposals (tenant_id, id);
--> statement-breakpoint
ALTER TABLE property_views
  ADD CONSTRAINT property_views_tenant_property_fk
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE;

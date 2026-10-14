import {randomUUID} from "node:crypto";

/** Only for an empty, isolated Preview database. No contact belongs to a real person. */
export function previewFixtureQueries(passwordHash: string) {
  if(!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash))throw new Error("synthetic_password_hash_required");
  const tenantA=randomUUID(),tenantB=randomUUID();
  const modules=["dashboard","imoveis","clientes","crm","visitas","propostas","proprietarios","analytics"];
  const queries:{text:string;params:unknown[]}[]=[{
    text:`DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM users) OR EXISTS(SELECT 1 FROM properties) OR EXISTS(SELECT 1 FROM clients)
        OR EXISTS(SELECT 1 FROM owners) OR EXISTS(SELECT 1 FROM deals) OR EXISTS(SELECT 1 FROM tenant_invites)
        OR EXISTS(SELECT 1 FROM tenants WHERE slug<>'avanca-imoveis') THEN
        RAISE EXCEPTION 'preview_fixture_requires_empty_database';
      END IF;
    END $$`,params:[],
  },{
    text:"UPDATE plans SET name='AUDIT TEMPORARY - NOT COMMERCIAL', limits=$1::jsonb,modules=$2::jsonb,active=true WHERE code='custom'",
    params:[JSON.stringify({max_users:20,max_properties:20,max_clients:200,max_opportunities:200,max_documents:30,max_storage_bytes:104857600,custom_domain:0}),JSON.stringify(modules)],
  }];
  for(const [id,label,slug] of [[tenantA,"AUDIT Synthetic A","audit-synthetic-a"],[tenantB,"AUDIT Synthetic B","audit-synthetic-b"]]){
    queries.push({text:"INSERT INTO tenants(id,name,slug,status,plan,branding) VALUES($1,$2,$3,'active','custom','{}')",params:[id,label,slug]});
    queries.push({text:"INSERT INTO tenant_modules(tenant_id,module,enabled) SELECT $1,m,true FROM jsonb_array_elements_text($2::jsonb) m",params:[id,JSON.stringify(modules)]});
    queries.push({text:"INSERT INTO reminder_settings(tenant_id,key,panel,email,recipients) VALUES($1,'visits',true,false,'[]')",params:[id]});
    queries.push({text:`INSERT INTO stages(tenant_id,name,position,color,is_won,is_lost) SELECT $1,name,pos,'#5477bf',won,lost FROM (VALUES ('Novos leads',10,false,false),('Em contato',20,false,false),('Visita',30,false,false),('Proposta',40,false,false),('Ganho',50,true,false),('Perdido',60,false,true)) defaults(name,pos,won,lost)`,params:[id]});
    queries.push({text:"INSERT INTO document_categories(tenant_id,name,entity_type) VALUES($1,'Matrícula','property'),($1,'IPTU','property'),($1,'Documento pessoal','owner')",params:[id]});
  }
  const accounts=[
    [tenantA,"superadmin","owner","all","super_admin"],
    [tenantA,"admin-a","admin","all","user"],
    [tenantA,"broker-a1","agent","own","user"],
    [tenantA,"broker-a2","agent","own","user"],
    [tenantA,"viewer-a","viewer","all","user"],
    [tenantB,"admin-b","admin","all","user"],
  ];
  for(const [tenant,label,role,scope,global] of accounts){
    const id=randomUUID();
    queries.push({text:"INSERT INTO users(id,name,email,password_hash,role,global_role) VALUES($1,$2,$3,$4,'equipe',$5::global_role)",params:[id,"AUDIT "+label,label+"@example.invalid",passwordHash,global]});
    queries.push({text:"INSERT INTO tenant_memberships(tenant_id,user_id,role,status,permissions,activated_at) VALUES($1,$2,$3::membership_role,'active',$4::jsonb,now())",params:[tenant,id,role,JSON.stringify({modules,clients:scope})]});
  }
  return queries;
}

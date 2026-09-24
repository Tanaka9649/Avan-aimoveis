import {and,asc,count,desc,eq,ilike,inArray,isNotNull,or,sql} from "drizzle-orm";
import {getDb} from "@/db";
import {activities,clientFavorites,clientPropertyPresentations,clients,deals,properties,proposals,stages,visits} from "@/db/schema";
import {clientScope,requireModule} from "@/lib/access";
import {formatMoney} from "@/lib/format";
import {PAGE_SIZE,pageNumber,type Query,value} from "@/lib/list-query";
import {propertyMatch} from "@/lib/property-match";
import {CrmWorkspace,type CrmClient} from "@/components/crm-workspace";

const amount=(value:number|null)=>value===null?"Valor não informado":formatMoney(value);
const statMap=(rows:{clientId:string|null;value:number}[])=>new Map(rows.flatMap(row=>row.clientId?[[row.clientId,row.value] as const]:[]));

export default async function CrmPage({searchParams}:{searchParams:Promise<Query>}){
 const user=await requireModule("crm");
 const db=getDb();
 const query=await searchParams;
 const page=pageNumber(query);
 const search=value(query,"q");
 const view=value(query,"view")==="clientes"?"clientes":"funil";
 const selectedClientId=value(query,"cliente");
 const dealSearch=search?or(ilike(deals.title,`%${search}%`),ilike(clients.name,`%${search}%`),ilike(clients.phone,`%${search}%`),ilike(clients.email,`%${search}%`),sql<boolean>`exists (select 1 from deal_properties dp inner join properties p on p.id = dp.property_id where dp.deal_id = ${deals.id} and (p.title ilike ${`%${search}%`} or p.code ilike ${`%${search}%`}))`):undefined;
 const clientSearch=search?or(ilike(clients.name,`%${search}%`),ilike(clients.phone,`%${search}%`),ilike(clients.email,`%${search}%`),sql<boolean>`exists (select 1 from deals d where d.client_id = ${clients.id} and d.title ilike ${`%${search}%`})`,sql<boolean>`exists (select 1 from deals d inner join deal_properties dp on dp.deal_id = d.id inner join properties p on p.id = dp.property_id where d.client_id = ${clients.id} and (p.title ilike ${`%${search}%`} or p.code ilike ${`%${search}%`}))`):undefined;
 const dealWhere=and(clientScope(user),dealSearch);
 const clientWhere=and(clientScope(user),clientSearch);
 const[[dealCount],[clientCount],stageRows,dealRows,clientRows,available]=await Promise.all([
  db.select({value:count()}).from(deals).innerJoin(clients,eq(clients.id,deals.clientId)).where(dealWhere),
  db.select({value:count()}).from(clients).where(clientWhere),
  db.select({id:stages.id,name:stages.name,color:stages.color,isWon:stages.isWon,isLost:stages.isLost}).from(stages).orderBy(asc(stages.position)),
  db.select({id:deals.id,title:deals.title,clientId:clients.id,client:clients.name,phone:clients.phone,email:clients.email,stageId:deals.stageId,value:deals.estimatedValueCents,tags:deals.tags,nextActionAt:deals.nextActionAt,nextActionType:deals.nextActionType,nextActionNote:deals.nextActionNote,stageEnteredAt:deals.stageEnteredAt,attachmentCount:sql<number>`(select count(*)::int from opportunity_attachments oa where oa.opportunity_id=${deals.id} and oa.upload_status='ready')`}).from(deals).innerJoin(clients,eq(clients.id,deals.clientId)).where(dealWhere).orderBy(asc(deals.position),asc(deals.id)),
  db.select().from(clients).where(clientWhere).orderBy(desc(clients.updatedAt)).limit(PAGE_SIZE).offset((page-1)*PAGE_SIZE),
  db.select({priceCents:properties.priceCents,type:properties.type,neighborhood:properties.neighborhood,city:properties.city,bedrooms:properties.bedrooms,bathrooms:properties.bathrooms,parkingSpaces:properties.parkingSpaces,features:properties.features}).from(properties).where(eq(properties.status,"disponivel")).orderBy(desc(properties.updatedAt)).limit(200),
 ]);
 const [selectedClient]=selectedClientId&&!clientRows.some(client=>client.id===selectedClientId)?await db.select().from(clients).where(and(eq(clients.id,selectedClientId),clientScope(user))).limit(1):[];
 const visibleClients=selectedClient?[selectedClient,...clientRows.slice(0,PAGE_SIZE-1)]:clientRows;
 const clientIds=visibleClients.map(client=>client.id);
 const[dealStats,favoriteStats,presentationStats,visitStats,proposalStats,historyStats,nextActions]=clientIds.length?await Promise.all([
  db.select({clientId:deals.clientId,value:count()}).from(deals).where(inArray(deals.clientId,clientIds)).groupBy(deals.clientId),
  db.select({clientId:clientFavorites.clientId,value:count()}).from(clientFavorites).where(inArray(clientFavorites.clientId,clientIds)).groupBy(clientFavorites.clientId),
  db.select({clientId:clientPropertyPresentations.clientId,value:count()}).from(clientPropertyPresentations).where(inArray(clientPropertyPresentations.clientId,clientIds)).groupBy(clientPropertyPresentations.clientId),
  db.select({clientId:visits.clientId,value:count()}).from(visits).where(inArray(visits.clientId,clientIds)).groupBy(visits.clientId),
  db.select({clientId:deals.clientId,value:count()}).from(proposals).innerJoin(deals,eq(deals.id,proposals.dealId)).where(inArray(deals.clientId,clientIds)).groupBy(deals.clientId),
  db.select({clientId:activities.clientId,value:count()}).from(activities).where(inArray(activities.clientId,clientIds)).groupBy(activities.clientId),
  db.select({clientId:deals.clientId,nextActionAt:deals.nextActionAt,nextActionType:deals.nextActionType}).from(deals).where(and(inArray(deals.clientId,clientIds),isNotNull(deals.nextActionAt))).orderBy(asc(deals.nextActionAt)),
 ]):[[],[],[],[],[],[],[]];
 const dealCountByClient=statMap(dealStats);const favoritesByClient=statMap(favoriteStats);const presentationsByClient=statMap(presentationStats);const visitsByClient=statMap(visitStats);const proposalsByClient=statMap(proposalStats);const historyByClient=statMap(historyStats);
 const nextActionByClient=new Map<string,{nextActionAt:Date;nextActionType:string|null}>();
 for(const action of nextActions)if(action.clientId&&action.nextActionAt&&!nextActionByClient.has(action.clientId))nextActionByClient.set(action.clientId,{nextActionAt:action.nextActionAt,nextActionType:action.nextActionType});
 const referenceTime=new Date().getTime();
 const cards=dealRows.map(card=>({...card,attachmentCount:Number(card.attachmentCount),value:amount(card.value),nextActionAt:card.nextActionAt?.toISOString()??null,stageDays:Math.max(0,Math.floor((referenceTime-card.stageEnteredAt.getTime())/86400000))}));
 const clientCards:CrmClient[]=visibleClients.map(client=>({
  id:client.id,name:client.name,phone:client.phone,email:client.email,origin:client.origin,budgetMin:client.budgetMinCents,budgetMax:client.budgetMaxCents,desiredTypes:client.desiredTypes,desiredRegions:client.desiredRegions,desiredFeatures:client.desiredFeatures,minBedrooms:client.minBedrooms??0,minBathrooms:client.minBathrooms??0,minParkingSpaces:client.minParkingSpaces??0,
  opportunities:dealCountByClient.get(client.id)||0,favorites:favoritesByClient.get(client.id)||0,presented:presentationsByClient.get(client.id)||0,visits:visitsByClient.get(client.id)||0,proposals:proposalsByClient.get(client.id)||0,history:historyByClient.get(client.id)||0,matches:available.filter(property=>propertyMatch(client,property).score>=45).length,nextActionAt:nextActionByClient.get(client.id)?.nextActionAt.toISOString()||null,nextActionType:nextActionByClient.get(client.id)?.nextActionType||null,
 }));
 return <CrmWorkspace key={`${selectedClientId}-${value(query,"novo")}`} userId={user.id} query={query} view={view} columns={stageRows} cards={cards} clients={clientCards} dealTotal={dealCount.value} clientTotal={clientCount.value} selectedClientId={selectedClientId||undefined} openNew={value(query,"novo")==="1"}/>;
}

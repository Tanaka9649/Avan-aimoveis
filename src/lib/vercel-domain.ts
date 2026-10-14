import "server-only";
export type DomainEvidence = {
  name?: string; verified?: boolean;
  verification?: Array<{type:string;domain:string;value:string;reason?:string}>;
  error?: {code?:string};
};
export type DnsEvidence = {misconfigured?:boolean;recommendedCNAME?:Array<{rank:number;value:string}>;recommendedIPv4?:Array<{rank:number;value:string[]}>};
export function domainIntegrationConfigured(){return Boolean(process.env.VERCEL_API_TOKEN&&(process.env.VERCEL_PROJECT_ID||process.env.VERCEL_PROJECT_NAME));}
async function request(path:string,init:RequestInit={}) {
  if(!domainIntegrationConfigured())throw new Error("domain_config_missing");
  const project=process.env.VERCEL_PROJECT_ID||process.env.VERCEL_PROJECT_NAME!;
  const url=new URL(path.replace("{project}",encodeURIComponent(project)),"https://api.vercel.com");
  if(process.env.VERCEL_TEAM_ID)url.searchParams.set("teamId",process.env.VERCEL_TEAM_ID);
  if(path.endsWith("/config"))url.searchParams.set("projectIdOrName",project);
  return fetch(url,{...init,headers:{authorization:`Bearer ${process.env.VERCEL_API_TOKEN}`,"content-type":"application/json"},cache:"no-store",signal:AbortSignal.timeout(10000)});
}
export async function verifyProjectDomain(domain:string) {
  const path=`/v9/projects/{project}/domains/${encodeURIComponent(domain)}`;
  let response=await request(path);
  if(response.status===404) {
    const added=await request("/v10/projects/{project}/domains",{method:"POST",body:JSON.stringify({name:domain})});
    if(!added.ok)throw new Error("domain_not_attached");
    response=await request(path);
  }
  if(!response.ok)throw new Error("domain_not_owned");
  let data=await response.json() as DomainEvidence;
  if(data.name!==domain)throw new Error("domain_mismatch");
  if(!data.verified){
    const verified=await request(path+"/verify",{method:"POST"});
    if(verified.ok)data=await verified.json() as DomainEvidence;
  }
  const configuration=await request(`/v6/domains/${encodeURIComponent(domain)}/config`);
  if(!configuration.ok)throw new Error("domain_dns_unavailable");
  const dns=await configuration.json() as DnsEvidence;
  return {
    active:data.name===domain&&data.verified===true&&dns.misconfigured===false,
    verification:data.verification||[],
    dns:{misconfigured:dns.misconfigured!==false,recommendedCNAME:dns.recommendedCNAME||[],recommendedIPv4:dns.recommendedIPv4||[]},
  };
}
export async function removeProjectDomain(domain:string) {
  const response=await request(`/v9/projects/{project}/domains/${encodeURIComponent(domain)}`,{method:"DELETE"});
  if(!response.ok&&response.status!==404)throw new Error("domain_removal_failed");
}

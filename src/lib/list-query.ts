export type Query=Record<string,string|string[]|undefined>;
export function value(q:Query,key:string){return typeof q[key]==="string"?q[key].slice(0,200):"";}
export function pageNumber(q:Query){const n=Number(value(q,"page"));return Number.isSafeInteger(n)&&n>0?Math.min(n,100000):1;}
export const PAGE_SIZE=20;
export function pageHref(q:Query,page:number){const p=new URLSearchParams();for(const [k,v]of Object.entries(q))if(typeof v==="string"&&k!=="page")p.set(k,v);p.set("page",String(page));return "?"+p.toString();}

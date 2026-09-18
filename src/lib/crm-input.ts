export function dealPosition(timestampMs:number){
 if(!Number.isSafeInteger(timestampMs)||timestampMs<0)throw new Error("Timestamp inválido");
 return (timestampMs/1000).toFixed(3);
}

export function maskPhone(value:string){
 const raw=value.replace(/\D/g,"").slice(0,11);
 if(raw.length<=2)return raw;
 if(raw.length<=6)return`(${raw.slice(0,2)}) ${raw.slice(2)}`;
 if(raw.length<=10)return`(${raw.slice(0,2)}) ${raw.slice(2,6)}-${raw.slice(6)}`;
 return`(${raw.slice(0,2)}) ${raw.slice(2,7)}-${raw.slice(7)}`;
}

export function moneyDigits(value:string){return value.replace(/\D/g,"");}

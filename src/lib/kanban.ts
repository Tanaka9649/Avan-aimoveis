export function placeCard<T extends {id:string;stageId:string}>(cards:T[],id:string,stageId:string,beforeId:string|null):T[]{
 const card=cards.find(c=>c.id===id);if(!card)return cards;
 const next=cards.filter(c=>c.id!==id);const index=beforeId?next.findIndex(c=>c.id===beforeId):-1;
 next.splice(index<0?next.length:index,0,{...card,stageId});return next;
}

/** Inspect structured nested DB errors without logging query text, parameters or secrets. */
export function databaseErrorIs(error: unknown, marker: string): boolean {
  let current=error;
  for(let depth=0;depth<5&&current&&typeof current==="object";depth++){
    const value=current as {message?:unknown;constraint?:unknown;cause?:unknown};
    if(value.constraint===marker||(typeof value.message==="string"&&value.message.includes(marker)))return true;
    current=value.cause;
  }
  return false;
}

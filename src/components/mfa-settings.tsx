"use client";
import { useState } from "react";

export function MfaSettings({enabled,configured}:{enabled:boolean;configured:boolean}){
  const [setup,setSetup]=useState<{secret:string;uri:string}|null>(null);
  const [codes,setCodes]=useState<string[]>([]);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(form:FormData){
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/auth/mfa",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(form))});
      const result=await response.json();
      if(!response.ok){setMessage(result.error||"Não foi possível concluir.");return;}
      if(result.secret)setSetup({secret:result.secret,uri:result.uri});
      if(result.recoveryCodes){setCodes(result.recoveryCodes);setSetup(null);}
      setMessage(result.message||"Adicione a chave ao seu autenticador e confirme um código.");
    }catch{setMessage("Não foi possível conectar. Tente novamente.");}finally{setBusy(false);}
  }
  return <section className="admin-card"><h2>Segundo fator do Super Admin</h2><p>{enabled?"Ativo. A senha e um código são exigidos nos próximos logins.":"Opcional até a confirmação pelo titular. Use um aplicativo autenticador TOTP."}</p>
    {!configured?<p role="status">Configuração operacional pendente: chave de criptografia MFA_ENCRYPTION_KEY.</p>:null}
    {codes.length?<><p>Estes códigos de recuperação são exibidos somente agora. Cada um funciona uma única vez, junto da senha.</p><ul aria-label="Códigos de recuperação">{codes.map(code=><li key={code}><code>{code}</code></li>)}</ul><a href="/login">Guardei os códigos. Ir ao login</a></>:<form action={submit} className="entity-form" aria-busy={busy}>
      <input type="hidden" name="action" value={enabled?"disable":setup?"enable":"setup"}/>
      <label>Confirme sua senha<input name="password" type="password" autoComplete="current-password" minLength={8} required disabled={busy}/></label>
      {setup?<div className="wide"><p>No autenticador, escolha adicionar uma chave manualmente (TOTP, 6 dígitos, 30 segundos).</p><code style={{overflowWrap:"anywhere"}}>{setup.secret}</code></div>:null}
      {setup||enabled?<label>{enabled?"Código do autenticador ou de recuperação":"Código do autenticador"}<input name="code" autoComplete="one-time-code" maxLength={39} required disabled={busy}/></label>:null}
      <button className="admin-button primary" disabled={busy||!configured}>{busy?"Verificando…":enabled?"Desativar e encerrar sessões":setup?"Confirmar e ativar":"Configurar segundo fator"}</button>
    </form>}
    {message?<p role="status">{message}</p>:null}
  </section>;
}

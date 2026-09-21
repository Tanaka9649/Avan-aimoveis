"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageDown, Loader2 } from "lucide-react";

type Status = { pending: number; processed: number; running: boolean; message: string };

/**
 * One-time migration for photos uploaded before the thumbnail pipeline.
 *
 * It appears only while something is pending and walks the queue in small batches, so the whole
 * portfolio can be optimised from the panel — no terminal, no deploy, no database access needed.
 */
export function PhotoOptimizer() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ pending: 0, processed: 0, running: false, message: "" });

  useEffect(() => {
    let active = true;
    fetch("/api/properties/photos/variants")
      .then((response) => (response.ok ? response.json() : { pending: 0 }))
      .then((data) => { if (active) setStatus((old) => ({ ...old, pending: Number(data.pending) || 0 })); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function run() {
    setStatus((old) => ({ ...old, running: true, message: "" }));
    let processed = 0;
    for (let batch = 0; batch < 200; batch += 1) {
      const response = await fetch("/api/properties/photos/variants", { method: "POST" });
      if (!response.ok) {
        setStatus((old) => ({ ...old, running: false, message: "Não foi possível concluir. Tente novamente em instantes." }));
        return;
      }
      const data = await response.json();
      processed += Number(data.processed) || 0;
      setStatus({ pending: Number(data.pending) || 0, processed, running: true, message: "" });
      if (!data.processed || !data.pending) {
        setStatus({
          pending: Number(data.pending) || 0,
          processed,
          running: false,
          message: data.pending
            ? `${processed} foto(s) otimizada(s). ${data.pending} não puderam ser processadas agora.`
            : `${processed} foto(s) otimizada(s). As listagens já carregam a versão leve.`,
        });
        router.refresh();
        return;
      }
    }
    setStatus((old) => ({ ...old, running: false, message: "Lote interrompido por segurança. Clique novamente para continuar." }));
  }

  if (!status.pending && !status.message) return null;
  return (
    <section className="photo-optimizer">
      <div>
        <strong><ImageDown size={15} aria-hidden="true" /> Otimizar fotos antigas</strong>
        <p>
          {status.pending
            ? `${status.pending} foto(s) ainda são servidas em tamanho cheio nas listagens. Gerar as miniaturas deixa a aba Imóveis bem mais rápida.`
            : status.message}
        </p>
        {status.pending && status.message ? <p className="photo-optimizer-note">{status.message}</p> : null}
      </div>
      {status.pending ? (
        <button className="admin-button secondary" type="button" onClick={run} disabled={status.running}>
          {status.running ? <><Loader2 className="spin" /> Otimizando… {status.processed}</> : "Otimizar agora"}
        </button>
      ) : null}
    </section>
  );
}

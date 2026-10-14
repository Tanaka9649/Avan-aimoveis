export function visitStatusError(status: string, scheduledAt: Date, now = new Date()) {
  return (status === "realizada" || status === "nao_compareceu") && scheduledAt > now
    ? "Uma visita futura não pode ser marcada como realizada ou não compareceu." : "";
}

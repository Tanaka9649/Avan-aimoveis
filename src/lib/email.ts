import "server-only";
export function emailConfigured() { return Boolean(process.env.RESEND_API_KEY && (process.env.AUTH_EMAIL_FROM || process.env.LEADS_NOTIFY_FROM)); }
export async function sendEmail(input: { to: string; subject: string; text: string; key: string }) {
  if (!emailConfigured()) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": input.key },
      body: JSON.stringify({ from: (process.env.AUTH_EMAIL_FROM || process.env.LEADS_NOTIFY_FROM), to: [input.to], subject: input.subject, text: input.text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) console.error("email_delivery_failed", { status: response.status });
    return response.ok;
  } catch { console.error("email_delivery_unavailable"); return false; }
}

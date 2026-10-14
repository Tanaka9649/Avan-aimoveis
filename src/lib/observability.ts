/** Allowlisted operational metadata only. Never pass errors, URLs, tokens or payloads. */
export function reportOperationFailure(operation: "pdf" | "pdf_cover" | "upload" | "provisioning" | "cron" | "domain" | "mfa", code: string) {
  const safeCode = /^[a-z0-9_:-]{1,64}$/i.test(code) ? code : "unexpected_failure";
  console.error(JSON.stringify({ event: "operation_failed", operation, code: safeCode, at: new Date().toISOString() }));
}

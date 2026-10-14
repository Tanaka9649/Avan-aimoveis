import {neon} from "@neondatabase/serverless";
import {hashPassword} from "../src/lib/security";
import {previewFixtureQueries} from "../src/test/preview-fixture";

async function main(){
  // Deliberately do not fall back to DATABASE_URL or DIRECT_URL.
  if(process.env.VERCEL_ENV!=="preview" || process.env.AUDIT_EMPTY_DATABASE_CONFIRMED!=="verified-isolated-preview")throw new Error("isolated_preview_confirmation_required");
  if(process.env.RESEND_API_KEY)throw new Error("disable_email_transport_before_preview_seed");
  const url=new URL(process.env.AUDIT_DATABASE_URL||"");
  if(!["postgres:","postgresql:"].includes(url.protocol) || !url.hostname.endsWith(".neon.tech") || url.hostname!==process.env.AUDIT_EXPECTED_DATABASE_HOST)throw new Error("preview_database_host_mismatch");
  const password=process.env.AUDIT_PREVIEW_PASSWORD||"";
  if(password.length<16 || !process.env.AUTH_PEPPER)throw new Error("isolated_preview_credentials_required");
  const db=neon(url.toString());
  const queries=previewFixtureQueries(await hashPassword(password));
  await db.transaction(queries.map(query=>db.query(query.text,query.params)));
  console.log("Synthetic Preview fixture created: two companies, six test accounts. No email sent. Password not printed.");
}
main().catch(()=>{console.error("Preview fixture refused or failed. Verify isolation, expected hostname, empty database and test-only credentials. No provider details or secrets logged.");process.exitCode=1;});

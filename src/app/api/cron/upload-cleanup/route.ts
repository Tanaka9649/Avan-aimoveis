import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { cleanupAbandonedUploads } from "@/lib/upload-lifecycle";
import { recordOperation } from "@/lib/operation-status";
export const maxDuration=300;
export async function GET(request: Request) {
  if(!cronAuthorized(request))return NextResponse.json({error:"Não autorizado"},{status:401});
  try {
    const result=await cleanupAbandonedUploads();
    await recordOperation("upload-cleanup",result.failed===0);
    return NextResponse.json(result,{status:result.failed?503:200});
  } catch {
    await recordOperation("upload-cleanup",false,"cleanup_failed").catch(()=>undefined);
    return NextResponse.json({error:"Falha na limpeza de uploads."},{status:503});
  }
}

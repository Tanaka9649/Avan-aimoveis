import { NextResponse } from "next/server";
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  // Do not mark reminders sent until the delivery workflow exists.
  return NextResponse.json({ error: "Entrega de lembretes ainda não configurada.", processed: 0 }, { status: 503 });
}

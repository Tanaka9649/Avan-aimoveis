import { NextResponse } from "next/server";
export class ApiAccessError extends Error {
  constructor(public status: 401 | 403) { super(status === 401 ? "Entre novamente para continuar." : "Você não tem permissão para esta ação."); }
}
export function withApiErrors<A extends unknown[], R>(handler: (...args: A) => Promise<R>) {
  return async (...args: A) => {
    try { return await handler(...args); }
    catch (error) {
      if (error instanceof ApiAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  };
}

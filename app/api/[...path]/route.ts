import { env } from 'cloudflare:workers';
import { handleApi } from '../../../server/api';
export const dynamic = 'force-dynamic';
function handler(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database is unavailable.' }, { status: 503 });
  return handleApi(request, env.DB);
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;

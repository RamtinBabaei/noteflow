export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
export function tokenFromCookie(cookie: string | null) {
  const match = cookie?.match(/(?:^|;\s*)noteflow_session=([a-f0-9]{64})(?:;|$)/);
  return match?.[1] ?? null;
}
export function assertMutation(request: Request) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new HttpError(403, 'This request must come from the app.');
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
      throw new HttpError(415, 'Send JSON data.');
  }
}
export async function readBody(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 220000)
    throw new HttpError(413, 'This note is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Request body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 220000) {
      await reader.cancel();
      throw new HttpError(413, 'This note is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'The request contains invalid JSON.');
  }
}

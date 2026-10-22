export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('The server returned an unexpected response. Please try again.');
  }
  if (!response.ok)
    throw new ApiError(
      (body as { error?: string }).error || 'Something went wrong.',
      response.status,
    );
  return body as T;
}

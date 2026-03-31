const JSON_AUTH_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, must-revalidate',
  Vary: 'Cookie'
};

export function jsonResponse<T = unknown>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_AUTH_HEADERS
  });
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Okänt fel';
}

export function jsonResponse<T = unknown>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Okänt fel';
}

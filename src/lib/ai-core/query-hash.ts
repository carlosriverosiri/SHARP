export function buildQueryHash(prompt: string, context: string) {
  return btoa(encodeURIComponent(prompt + '|' + context)).slice(0, 32);
}

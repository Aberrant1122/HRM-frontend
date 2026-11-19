export function getSocketEndpoint(): string {
  return new URL(
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:5001'
  ).origin;
}

import { getAuthToken } from "@/lib/auth/token";
export type ManualItem = { id: number; title: string; responsibleId: number | null; dueDate: string | null; status: string };
export type ManualHistory = { id: number; actorId: number; action: string; version: number; createdAt: string; details: { reason?: string; itemId?: number; before?: Partial<ManualItem> | string; after?: Partial<ManualItem> | string } };
export type ManualOnboarding = {
  employee: { id: number; fullName: string; email: string; role: string; status: string };
  onboarding: { id: number; status: string; version: number } | null;
  items: ManualItem[]; history: ManualHistory[]; hasEarlierHistory: boolean;
  people: { id: number; fullName: string; role: string; status: string }[];
};
export type ManualCommand = { commandKey: string; action: string; expectedVersion: number; itemId?: number; title?: string; responsibleId?: number | null; dueDate?: string | null; reason?: string };
export class OnboardingError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function onboardingRequest(employeeId: string, command?: ManualCommand, before?: number, credential = getAuthToken()): Promise<{ data: ManualOnboarding; replayed?: boolean }> {
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api").replace(/\/$/, "");
  const response = await fetch(`${base}/onboarding/employee/${encodeURIComponent(employeeId)}${command ? '/commands' : before ? `?before=${before}` : ''}`, {
    method: command ? 'POST' : 'GET', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
    cache: 'no-store', ...(command && { body: JSON.stringify(command) }),
  });
  const payload = await response.json();
  if (!response.ok) throw new OnboardingError(payload.message || 'Onboarding unavailable', response.status);
  return payload;
}

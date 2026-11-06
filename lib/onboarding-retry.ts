import type { ManualCommand } from "@/lib/actions/onboarding.actions";

// Memory survives client navigation, but never substitutes for a durable pre-dispatch write.
const retained = new Map<string, ManualCommand>();
type RetryState = { command: ManualCommand | null; error: string };
function decode(raw: string): ManualCommand {
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || typeof value.commandKey !== 'string' || typeof value.action !== 'string' || !Number.isSafeInteger(value.expectedVersion)) throw new Error('Invalid retry data');
  return value;
}
export function readOnboardingRetry(key: string): RetryState {
  const memory = retained.get(key) ?? null;
  try {
    const raw = sessionStorage.getItem(key), stored = raw === null ? null : decode(raw);
    if (memory && stored && JSON.stringify(memory) !== JSON.stringify(stored)) return { command: memory, error: 'Retry data conflicts with another retained change. Keep this tab open and review before continuing.' };
    const command = memory || stored;
    if (command) retained.set(key, command);
    return { command, error: '' };
  } catch {
    return { command: memory, error: 'Retry storage cannot be read. No new change will be sent until storage is available. Keep this tab open and check retry storage.' };
  }
}
export function persistOnboardingRetry(key: string, command: ManualCommand): RetryState {
  const current = readOnboardingRetry(key);
  if (current.error) {
    if (current.command) return current;
    retained.set(key, command);
    return { command, error: current.error + ' This exact change is held in memory only; no request was sent.' };
  }
  if (current.command && JSON.stringify(current.command) !== JSON.stringify(command)) return { ...current, error: 'An earlier change is retained. Retry that exact change before continuing.' };
  retained.set(key, command);
  try {
    const raw = JSON.stringify(command);
    sessionStorage.setItem(key, raw);
    if (sessionStorage.getItem(key) !== raw) throw new Error('Retry write was not retained');
    return { command, error: '' };
  } catch {
    return { command, error: 'Retry storage could not save this change. No request was sent. The exact change is held in memory; closing or reloading this tab may lose it. Restore storage and retry the same change.' };
  }
}
export function clearOnboardingRetry(key: string, command: ManualCommand): string {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw !== null && JSON.stringify(decode(raw)) !== JSON.stringify(command)) return 'Different retry data is retained. It has not been cleared.';
    sessionStorage.removeItem(key);
    if (sessionStorage.getItem(key) !== null) throw new Error('Retry cleanup failed');
    if (retained.get(key)?.commandKey === command.commandKey) retained.delete(key);
    return '';
  } catch { return 'Retry cleanup failed. The original change is retained; retry the same change before continuing.'; }
}

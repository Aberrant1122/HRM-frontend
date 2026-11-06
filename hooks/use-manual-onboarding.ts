"use client";
import { useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth/token";
import { onboardingRequest, OnboardingError, type ManualOnboarding, type ManualCommand } from "@/lib/actions/onboarding.actions";
import { readOnboardingRetry, persistOnboardingRetry, clearOnboardingRetry } from "@/lib/onboarding-retry";

export function useManualOnboarding(employeeId: string, adminId: string, resetEditor: () => void) {
  const token = getAuthToken(), storageKey = `manual-onboarding:${adminId}:${employeeId}`;
  const generation = useRef(0), mounted = useRef(false), requestNumber = useRef(0), inFlight = useRef(false);
  const [data, setData] = useState<ManualOnboarding | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [pending, setPending] = useState<ManualCommand | null>(null), [storageError, setStorageError] = useState('');
  const capture = () => ({ generation: generation.current, token: getAuthToken() });
  type Scope = ReturnType<typeof capture>;
  const current = (scope: Scope) => mounted.current && generation.current === scope.generation && getAuthToken() === scope.token && window.location.pathname.replace(/\/$/, '') === `/admin/employees/${encodeURIComponent(employeeId)}/onboarding`;
  const matches = (value: ManualOnboarding) => value.employee.id === Number(employeeId);

  useEffect(() => {
    const epoch = ++generation.current, credential = token, request = ++requestNumber.current;
    mounted.current = true; inFlight.current = false;
    setData(null); setError(''); setNotice(''); setBusy(false); setLoading(true); resetEditor();
    const retry = readOnboardingRetry(storageKey); setPending(retry.command); setStorageError(retry.error);
    const active = () => mounted.current && generation.current === epoch && getAuthToken() === credential && requestNumber.current === request && window.location.pathname.replace(/\/$/, '') === `/admin/employees/${encodeURIComponent(employeeId)}/onboarding`;
    onboardingRequest(employeeId, undefined, undefined, credential).then(result => {
      if (!active()) return;
      if (result.data.employee.id !== Number(employeeId)) throw new Error('Checklist did not match the selected employee');
      setData(result.data);
    }).catch(error => { if (active()) setError(error.message); }).finally(() => { if (active()) setLoading(false); });
    return () => { mounted.current = false; generation.current++; };
  }, [employeeId, adminId, token, storageKey, resetEditor]);

  async function read(scope: Scope) {
    if (!current(scope)) return false;
    const request = ++requestNumber.current; setLoading(true);
    try {
      const result = await onboardingRequest(employeeId, undefined, undefined, scope.token);
      if (!current(scope) || request !== requestNumber.current) return false;
      if (!matches(result.data)) throw new Error('Checklist did not match the selected employee');
      setData(result.data); setError(''); return true;
    } catch (error) { if (current(scope) && request === requestNumber.current) setError((error as Error).message); return false; }
    finally { if (current(scope) && request === requestNumber.current) setLoading(false); }
  }
  function reload() { if (!inFlight.current) void read(capture()); }
  function retryStorage() {
    const scope = capture(); if (!current(scope) || inFlight.current) return;
    const retry = readOnboardingRetry(storageKey); setPending(retry.command); setStorageError(retry.error);
  }
  async function send(command: ManualCommand) {
    const scope = capture(); if (!current(scope) || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const retry = persistOnboardingRetry(storageKey, command);
      if (!current(scope)) return;
      setPending(retry.command); setStorageError(retry.error);
      if (retry.error) return; // No dispatch without durable, exact retry identity.
      const result = await onboardingRequest(employeeId, command, undefined, scope.token);
      if (!current(scope)) return; // Preserve the original scope's pending record on navigation/auth change.
      if (!matches(result.data)) throw new Error('Checklist did not match the selected employee');
      requestNumber.current++; setData(result.data);
      const cleanup = clearOnboardingRetry(storageKey, command); setStorageError(cleanup);
      if (cleanup) { setPending(command); setNotice('Checklist saved. Retry cleanup is still required.'); return; }
      setPending(null); resetEditor();
      setNotice(result.replayed ? 'Saved earlier; no duplicate history was added.' : 'Checklist saved. Account access and employment status are unchanged.');
    } catch (error) {
      if (!current(scope)) return;
      if (error instanceof OnboardingError && error.status < 500) {
        const cleanup = clearOnboardingRetry(storageKey, command); setStorageError(cleanup);
        if (cleanup) { setPending(command); setError(error.message); return; }
        setPending(null); const reloaded = await read(scope);
        if (!current(scope)) return;
        if (error.status === 409 && !reloaded) setData(null);
        setError(error.status === 409 ? `${error.message} ${reloaded ? 'Latest checklist loaded; review before submitting a new change.' : 'Latest checklist could not be loaded. Reload before continuing.'}` : error.message);
      } else setError('The save outcome is uncertain. Retry the same change to avoid duplicate history.');
    } finally { if (current(scope)) { inFlight.current = false; setBusy(false); } }
  }
  async function earlier() {
    const scope = capture(), original = data;
    if (!current(scope) || inFlight.current || !original?.history.length) return;
    const request = requestNumber.current; inFlight.current = true; setBusy(true);
    try {
      const result = await onboardingRequest(employeeId, undefined, original.history[original.history.length - 1].version, scope.token);
      if (!current(scope) || request !== requestNumber.current) return;
      if (!matches(result.data)) throw new Error('Checklist did not match the selected employee');
      setData(value => {
        if (!current(scope) || !value || value.employee.id !== original.employee.id || value.onboarding?.version !== original.onboarding?.version) return value;
        const ids = new Set(value.history.map(event => event.id));
        return { ...value, history: [...value.history, ...result.data.history.filter(event => !ids.has(event.id))], people: [...value.people, ...result.data.people], hasEarlierHistory: result.data.hasEarlierHistory };
      });
    } catch { if (current(scope)) setError('Earlier history unavailable. Retry loading earlier history.'); }
    finally { if (current(scope)) { inFlight.current = false; setBusy(false); } }
  }
  return { data, error, notice, loading, busy, pending, storageError, reload, retryStorage, send, earlier };
}

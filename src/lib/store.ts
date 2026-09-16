import { useCallback, useEffect, useRef, useState } from "react";
import seed from "@/data/addons.json";
import type { Addon, Audit, Proposal } from "./audit-types";

const KEYS = {
  catalog: "aia.catalog.v1",
  audits: "aia.audits.v1",
  proposals: "aia.proposals.v1",
  staff: "aia.staff.v1",
};

export const STAFF_PIN = "7788";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  emit();
}

export const seedCatalog = seed as Addon[];

export function getCatalog(): Addon[] {
  const stored = read<Addon[] | null>(KEYS.catalog, null);
  return stored?.length ? stored : seedCatalog;
}

export function saveCatalog(next: Addon[]) {
  write(KEYS.catalog, next);
}

export function upsertAddon(addon: Addon) {
  const list = getCatalog();
  const idx = list.findIndex((a) => a.id === addon.id);
  if (idx === -1) saveCatalog([addon, ...list]);
  else saveCatalog(list.map((a) => (a.id === addon.id ? addon : a)));
}

export function resetCatalog() {
  saveCatalog(seedCatalog);
}

export function getAudits(): Audit[] {
  return read<Audit[]>(KEYS.audits, []);
}

export function saveAudit(audit: Audit) {
  const list = getAudits().filter((a) => a.id !== audit.id);
  write(KEYS.audits, [audit, ...list]);
}

export function getAudit(id: string): Audit | undefined {
  return getAudits().find((a) => a.id === id);
}

export function auditsForHost(host: string): Audit[] {
  return getAudits()
    .filter((a) => a.host === host)
    .sort((a, b) => a.attempt - b.attempt);
}

export function getProposals(): Proposal[] {
  return read<Proposal[]>(KEYS.proposals, []);
}

export function saveProposal(proposal: Proposal) {
  const list = getProposals().filter((p) => p.id !== proposal.id);
  write(KEYS.proposals, [proposal, ...list]);
}

export function getProposal(id: string): Proposal | undefined {
  return getProposals().find((p) => p.id === id);
}

export function isStaffUnlocked(): boolean {
  return read<boolean>(KEYS.staff, false);
}

export function setStaffUnlocked(value: boolean) {
  write(KEYS.staff, value);
}

/** Subscribe to storage changes and re-read on every update. */
export function useStore<T>(selector: () => T): [T, () => void] {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const [value, setValue] = useState<T | undefined>(undefined);
  const refresh = useCallback(() => setValue(selectorRef.current()), []);

  useEffect(() => {
    refresh();
    const listener = () => refresh();
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }, [refresh]);

  return [value as T, refresh];
}

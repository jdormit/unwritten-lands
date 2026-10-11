import type { GameState } from "../types/game";

export interface GenerationRecord {
  id: number;
  label: string;
  time: string;
  year: number | null;
  season: string | null;
  prompt: string;
  system: string;
  input_state: GameState | null;
  seeds: Record<string, string>;
  inspiration: string;
  output: unknown;
  status: "pending" | "complete" | "error";
  error: string | null;
  attempts: GenerationAttempt[];
}

interface GenerationAttempt {
  number: number;
  kind: "stream" | "nonstream";
  prompt: string;
  output: unknown;
  raw_response: string | null;
  validation_feedback: string | null;
  status: "pending" | "complete" | "error";
  error: string | null;
}

const MAX_RECORDS = 512;
const STORAGE_KEY = "unwritten-lands-debug";
const listeners = new Set<() => void>();
let nextId = 1;
let records: readonly GenerationRecord[] = [];
let enabled = false;

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeDebug(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isDebugEnabled() { return enabled; }
export function getGenerationRecords() { return records; }

export function setDebugEnabled(value: boolean) {
  enabled = value;
  try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* Storage is optional. */ }
  notify();
}

export function clearGenerationRecords() {
  records = [];
  notify();
}

export function beginGeneration(label: string, system: string, prompt: string, state?: GameState): number {
  const id = nextId++;
  const seeds = Object.fromEntries([...prompt.matchAll(
    /^(?:- )?(Landscape|Cultural inspiration|Mythic tone|Situation|Tension|Scope|Geography|Cultural tone): (.+)$/gm,
  )].map((match) => [match[1], match[2].replace(/^"|"$/g, "")]));
  const inspirationStart = prompt.indexOf("INSPIRATION:");
  const record: GenerationRecord = {
    id, label, system, prompt, time: new Date().toISOString(), input_state: state ? structuredClone(state) : null,
    seeds, inspiration: inspirationStart >= 0 ? prompt.slice(inspirationStart + "INSPIRATION:".length).trim() : "",
    year: state?.current_year ?? null, season: state?.current_season ?? null,
    output: null, status: "pending", error: null, attempts: [],
  };
  records = [...records, record].slice(-MAX_RECORDS);
  notify();
  return id;
}

export function beginAttempt(id: number, prompt: string, kind: GenerationAttempt["kind"]): number {
  const number = (records.find((record) => record.id === id)?.attempts.length ?? 0) + 1;
  records = records.map((record) => record.id === id ? {
    ...record,
    attempts: [...record.attempts, {
      number, kind, prompt, output: null, raw_response: null, validation_feedback: null, status: "pending", error: null,
    }],
  } : record);
  notify();
  return number;
}

function updateAttempt(id: number, number: number, update: Partial<GenerationAttempt>) {
  records = records.map((record) => record.id === id ? {
    ...record,
    attempts: record.attempts.map((attempt) => attempt.number === number ? { ...attempt, ...update } : attempt),
  } : record);
  notify();
}

export function completeAttempt(id: number, number: number, output: unknown) {
  updateAttempt(id, number, { status: "complete", output: structuredClone(output) });
}

export function failAttempt(id: number, number: number, error: unknown, rawResponse?: string, feedback?: string) {
  updateAttempt(id, number, {
    status: "error", error: error instanceof Error ? error.message : String(error),
    raw_response: rawResponse ?? null, validation_feedback: feedback ?? null,
  });
}

export function finishGeneration(id: number, output: unknown) {
  records = records.map((record) => record.id === id
    ? { ...record, output: structuredClone(output), status: "complete" }
    : record);
  notify();
}

export function failGeneration(id: number, error: unknown) {
  records = records.map((record) => record.id === id
    ? { ...record, status: "error", error: error instanceof Error ? error.message : String(error) }
    : record);
  notify();
}

declare global {
  interface Window {
    unwrittenDebug: {
      enable: () => void;
      disable: () => void;
      records: () => GenerationRecord[];
      clear: () => void;
    };
  }
}

if (typeof window !== "undefined") {
  try { enabled = localStorage.getItem(STORAGE_KEY) === "true"; } catch { /* Storage is optional. */ }
  window.unwrittenDebug = {
    enable: () => setDebugEnabled(true),
    disable: () => setDebugEnabled(false),
    records: () => structuredClone([...records]),
    clear: clearGenerationRecords,
  };
}

import { create } from "zustand";

export type Phase = "idle" | "running" | "paused" | "done" | "turning";

export const PRESETS = [15, 25, 45, 90] as const;
const STORAGE_KEY = "aureum.v1";

export function clampMinutes(value: number) {
  if (!Number.isFinite(value)) return 25;
  return Math.min(180, Math.max(1, Math.round(value)));
}

export function durationMs(minutes: number) {
  return minutes * 60_000;
}

type Persisted = {
  version: 1;
  minutes: number;
  sound: boolean;
  kept: number;
  keptDate: string;
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export type TimerSnapshot = {
  phase: Phase;
  minutes: number;
  startedAt: number | null;
  elapsedBefore: number;
};

export function elapsedMs(state: TimerSnapshot, now: number) {
  const dur = durationMs(state.minutes);
  if (state.phase === "running" && state.startedAt != null) {
    return Math.min(dur, state.elapsedBefore + (now - state.startedAt));
  }
  if (state.phase === "done") return dur;
  if (state.phase === "paused") return Math.min(dur, state.elapsedBefore);
  return 0;
}

/** Share of sand still in the upper bulb. Linear in time: orifice flow is constant. */
export function upperFraction(state: TimerSnapshot, now: number) {
  if (state.phase === "idle" || state.phase === "turning") return 1;
  const dur = durationMs(state.minutes);
  if (dur <= 0) return 1;
  return 1 - elapsedMs(state, now) / dur;
}

export function displayMs(state: TimerSnapshot, now: number) {
  if (state.phase === "idle" || state.phase === "turning") return durationMs(state.minutes);
  return Math.max(0, durationMs(state.minutes) - elapsedMs(state, now));
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000 - 1e-6));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type Store = TimerSnapshot & {
  sound: boolean;
  kept: number;
  keptDate: string;
  turnStarted: number | null;
  reduceMotion: boolean;
  chime: number;
  hydrated: boolean;
  hydrate: () => void;
  setMinutes: (minutes: number) => void;
  toggleSound: () => void;
  primary: () => void;
  reset: () => void;
  tick: (now: number) => void;
  finishTurn: () => void;
};

function persist(state: Store) {
  if (typeof window === "undefined") return;
  const data: Persisted = {
    version: 1,
    minutes: state.minutes,
    sound: state.sound,
    kept: state.kept,
    keptDate: state.keptDate,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

export const useTimer = create<Store>((set, get) => ({
  phase: "idle",
  minutes: 25,
  startedAt: null,
  elapsedBefore: 0,
  sound: true,
  kept: 0,
  keptDate: "1970-1-1",
  turnStarted: null,
  reduceMotion: false,
  chime: 0,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined" || get().hydrated) return;
    let next: Partial<Store> = { hydrated: true, keptDate: todayKey() };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        const day = todayKey();
        const sameDay = parsed.keptDate === day;
        next = {
          ...next,
          minutes: clampMinutes(parsed.minutes ?? 25),
          sound: parsed.sound !== false,
          kept: sameDay ? Math.max(0, parsed.kept ?? 0) : 0,
          keptDate: day,
        };
      }
    } catch {
      /* ignore broken storage */
    }
    set(next);
  },

  setMinutes: (minutes) => {
    const state = get();
    if (state.phase === "running" || state.phase === "paused" || state.phase === "turning") return;
    const next = { ...state, minutes: clampMinutes(minutes) };
    set({ minutes: next.minutes });
    persist(get());
  },

  toggleSound: () => {
    set({ sound: !get().sound });
    persist(get());
  },

  primary: () => {
    const state = get();
    const now = performance.now();
    if (state.phase === "idle") {
      set({ phase: "running", startedAt: now, elapsedBefore: 0 });
      return;
    }
    if (state.phase === "running" && state.startedAt != null) {
      set({
        phase: "paused",
        startedAt: null,
        elapsedBefore: state.elapsedBefore + (now - state.startedAt),
      });
      return;
    }
    if (state.phase === "paused") {
      set({ phase: "running", startedAt: now });
      return;
    }
    if (state.phase === "done") {
      set({ phase: "turning", turnStarted: now, startedAt: null });
    }
  },

  reset: () => {
    const state = get();
    if (state.phase === "turning" || state.phase === "idle") return;
    set({ phase: "idle", startedAt: null, elapsedBefore: 0, turnStarted: null });
  },

  tick: (now) => {
    const state = get();
    if (state.phase !== "running" || state.startedAt == null) return;
    const elapsed = state.elapsedBefore + (now - state.startedAt);
    if (elapsed < durationMs(state.minutes)) return;
    const day = todayKey();
    const kept = state.keptDate === day ? state.kept + 1 : 1;
    set({
      phase: "done",
      startedAt: null,
      elapsedBefore: durationMs(state.minutes),
      kept,
      keptDate: day,
      chime: state.chime + 1,
    });
    persist(get());
  },

  finishTurn: () => {
    const state = get();
    if (state.phase !== "turning") return;
    set({ phase: "idle", startedAt: null, elapsedBefore: 0, turnStarted: null });
  },
}));

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __aureum?: typeof useTimer }).__aureum = useTimer;
}

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize2, Minus, Plus, Volume2, VolumeX } from "lucide-react";
import { playChime, unlockAudio } from "@/components/hourglass/audio";
import {
  PRESETS,
  clampMinutes,
  displayMs,
  formatClock,
  useTimer,
  type Phase,
} from "@/components/hourglass/store";

function statusFor(phase: Phase) {
  if (phase === "paused") return "Paused";
  if (phase === "done") return "The hour is kept";
  if (phase === "turning") return "Turning";
  if (phase === "idle") return "Set the hour";
  return "";
}

function actionFor(phase: Phase) {
  if (phase === "running") return "Pause";
  if (phase === "paused") return "Resume";
  if (phase === "done") return "Turn";
  if (phase === "turning") return "Turning";
  return "Begin";
}

export function Chrome() {
  const phase = useTimer((s) => s.phase);
  const minutes = useTimer((s) => s.minutes);
  const sound = useTimer((s) => s.sound);
  const kept = useTimer((s) => s.kept);
  const chime = useTimer((s) => s.chime);
  const setMinutes = useTimer((s) => s.setMinutes);
  const toggleSound = useTimer((s) => s.toggleSound);
  const primary = useTimer((s) => s.primary);
  const reset = useTimer((s) => s.reset);

  const [clock, setClock] = useState("25:00");
  const [revealed, setRevealed] = useState(true);
  const [full, setFull] = useState(false);
  const [draft, setDraft] = useState("25");
  const [editing, setEditing] = useState(false);
  const chimeBoot = useRef(false);
  const rootRef = useRef<HTMLElement>(null);

  const locked = phase === "running" || phase === "paused" || phase === "turning";
  const quiet = phase === "running" && !revealed;

  useEffect(() => {
    useTimer.getState().hydrate();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    useTimer.setState({ reduceMotion: media.matches });
    const onMotion = () => useTimer.setState({ reduceMotion: media.matches });
    media.addEventListener("change", onMotion);
    return () => media.removeEventListener("change", onMotion);
  }, []);

  useEffect(() => {
    if (!editing) setDraft(String(minutes));
  }, [minutes, editing]);

  useEffect(() => {
    const draw = () => {
      const state = useTimer.getState();
      state.tick(performance.now());
      const next = formatClock(displayMs(state, performance.now()));
      setClock(next);
      const title =
        state.phase === "running" || state.phase === "paused"
          ? `${next} · Aureum`
          : state.phase === "done"
            ? "Kept · Aureum"
            : "Aureum";
      if (document.title !== title) document.title = title;
    };
    draw();
    const id = window.setInterval(draw, 200);
    document.addEventListener("visibilitychange", draw);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", draw);
    };
  }, [phase, minutes]);

  useEffect(() => {
    if (!chimeBoot.current) {
      chimeBoot.current = true;
      return;
    }
    if (useTimer.getState().sound) playChime();
  }, [chime]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      setRevealed(true);
      return;
    }
    let timer = window.setTimeout(() => setRevealed(false), 4200);
    const poke = () => {
      setRevealed(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setRevealed(false), 4200);
    };
    window.addEventListener("pointermove", poke);
    window.addEventListener("pointerdown", poke);
    window.addEventListener("keydown", poke);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", poke);
      window.removeEventListener("pointerdown", poke);
      window.removeEventListener("keydown", poke);
    };
  }, [phase]);

  useEffect(() => {
    const onFull = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.code === "Space") {
        event.preventDefault();
        useTimer.getState().primary();
      } else if (event.key === "r" || event.key === "R") {
        const state = useTimer.getState();
        if (state.phase === "done") state.primary();
        else state.reset();
      } else if (event.key === "f" || event.key === "F") {
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen can be denied */
    }
  }

  function commitDraft() {
    const next = clampMinutes(Number(draft));
    setMinutes(next);
    setDraft(String(next));
    setEditing(false);
  }

  const fade = quiet ? "pointer-events-none opacity-0" : "opacity-100";
  const hit = quiet ? "pointer-events-none" : "pointer-events-auto";

  return (
    <section
      ref={rootRef}
      className="pointer-events-none absolute inset-0 flex flex-col justify-between select-none"
    >
      <div className="vignette pointer-events-none absolute inset-0" />
      <header
        className={`flex items-start justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] transition-opacity duration-300 ${fade}`}
      >
        <div>
          <p className="font-serif text-xl tracking-brand text-brass">Aureum</p>
          <p className="mt-1 min-h-4 text-xs tracking-widest text-muted uppercase">{statusFor(phase)}</p>
        </div>
        <div className={`${hit} flex gap-2`}>
          <button
            type="button"
            aria-label={sound ? "Mute the bell" : "Play the bell"}
            aria-pressed={sound}
            onClick={toggleSound}
            className="flex size-11 items-center justify-center text-muted transition-transform duration-150 ease-out hover:text-fg active:scale-[0.96]"
          >
            {sound ? <Volume2 size={18} strokeWidth={1.5} /> : <VolumeX size={18} strokeWidth={1.5} />}
          </button>
          <button
            type="button"
            aria-label={full ? "Leave fullscreen" : "Fullscreen"}
            onClick={() => void toggleFullscreen()}
            className="flex size-11 items-center justify-center text-muted transition-transform duration-150 ease-out hover:text-fg active:scale-[0.96]"
          >
            {full ? <Minimize2 size={18} strokeWidth={1.5} /> : <Maximize size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center pt-2">
        <p
          className="font-serif text-6xl leading-none text-fg tabular-nums md:text-7xl"
          aria-live="polite"
          aria-atomic="true"
        >
          {clock}
        </p>
      </div>

      <footer
        className={`flex flex-col items-center gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-opacity duration-300 ${fade}`}
      >
        <div className={`${hit} flex items-center gap-1 sm:gap-2`} role="group" aria-label="Presets">
          {PRESETS.map((preset) => {
            const selected = minutes === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={locked}
                onClick={() => setMinutes(preset)}
                className={`min-h-11 min-w-11 px-2 text-sm tabular-nums transition-colors disabled:opacity-40 ${
                  selected ? "border-b border-brass text-brass" : "text-muted hover:text-fg"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        <div className={`${hit} flex items-center gap-3`}>
          <button
            type="button"
            aria-label="One minute less"
            disabled={locked || minutes <= 1}
            onClick={() => setMinutes(minutes - 1)}
            className="flex size-11 items-center justify-center border border-line text-fg transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-30"
          >
            <Minus size={16} strokeWidth={1.5} />
          </button>
          <label className="flex items-baseline gap-2 text-muted">
            <input
              inputMode="numeric"
              aria-label="Minutes"
              disabled={locked}
              value={draft}
              onFocus={() => setEditing(true)}
              onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") (event.target as HTMLInputElement).blur();
              }}
              className="w-12 bg-transparent text-center font-serif text-2xl text-fg tabular-nums outline-none disabled:opacity-40"
              suppressHydrationWarning
            />
            <span className="text-xs tracking-widest uppercase">min</span>
          </label>
          <button
            type="button"
            aria-label="One minute more"
            disabled={locked || minutes >= 180}
            onClick={() => setMinutes(minutes + 1)}
            className="flex size-11 items-center justify-center border border-line text-fg transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-30"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className={`${hit} flex items-center gap-3`}>
          {phase === "running" || phase === "paused" ? (
            <button
              type="button"
              onClick={reset}
              className="min-h-11 px-4 text-xs tracking-widest text-muted uppercase transition-colors hover:text-fg"
            >
              Reset
            </button>
          ) : null}
          <button
            type="button"
            onClick={primary}
            disabled={phase === "turning"}
            className="min-h-11 min-w-36 border border-brass/60 px-8 text-xs tracking-widest text-fg uppercase transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50"
          >
            {actionFor(phase)}
          </button>
        </div>

        <p className={`min-h-4 text-xs tracking-widest text-muted uppercase ${kept > 0 ? "" : "invisible"}`}>
          Kept today · {kept}
        </p>
      </footer>
    </section>
  );
}

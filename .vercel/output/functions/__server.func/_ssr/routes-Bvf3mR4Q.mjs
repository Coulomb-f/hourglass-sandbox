import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime, N as require_react } from "../_libs/@react-three/fiber+[...].mjs";
import { t as create } from "../_libs/zustand.mjs";
import { a as Minus, i as Plus, n as Volume2, o as Minimize2, s as Maximize, t as VolumeX } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Bvf3mR4Q.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var PRESETS = [
	15,
	25,
	45,
	90
];
var STORAGE_KEY = "aureum.v1";
function clampMinutes(value) {
	if (!Number.isFinite(value)) return 25;
	return Math.min(180, Math.max(1, Math.round(value)));
}
function durationMs(minutes) {
	return minutes * 6e4;
}
function todayKey() {
	const now = /* @__PURE__ */ new Date();
	return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}
function elapsedMs(state, now) {
	const dur = durationMs(state.minutes);
	if (state.phase === "running" && state.startedAt != null) return Math.min(dur, state.elapsedBefore + (now - state.startedAt));
	if (state.phase === "done") return dur;
	if (state.phase === "paused") return Math.min(dur, state.elapsedBefore);
	return 0;
}
/** Share of sand still in the upper bulb. Linear in time: orifice flow is constant. */
function upperFraction(state, now) {
	if (state.phase === "idle" || state.phase === "turning") return 1;
	const dur = durationMs(state.minutes);
	if (dur <= 0) return 1;
	return 1 - elapsedMs(state, now) / dur;
}
function displayMs(state, now) {
	if (state.phase === "idle" || state.phase === "turning") return durationMs(state.minutes);
	return Math.max(0, durationMs(state.minutes) - elapsedMs(state, now));
}
function formatClock(ms) {
	const total = Math.max(0, Math.ceil(ms / 1e3 - 1e-6));
	return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
function persist(state) {
	if (typeof window === "undefined") return;
	const data = {
		version: 1,
		minutes: state.minutes,
		sound: state.sound,
		kept: state.kept,
		keptDate: state.keptDate
	};
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {}
}
var useTimer = create((set, get) => ({
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
		let next = {
			hydrated: true,
			keptDate: todayKey()
		};
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				const day = todayKey();
				const sameDay = parsed.keptDate === day;
				next = {
					...next,
					minutes: clampMinutes(parsed.minutes ?? 25),
					sound: parsed.sound !== false,
					kept: sameDay ? Math.max(0, parsed.kept ?? 0) : 0,
					keptDate: day
				};
			}
		} catch {}
		set(next);
	},
	setMinutes: (minutes) => {
		const state = get();
		if (state.phase === "running" || state.phase === "paused" || state.phase === "turning") return;
		set({ minutes: {
			...state,
			minutes: clampMinutes(minutes)
		}.minutes });
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
			set({
				phase: "running",
				startedAt: now,
				elapsedBefore: 0
			});
			return;
		}
		if (state.phase === "running" && state.startedAt != null) {
			set({
				phase: "paused",
				startedAt: null,
				elapsedBefore: state.elapsedBefore + (now - state.startedAt)
			});
			return;
		}
		if (state.phase === "paused") {
			set({
				phase: "running",
				startedAt: now
			});
			return;
		}
		if (state.phase === "done") set({
			phase: "turning",
			turnStarted: now,
			startedAt: null
		});
	},
	reset: () => {
		const state = get();
		if (state.phase === "turning" || state.phase === "idle") return;
		set({
			phase: "idle",
			startedAt: null,
			elapsedBefore: 0,
			turnStarted: null
		});
	},
	tick: (now) => {
		const state = get();
		if (state.phase !== "running" || state.startedAt == null) return;
		if (state.elapsedBefore + (now - state.startedAt) < durationMs(state.minutes)) return;
		const day = todayKey();
		const kept = state.keptDate === day ? state.kept + 1 : 1;
		set({
			phase: "done",
			startedAt: null,
			elapsedBefore: durationMs(state.minutes),
			kept,
			keptDate: day,
			chime: state.chime + 1
		});
		persist(get());
	},
	finishTurn: () => {
		if (get().phase !== "turning") return;
		set({
			phase: "idle",
			startedAt: null,
			elapsedBefore: 0,
			turnStarted: null
		});
	}
}));
var ctx = null;
function unlockAudio() {
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (!Ctx) return null;
	if (!ctx) ctx = new Ctx();
	if (ctx.state === "suspended") ctx.resume();
	return ctx;
}
/** A single low bell — sung, not beeped. */
function playChime() {
	const context = unlockAudio();
	if (!context) return;
	const now = context.currentTime;
	const master = context.createGain();
	master.gain.setValueAtTime(.85, now);
	master.connect(context.destination);
	for (const partial of [
		{
			freq: 392,
			gain: .06,
			decay: 2.8
		},
		{
			freq: 587.33,
			gain: .03,
			decay: 2.2
		},
		{
			freq: 783.99,
			gain: .016,
			decay: 1.7
		},
		{
			freq: 987.77,
			gain: .008,
			decay: 1.3
		}
	]) {
		const osc = context.createOscillator();
		const gain = context.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(partial.freq, now);
		osc.frequency.exponentialRampToValueAtTime(partial.freq * .985, now + partial.decay);
		gain.gain.setValueAtTime(1e-4, now);
		gain.gain.exponentialRampToValueAtTime(partial.gain, now + .028);
		gain.gain.exponentialRampToValueAtTime(1e-4, now + partial.decay);
		osc.connect(gain);
		gain.connect(master);
		osc.start(now);
		osc.stop(now + partial.decay + .05);
	}
}
function statusFor(phase) {
	if (phase === "paused") return "Paused";
	if (phase === "done") return "The hour is kept";
	if (phase === "turning") return "Turning";
	if (phase === "idle") return "Set the hour";
	return "";
}
function actionFor(phase) {
	if (phase === "running") return "Pause";
	if (phase === "paused") return "Resume";
	if (phase === "done") return "Turn";
	if (phase === "turning") return "Turning";
	return "Begin";
}
function Chrome() {
	const phase = useTimer((s) => s.phase);
	const minutes = useTimer((s) => s.minutes);
	const sound = useTimer((s) => s.sound);
	const kept = useTimer((s) => s.kept);
	const chime = useTimer((s) => s.chime);
	const setMinutes = useTimer((s) => s.setMinutes);
	const toggleSound = useTimer((s) => s.toggleSound);
	const primary = useTimer((s) => s.primary);
	const reset = useTimer((s) => s.reset);
	const [clock, setClock] = (0, import_react.useState)("25:00");
	const [revealed, setRevealed] = (0, import_react.useState)(true);
	const [full, setFull] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("25");
	const [editing, setEditing] = (0, import_react.useState)(false);
	const chimeBoot = (0, import_react.useRef)(false);
	const rootRef = (0, import_react.useRef)(null);
	const locked = phase === "running" || phase === "paused" || phase === "turning";
	const quiet = phase === "running" && !revealed;
	(0, import_react.useEffect)(() => {
		useTimer.getState().hydrate();
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		useTimer.setState({ reduceMotion: media.matches });
		const onMotion = () => useTimer.setState({ reduceMotion: media.matches });
		media.addEventListener("change", onMotion);
		return () => media.removeEventListener("change", onMotion);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!editing) setDraft(String(minutes));
	}, [minutes, editing]);
	(0, import_react.useEffect)(() => {
		const draw = () => {
			const state = useTimer.getState();
			state.tick(performance.now());
			const next = formatClock(displayMs(state, performance.now()));
			setClock(next);
			const title = state.phase === "running" || state.phase === "paused" ? `${next} · Aureum` : state.phase === "done" ? "Kept · Aureum" : "Aureum";
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
	(0, import_react.useEffect)(() => {
		if (!chimeBoot.current) {
			chimeBoot.current = true;
			return;
		}
		if (useTimer.getState().sound) playChime();
	}, [chime]);
	(0, import_react.useEffect)(() => {
		const unlock = () => unlockAudio();
		window.addEventListener("pointerdown", unlock);
		return () => window.removeEventListener("pointerdown", unlock);
	}, []);
	(0, import_react.useEffect)(() => {
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
	(0, import_react.useEffect)(() => {
		const onFull = () => setFull(Boolean(document.fullscreenElement));
		document.addEventListener("fullscreenchange", onFull);
		return () => document.removeEventListener("fullscreenchange", onFull);
	}, []);
	(0, import_react.useEffect)(() => {
		const onKey = (event) => {
			const tag = event.target?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			if (event.code === "Space") {
				event.preventDefault();
				useTimer.getState().primary();
			} else if (event.key === "r" || event.key === "R") {
				const state = useTimer.getState();
				if (state.phase === "done") state.primary();
				else state.reset();
			} else if (event.key === "f" || event.key === "F") toggleFullscreen();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch {}
	}
	function commitDraft() {
		const next = clampMinutes(Number(draft));
		setMinutes(next);
		setDraft(String(next));
		setEditing(false);
	}
	const fade = quiet ? "pointer-events-none opacity-0" : "opacity-100";
	const hit = quiet ? "pointer-events-none" : "pointer-events-auto";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		ref: rootRef,
		className: "pointer-events-none absolute inset-0 flex flex-col justify-between select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "vignette pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: `flex items-start justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] transition-opacity duration-300 ${fade}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-serif text-xl tracking-brand text-brass",
					children: "Aureum"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 min-h-4 text-xs tracking-widest text-muted uppercase",
					children: statusFor(phase)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `${hit} flex gap-2`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": sound ? "Mute the bell" : "Play the bell",
						"aria-pressed": sound,
						onClick: toggleSound,
						className: "flex size-11 items-center justify-center text-muted transition-transform duration-150 ease-out hover:text-fg active:scale-[0.96]",
						children: sound ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, {
							size: 18,
							strokeWidth: 1.5
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, {
							size: 18,
							strokeWidth: 1.5
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": full ? "Leave fullscreen" : "Fullscreen",
						onClick: () => void toggleFullscreen(),
						className: "flex size-11 items-center justify-center text-muted transition-transform duration-150 ease-out hover:text-fg active:scale-[0.96]",
						children: full ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimize2, {
							size: 18,
							strokeWidth: 1.5
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize, {
							size: 18,
							strokeWidth: 1.5
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-1 flex-col items-center pt-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-serif text-6xl leading-none text-fg tabular-nums md:text-7xl",
					"aria-live": "polite",
					"aria-atomic": "true",
					children: clock
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: `flex flex-col items-center gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-opacity duration-300 ${fade}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `${hit} flex items-center gap-1 sm:gap-2`,
						role: "group",
						"aria-label": "Presets",
						children: PRESETS.map((preset) => {
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: locked,
								onClick: () => setMinutes(preset),
								className: `min-h-11 min-w-11 px-2 text-sm tabular-nums transition-colors disabled:opacity-40 ${minutes === preset ? "border-b border-brass text-brass" : "text-muted hover:text-fg"}`,
								children: preset
							}, preset);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `${hit} flex items-center gap-3`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "One minute less",
								disabled: locked || minutes <= 1,
								onClick: () => setMinutes(minutes - 1),
								className: "flex size-11 items-center justify-center border border-line text-fg transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-30",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {
									size: 16,
									strokeWidth: 1.5
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-baseline gap-2 text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									inputMode: "numeric",
									"aria-label": "Minutes",
									disabled: locked,
									value: draft,
									onFocus: () => setEditing(true),
									onChange: (event) => setDraft(event.target.value.replace(/[^\d]/g, "").slice(0, 3)),
									onBlur: commitDraft,
									onKeyDown: (event) => {
										if (event.key === "Enter") event.target.blur();
									},
									className: "w-12 bg-transparent text-center font-serif text-2xl text-fg tabular-nums outline-none disabled:opacity-40",
									suppressHydrationWarning: true
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs tracking-widest uppercase",
									children: "min"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "One minute more",
								disabled: locked || minutes >= 180,
								onClick: () => setMinutes(minutes + 1),
								className: "flex size-11 items-center justify-center border border-line text-fg transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-30",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
									size: 16,
									strokeWidth: 1.5
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `${hit} flex items-center gap-3`,
						children: [phase === "running" || phase === "paused" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: reset,
							className: "min-h-11 px-4 text-xs tracking-widest text-muted uppercase transition-colors hover:text-fg",
							children: "Reset"
						}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: primary,
							disabled: phase === "turning",
							className: "min-h-11 min-w-36 border border-brass/60 px-8 text-xs tracking-widest text-fg uppercase transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50",
							children: actionFor(phase)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: `min-h-4 text-xs tracking-widest text-muted uppercase ${kept > 0 ? "" : "invisible"}`,
						children: ["Kept today · ", kept]
					})
				]
			})
		]
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
var scenePromise = typeof window === "undefined" ? null : import("./Scene-Bzja9yyi.mjs");
var Scene = (0, import_react.lazy)(() => scenePromise ?? import("./Scene-Bzja9yyi.mjs"));
function Home() {
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setReady(true), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WebGLBoundary, { children: ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: null,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scene, {})
		}) : null }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chrome, {})]
	});
}
var WebGLBoundary = class extends import_react.Component {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		if (this.state.failed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "absolute inset-x-0 top-1/2 px-8 text-center text-sm text-muted",
			children: "This glass needs WebGL, which this device did not provide."
		});
		return this.props.children;
	}
};
//#endregion
export { upperFraction as n, useTimer as r, routes_exports as t };

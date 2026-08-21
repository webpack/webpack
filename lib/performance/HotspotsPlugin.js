/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const NormalModule = require("../NormalModule");
const HotspotsWarning = require("../errors/HotspotsWarning");
const { LOADER_TIMING } = require("../loaders/LoaderRunner");
const { compareStrings } = require("../util/comparators");
const { contextify } = require("../util/identifier");

/** @typedef {import("tapable").FullTap} FullTap */
/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../errors/HotspotsWarning").HookDetails} HookDetails */
/** @typedef {import("../errors/HotspotsWarning").HotspotDetails} HotspotDetails */

const PLUGIN_NAME = "HotspotsPlugin";

// Enough to name the offenders without listing the whole build.
const MAX_REPORTED_HOTSPOTS = 5;
const MAX_REPORTED_HOOKS = 3;

// Below this nothing is waiting on it, and naming it would bury what is.
const MIN_REPORTED_MS = 100;

// Ahead of every other `compilation` tap: the counters are reset there, and
// anything measured before that reset would be thrown away by it.
const INTERCEPT_STAGE = -10000;

const NS_PER_MS = 1e6;
const MS_PER_SECOND = 1000;

/**
 * @param {[number, number]} start what `process.hrtime()` returned
 * @returns {number} milliseconds since then
 */
const msSince = (start) => {
	const [seconds, nanoseconds] = process.hrtime(start);

	return seconds * MS_PER_SECOND + nanoseconds / NS_PER_MS;
};

/**
 * @param {Map<string, { ms: number, runs: number }>} map where the time is kept
 * @param {string} key what ran
 * @param {number} ms how long its own code took
 * @returns {void}
 */
const charge = (map, key, ms) => {
	const spent = map.get(key);

	if (spent === undefined) {
		map.set(key, { ms, runs: 1 });
		return;
	}

	spent.ms += ms;
	spent.runs++;
};

class HotspotsPlugin {
	/**
	 * Creates an instance of HotspotsPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		if (!hints) return;

		/** @typedef {{ ms: number, runs: number }} Spent */
		// Kept per kind: a loader and a plugin could otherwise share a name and
		// have their runs counted together.
		/** @type {Map<string, Spent>} */
		const pluginTime = new Map();
		/** @type {Map<string, Spent>} */
		const loaderTime = new Map();
		/** @type {Map<string, number>} */
		const hookTime = new Map();
		// One frame per thing currently running, innermost last. Only the innermost
		// is charged, so whatever calls out to something else is not billed for it.
		/** @type {{ child: number }[]} */
		const running = [];

		/**
		 * Runs one loader or tap, charging it its own work alone.
		 * @template T
		 * @param {Map<string, { ms: number, runs: number }>} map where its time is kept
		 * @param {string} name what is running
		 * @param {string | undefined} hookName the hook it runs under, if any
		 * @param {() => T} run the work, already bound to its arguments
		 * @returns {T} whatever it returned
		 */
		const measure = (map, name, hookName, run) => {
			const frame = { child: 0 };

			running.push(frame);

			const start = process.hrtime();

			try {
				return run();
			} finally {
				const elapsed = msSince(start);
				const own = elapsed - frame.child;

				running.pop();
				charge(map, name, own);

				if (hookName !== undefined) {
					hookTime.set(hookName, (hookTime.get(hookName) || 0) + own);
				}

				if (running.length > 0) {
					running[running.length - 1].child += elapsed;
				}
			}
		};

		/**
		 * @param {string} hookName the hook being tapped
		 * @returns {(tapInfo: FullTap) => FullTap} an interceptor for it
		 */
		const registerFor = (hookName) => (tapInfo) => {
			const { name, type, fn } = tapInfo;

			if (name === PLUGIN_NAME) return tapInfo;

			if (type === "async") {
				return {
					...tapInfo,
					/**
					 * @param {EXPECTED_ANY[]} args the tap's arguments, callback last
					 * @returns {EXPECTED_ANY} whatever the tap returned
					 */
					fn: (...args) => {
						const callback = args.pop();

						/**
						 * @param {EXPECTED_ANY[]} result what the tap reported
						 * @returns {EXPECTED_ANY} whatever the callback returned
						 */
						const finish = (...result) =>
							measure(pluginTime, name, hookName, () => callback(...result));

						// The completion callback is the plugin's own code as well, so it
						// is charged to the plugin rather than to whoever resumed it.
						return measure(pluginTime, name, hookName, () =>
							/** @type {EXPECTED_FUNCTION} */ (fn)(...args, finish)
						);
					}
				};
			}

			return {
				...tapInfo,
				/**
				 * @param {EXPECTED_ANY[]} args the tap's arguments
				 * @returns {EXPECTED_ANY} whatever the tap returned
				 */
				fn: (...args) =>
					measure(pluginTime, name, hookName, () =>
						/** @type {EXPECTED_FUNCTION} */ (fn)(...args)
					)
			};
		};

		/**
		 * @param {EXPECTED_ANY} instance anything carrying tapable hooks
		 * @returns {void}
		 */
		const interceptAll = (instance) => {
			for (const hookName of Object.keys(instance.hooks)) {
				const descriptor = Object.getOwnPropertyDescriptor(
					instance.hooks,
					hookName
				);

				// A hook kept only as an alias for one that moved is an accessor, and
				// reading it is what prints the deprecation — so it is never read.
				if (!descriptor || descriptor.get) continue;

				const hook = descriptor.value;

				// A deprecated hook kept as a stand-in throws when intercepted.
				if (hook && !hook._fakeHook && typeof hook.intercept === "function") {
					hook.intercept({ register: registerFor(hookName) });
				}
			}
		};

		interceptAll(compiler);

		compiler.hooks.compilation.tap(
			{ name: PLUGIN_NAME, stage: INTERCEPT_STAGE },
			(compilation, { normalModuleFactory, contextModuleFactory }) => {
				// Each build reports its own time. Watching keeps the compiler, so
				// without this every rebuild would add to the one before it.
				pluginTime.clear();
				loaderTime.clear();
				hookTime.clear();
				running.length = 0;

				interceptAll(compilation);
				interceptAll(normalModuleFactory);
				interceptAll(contextModuleFactory);

				const context = compiler.context;

				// Loaders are not taps, so they are measured where they run instead.
				NormalModule.getCompilationHooks(compilation).loader.tap(
					PLUGIN_NAME,
					(loaderContext) => {
						/** @type {EXPECTED_ANY} */
						(loaderContext)[LOADER_TIMING] =
							/**
							 * @param {{ path: string }} loader the loader about to run
							 * @param {() => EXPECTED_ANY} run its own execution
							 * @returns {EXPECTED_ANY} whatever it returned
							 */
							(loader, run) =>
								measure(
									loaderTime,
									contextify(context, loader.path, compiler.root),
									undefined,
									run
								);
					}
				);
			}
		);

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// `afterSeal` is past the hash, which folds every message into it — a
			// hint reported earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				/** @type {HotspotDetails[]} */
				const hotspots = [];

				// Loaders and plugins never name the same thing, so one ranking over
				// both double counts nothing.
				for (const [kind, map] of /** @type {const} */ ([
					["loader", loaderTime],
					["plugin", pluginTime]
				])) {
					for (const [name, spent] of map) {
						if (spent.ms < MIN_REPORTED_MS) continue;

						hotspots.push({ kind, name, ms: spent.ms, runs: spent.runs });
					}
				}

				if (hotspots.length === 0) return;

				// Ties break by name, though two rarely take the same time.
				hotspots.sort((a, b) => b.ms - a.ms || compareStrings(a.name, b.name));

				/** @type {HookDetails[]} */
				const hooks = [...hookTime]
					.filter(([, ms]) => ms >= MIN_REPORTED_MS)
					.map(([name, ms]) => ({ name, ms }))
					.sort((a, b) => b.ms - a.ms || compareStrings(a.name, b.name))
					.slice(0, MAX_REPORTED_HOOKS);

				const warning = new HotspotsWarning(
					hotspots.slice(0, MAX_REPORTED_HOTSPOTS),
					hotspots.length,
					hooks
				);

				if (hints === "error") {
					compilation.errors.push(warning);
				} else if (hints === "stats") {
					compilation.hints.push(warning);
				} else {
					compilation.warnings.push(warning);
				}
			});
		});
	}
}

module.exports = HotspotsPlugin;

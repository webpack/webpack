/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const SlowPluginsWarning = require("../errors/SlowPluginsWarning");
const { compareStrings } = require("../util/comparators");

/** @typedef {import("tapable").FullTap} FullTap */
/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../errors/SlowPluginsWarning").SlowPluginDetails} SlowPluginDetails */

const PLUGIN_NAME = "SlowPluginsPlugin";

// Enough to name the offenders without listing every plugin in the build.
const MAX_REPORTED_PLUGINS = 5;

// Below this a plugin is not what anyone is waiting for, and naming it would
// bury the one that is.
const MIN_REPORTED_MS = 100;

// Runs before the taps it has to wrap: interception only reaches a tap that is
// registered after it, so this one has to be first onto `compilation`.
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

class SlowPluginsPlugin {
	/**
	 * Creates an instance of SlowPluginsPlugin.
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

		/** @type {Map<string, number>} */
		const selfTime = new Map();
		/** @type {Map<string, number>} */
		const callCount = new Map();
		// One frame per tap currently running, innermost last. Only the innermost
		// is charged, so a tap that calls another is not billed for it.
		/** @type {{ child: number }[]} */
		const running = [];

		/**
		 * Runs one tap, charging the caller for its own work alone.
		 * @template T
		 * @param {string} name the plugin that registered the tap
		 * @param {() => T} run the tap, already bound to its arguments
		 * @returns {T} whatever the tap returned
		 */
		const measure = (name, run) => {
			const frame = { child: 0 };

			running.push(frame);

			const start = process.hrtime();

			try {
				return run();
			} finally {
				const elapsed = msSince(start);

				running.pop();
				selfTime.set(name, (selfTime.get(name) || 0) + (elapsed - frame.child));
				callCount.set(name, (callCount.get(name) || 0) + 1);

				if (running.length > 0) {
					running[running.length - 1].child += elapsed;
				}
			}
		};

		/**
		 * @param {FullTap} tapInfo the tap being registered
		 * @returns {FullTap} the tap, timed
		 */
		const register = (tapInfo) => {
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
							measure(name, () => callback(...result));

						// The completion callback is the plugin's own code as well, so it
						// is charged to the plugin rather than to whoever resumed it.
						return measure(name, () =>
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
					measure(name, () => /** @type {EXPECTED_FUNCTION} */ (fn)(...args))
			};
		};

		/**
		 * @param {EXPECTED_ANY} instance anything carrying tapable hooks
		 * @returns {void}
		 */
		const interceptAll = (instance) => {
			if (!instance || !instance.hooks) return;

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
					hook.intercept({ register });
				}
			}
		};

		interceptAll(compiler);

		compiler.hooks.compilation.tap(
			{ name: PLUGIN_NAME, stage: INTERCEPT_STAGE },
			(compilation, { normalModuleFactory, contextModuleFactory }) => {
				interceptAll(compilation);
				interceptAll(normalModuleFactory);
				interceptAll(contextModuleFactory);
			}
		);

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// `afterSeal` is past the hash, which folds every message into it — a
			// hint reported earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				/** @type {SlowPluginDetails[]} */
				const slow = [];

				for (const [name, ms] of selfTime) {
					if (ms < MIN_REPORTED_MS) continue;

					slow.push({
						name,
						ms,
						calls: /** @type {number} */ (callCount.get(name))
					});
				}

				if (slow.length === 0) return;

				// Ties break by name, though two plugins rarely take the same time.
				slow.sort((a, b) => b.ms - a.ms || compareStrings(a.name, b.name));

				const warning = new SlowPluginsWarning(
					slow.slice(0, MAX_REPORTED_PLUGINS),
					slow.length
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

module.exports = SlowPluginsPlugin;

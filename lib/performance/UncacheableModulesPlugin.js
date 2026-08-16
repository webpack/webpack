/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const UncacheableModulesWarning = require("../errors/UncacheableModulesWarning");

/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module").BuildInfo} BuildInfo */

const PLUGIN_NAME = "UncacheableModulesPlugin";

// A reason shared by many modules is the one worth fixing, so report the
// frequent ones and count the rest.
const MAX_REPORTED_REASONS = 3;

const UNSPECIFIED_REASON = "reason not stated";

class UncacheableModulesPlugin {
	/**
	 * Creates an instance of UncacheableModulesPlugin.
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

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				let count = 0;
				/** @type {Map<string, number>} */
				const modulesByReason = new Map();

				for (const module of compilation.modules) {
					const buildInfo = /** @type {BuildInfo | undefined} */ (
						module.buildInfo
					);

					// `undefined` means the module never reported either way, which is
					// not the same as opting out.
					if (!buildInfo || buildInfo.cacheable !== false) continue;

					count++;

					const reasons =
						buildInfo.notCacheableReasons &&
						buildInfo.notCacheableReasons.length > 0
							? buildInfo.notCacheableReasons
							: [UNSPECIFIED_REASON];

					for (const reason of reasons) {
						modulesByReason.set(reason, (modulesByReason.get(reason) || 0) + 1);
					}
				}

				if (count === 0) return;

				const sorted = [...modulesByReason].sort((a, b) => b[1] - a[1]);
				const reported = sorted
					.slice(0, MAX_REPORTED_REASONS)
					.map(
						([reason, modules]) =>
							`${reason} (${modules} ${modules === 1 ? "module" : "modules"})`
					);
				const remaining = sorted.length - reported.length;

				if (remaining > 0) {
					reported.push(
						`and ${remaining} other ${remaining === 1 ? "reason" : "reasons"}`
					);
				}

				const warning = new UncacheableModulesWarning(count, reported);

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

module.exports = UncacheableModulesPlugin;

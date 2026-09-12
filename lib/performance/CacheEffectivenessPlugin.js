/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeModule = require("../RuntimeModule");
const CacheEffectivenessWarning = require("../errors/CacheEffectivenessWarning");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { BuildInfo } from "../Module" */

const PLUGIN_NAME = "CacheEffectivenessPlugin";

// A reason shared by many modules is the one worth fixing, so report the
// frequent ones and count the rest.
const MAX_REPORTED_REASONS = 3;

const UNSPECIFIED_REASON = "reason not stated";

class CacheEffectivenessPlugin {
	/**
	 * Creates an instance of CacheEffectivenessPlugin.
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

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				let total = 0;
				let rebuilt = 0;
				let uncacheable = 0;
				/** @type {Map<string, number>} */
				const modulesByReason = new Map();

				for (const module of compilation.modules) {
					// Runtime modules are generated per compilation, never built and
					// never cached, so counting them makes a cold build look warm.
					if (module instanceof RuntimeModule) continue;

					total++;

					if (compilation.builtModules.has(module)) rebuilt++;

					// Every built module carries one; `cacheable` being `undefined` is
					// the module never reporting either way, not it opting out.
					const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);

					if (buildInfo.cacheable !== false) continue;

					uncacheable++;

					const reasons =
						buildInfo.notCacheableReasons &&
						buildInfo.notCacheableReasons.length > 0
							? buildInfo.notCacheableReasons
							: [UNSPECIFIED_REASON];

					for (const reason of reasons) {
						modulesByReason.set(reason, (modulesByReason.get(reason) || 0) + 1);
					}
				}

				// Work redone despite a warm cache needs both ends: everything rebuilt
				// is a cold build, nothing rebuilt is the cache working.
				const warmRebuild = rebuilt > 0 && rebuilt < total;

				if (!warmRebuild && uncacheable === 0) return;

				// Most frequent first, and by reason where two are as frequent: the
				// map is keyed in the order the modules were walked, which is not the
				// same twice, and only three reasons are reported — so an unbroken tie
				// would vary which of them a build names at all.
				const sorted = [...modulesByReason].sort(
					(a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
				);
				const reasons = sorted
					.slice(0, MAX_REPORTED_REASONS)
					.map(
						([reason, modules]) =>
							`${reason} (${modules} ${modules === 1 ? "module" : "modules"})`
					);
				const remaining = sorted.length - reasons.length;

				if (remaining > 0) {
					reasons.push(
						`and ${remaining} other ${remaining === 1 ? "reason" : "reasons"}`
					);
				}

				const warning = new CacheEffectivenessWarning({
					total,
					rebuilt,
					uncacheable,
					reasons
				});

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

module.exports = CacheEffectivenessPlugin;

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const EmbeddedSourceMapsWarning = require("../errors/EmbeddedSourceMapsWarning");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */

const PLUGIN_NAME = "EmbeddedSourceMapsPlugin";

// The two families that put the map inside the bundle rather than beside it:
// `eval` carries one per module, `inline` appends the whole map as a data url.
const EMBEDS_MAP_REGEXP = /^eval|inline/;

class EmbeddedSourceMapsPlugin {
	/**
	 * Creates an instance of EmbeddedSourceMapsPlugin.
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

		const { devtool, mode } = compiler.options;

		// Only production: embedding is what these devtools are for everywhere
		// else, and the cost is only paid by the people loading the site.
		if (mode !== "production" || !devtool) return;

		// One devtool, or one per source type — either way it is the setting
		// that embeds which the report has to name.
		const embedding = (
			typeof devtool === "string" ? [devtool] : devtool.map((it) => it.use)
		).find((it) => typeof it === "string" && EMBEDS_MAP_REGEXP.test(it));

		if (!embedding) return;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// `afterSeal` is past the hash, which folds every message into it — a
			// hint reported earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const warning = new EmbeddedSourceMapsWarning(embedding);

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

module.exports = EmbeddedSourceMapsPlugin;

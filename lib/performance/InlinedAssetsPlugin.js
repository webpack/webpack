/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const InlinedAssetsWarning = require("../errors/InlinedAssetsWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");

/** @import { AssetModuleBuildInfo } from "../asset/AssetModule" */
/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { InlinedAssetDetails } from "../errors/InlinedAssetsWarning" */

const PLUGIN_NAME = "InlinedAssetsPlugin";

// Enough to name the offenders without listing every icon.
const MAX_REPORTED_ASSETS = 5;

// What the asset modules default `dataUrlCondition.maxSize` is: below it,
// inlining saves a request for less than it costs in bytes.
const DEFAULT_MAX_SIZE = 8096;

class InlinedAssetsPlugin {
	/**
	 * Creates an instance of InlinedAssetsPlugin.
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
			// `afterSeal` is past the hash, which folds every message into it — a
			// hint reported earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				/** @type {InlinedAssetDetails[]} */
				const assets = [];
				let total = 0;

				for (const module of compilation.modules) {
					// The parser records whether it inlined, so this asks rather than
					// deciding from the module's type what it must have done.
					const buildInfo =
						/** @type {AssetModuleBuildInfo} */
						(module.buildInfo);

					if (!buildInfo.dataUrl) continue;

					// Module sizes are estimates and come back fractional.
					const size = Math.round(getModuleSize(module));

					if (size <= DEFAULT_MAX_SIZE) continue;

					total += size;
					assets.push({
						name: module.readableIdentifier(compilation.requestShortener),
						size
					});
				}

				if (assets.length === 0) return;

				// Largest first; ties break by name, module order is not stable.
				assets.sort(
					(a, b) => b.size - a.size || compareStrings(a.name, b.name)
				);

				const warning = new InlinedAssetsWarning(
					assets.slice(0, MAX_REPORTED_ASSETS),
					total
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

module.exports = InlinedAssetsPlugin;

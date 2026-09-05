/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { ASSET_TYPE } = require("../ModuleSourceTypeConstants");
const HarmonyImportBareSideEffectDependency = require("../dependencies/HarmonyImportBareSideEffectDependency");
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");
const UnusedAssetsWarning = require("../errors/UnusedAssetsWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import { UnusedAssetDetails } from "../errors/UnusedAssetsWarning" */

const PLUGIN_NAME = "UnusedAssetsPlugin";

// Enough to name the offenders without listing every asset in the build.
const MAX_REPORTED_ASSETS = 5;

class UnusedAssetsPlugin {
	/**
	 * Creates an instance of UnusedAssetsPlugin.
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
				const { moduleGraph, requestShortener } = compilation;
				/** @type {UnusedAssetDetails[]} */
				const found = [];
				let total = 0;

				for (const module of compilation.modules) {
					// An inlined one carries no asset type: it is a data url in the
					// importer, whose bytes `inlinedAssets` is the check for.
					if (!module.getSourceTypes().has(ASSET_TYPE)) continue;

					let onlyUnread = false;

					for (const connection of moduleGraph.getIncomingConnections(module)) {
						const dependency = connection.dependency;

						// Anything else — a `url()`, a `new URL()`, an html `src` — reads
						// the file, and a bare import asks for it on purpose.
						if (
							!(dependency instanceof HarmonyImportSideEffectDependency) ||
							dependency instanceof HarmonyImportBareSideEffectDependency
						) {
							onlyUnread = false;
							break;
						}

						onlyUnread = true;
					}

					if (!onlyUnread) continue;

					const size = Math.round(getModuleSize(module));

					total += size;
					found.push({
						name: module.readableIdentifier(requestShortener),
						size
					});
				}

				if (found.length === 0) return;

				// Largest first; ties break by name, module order is not stable.
				found.sort((a, b) => b.size - a.size || compareStrings(a.name, b.name));

				const warning = new UnusedAssetsWarning(
					found.slice(0, MAX_REPORTED_ASSETS),
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

module.exports = UnusedAssetsPlugin;

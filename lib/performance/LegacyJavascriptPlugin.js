/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const LegacyJavascriptWarning = require("../errors/LegacyJavascriptWarning");
const { compareStrings } = require("../util/comparators");
const { WINDOWS_PATH_SEPARATOR_REGEXP } = require("../util/identifier");
const getModuleSize = require("./getModuleSize");
const getSourceModules = require("./getSourceModules");

/** @import { Environment, PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { LegacyPackageDetails } from "../errors/LegacyJavascriptWarning" */

const PLUGIN_NAME = "LegacyJavascriptPlugin";

// Packages that exist to emulate syntax. `core-js` is absent on purpose: it
// polyfills APIs, which `output.environment` says nothing about.
const EMULATING_PACKAGES = ["regenerator-runtime", "@babel/runtime"];

// The syntax the report leans on: each is what one of those packages exists to
// lower, so a target with all of them needs none of the lowering.
/** @type {(keyof Environment)[]} */
const NATIVE_FEATURES = [
	"arrowFunction",
	"asyncFunction",
	"const",
	"destructuring",
	"forOf",
	"generator",
	"templateLiteral"
];

/**
 * The emulating package a module belongs to, if it is in one.
 * @param {string} resource the module's path
 * @returns {string | undefined} the package, or undefined when it is not one
 */
const emulatingPackage = (resource) => {
	// Separators normalized so one check serves both platforms, and matched
	// against the path so an alias or re-export is still recognized.
	const path = resource.replace(WINDOWS_PATH_SEPARATOR_REGEXP, "/");

	for (const name of EMULATING_PACKAGES) {
		if (path.includes(`node_modules/${name}/`)) return name;
	}

	return undefined;
};

class LegacyJavascriptPlugin {
	/**
	 * Creates an instance of LegacyJavascriptPlugin.
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
				const environment = compilation.outputOptions.environment;

				// Reported only when the target has every one of them: emulating a
				// feature the target is missing is the polyfill doing its job.
				for (const feature of NATIVE_FEATURES) {
					if (!environment[feature]) return;
				}

				/** @type {Map<string, LegacyPackageDetails>} */
				const found = new Map();
				let totalSize = 0;

				for (const module of compilation.modules) {
					for (const inner of getSourceModules(module)) {
						const resource = inner.nameForCondition();

						if (!resource) continue;

						const name = emulatingPackage(resource);

						if (!name) continue;

						const size = getModuleSize(inner);
						const details = found.get(name);

						totalSize += size;

						if (details === undefined) {
							found.set(name, { name, modules: 1, size });
						} else {
							details.modules++;
							details.size += size;
						}
					}
				}

				if (found.size === 0) return;

				// Ties break by name: module order is not stable across runs.
				const packages = [...found.values()].sort(
					(a, b) => b.size - a.size || compareStrings(a.name, b.name)
				);

				const warning = new LegacyJavascriptWarning(
					packages,
					totalSize,
					NATIVE_FEATURES
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

module.exports = LegacyJavascriptPlugin;

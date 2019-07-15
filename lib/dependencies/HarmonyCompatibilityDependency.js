/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import('../Dependency').DependencyTemplate} DependencyTemplate **/
/** @typedef {import('../Module')} Module **/
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

const NullDependency = require("./NullDependency");

class HarmonyCompatibilityDependency extends NullDependency {
	/**
	 * @param {Module} originModule original module
	 */
	constructor(originModule) {
		super();
		this.originModule = originModule;
	}

	/**
	 * @override
	 */
	get type() {
		return "harmony export header";
	}
}

HarmonyCompatibilityDependency.Template = class HarmonyExportDependencyTemplate {
	/**
	 * @param {HarmonyCompatibilityDependency} dep dependency
	 * @param {ReplaceSource} source source
	 * @param {RuntimeTemplate} runtime runtime template
	 * @returns {void}
	 */
	apply(dep, source, runtime) {
		const usedExports = dep.originModule.usedExports;
		if (usedExports !== false && !Array.isArray(usedExports)) {
			const content = runtime.defineEsModuleFlagStatement({
				exportsArgument: dep.originModule.exportsArgument
			});
			source.insert(-10, content);
		}
	}
};

module.exports = HarmonyCompatibilityDependency;

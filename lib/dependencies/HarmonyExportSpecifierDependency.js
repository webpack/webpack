/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import('../Module')} Module **/
/** @typedef {import('../Dependency')} Dependency **/
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

/** @typedef {import('./NullDependency').ExportTypeDefinition} ExportTypeDefinition **/
/** @typedef {import('./NullDependency').HarmonyInitDependencyTemplate} HarmonyDependencyTemplate **/

const NullDependency = require("./NullDependency");

class HarmonyExportSpecifierDependency extends NullDependency {
	/**
	 * @param {Module} originModule - original module
	 * @param {string} id - identifier
	 * @param {string} name - export name
	 */
	constructor(originModule, id, name) {
		super();
		/** @type {Module} */
		this.originModule = originModule;
		/** @type {string} */
		this.id = id;
		/** @type {string} */
		this.name = name;
	}

	/**
	 * @override
	 */
	get type() {
		return "harmony export specifier";
	}

	/**
	 * for {@link FlagDependencyExportsPlugin}
	 * @returns {ExportTypeDefinition} - defining exports
	 * @override
	 */
	getExports() {
		return {
			exports: [this.name],
			dependencies: undefined
		};
	}
}

/**
 * @implements {HarmonyInitDependencyTemplate}
 */
HarmonyExportSpecifierDependency.Template = class HarmonyExportSpecifierDependencyTemplate {
	apply(dep, source) {}

	/**
	 * @param {Dependency} dep - dependency
	 * @returns {number} order
	 */
	getHarmonyInitOrder(dep) {
		return 0;
	}

	/**
	 * @param {HarmonyExportSpecifierDependency} dep - dependency
	 * @param {ReplaceSource} source - source
	 * @param {RuntimeTemplate} runtime - runtime template
	 * @returns {void}
	 */
	harmonyInit(dep, source, runtime) {
		const content = this.getContent(dep);
		source.insert(-1, content);
	}

	getContent(dep) {
		const used = dep.originModule.isUsed(dep.name);
		if (!used) {
			return `/* unused harmony export ${dep.name || "namespace"} */\n`;
		}

		const exportsName = dep.originModule.exportsArgument;

		return `/* harmony export (binding) */ __webpack_require__.d(${exportsName}, ${JSON.stringify(
			used
		)}, function() { return ${dep.id}; });\n`;
	}
};

module.exports = HarmonyExportSpecifierDependency;

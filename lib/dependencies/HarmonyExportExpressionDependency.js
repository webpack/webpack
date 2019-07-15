/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");

/** @typedef {import('./NullDependency').ExportTypeDefinition} ExportTypeDefinition **/
/** @typedef {import('../Dependency').DependencyTemplate} DependencyTemplate **/
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import('acorn').Node} Node **/
/** @typedef {import('../Module')} Module **/

class HarmonyExportExpressionDependency extends NullDependency {
	/**
	 * @param {Module} originModule original module
	 * @param {Array<number>} range `range` in example below. From {@link Node.range}
	 * @param {Array<number>} rangeStatement `rangeStatement` in example below. From {@link Node.range}
	 * @param {string} prefix comment prefix
	 * @example
	 * export default (value => value);
	 *                 ↑    range    ↑
	 *                 └─────────────┘
	 * ↑         rangeStatement        ↑
	 * └───────────────────────────────┘
	 */
	constructor(originModule, range, rangeStatement, prefix) {
		super();
		/** @type {Module} */
		this.originModule = originModule;
		/** @type {Array<number>} */
		this.range = range;
		/** @type {Array<number>} */
		this.rangeStatement = rangeStatement;
		/** @type {string} */
		this.prefix = prefix;
	}

	/**
	 * @override
	 */
	get type() {
		return "harmony export expression";
	}

	/**
	 * for {@link FlagDependencyExportsPlugin}
	 * @returns {ExportTypeDefinition} - defining exports
	 * @override
	 */
	getExports() {
		return {
			exports: ["default"],
			dependencies: undefined
		};
	}
}

HarmonyExportExpressionDependency.Template = class HarmonyExportDependencyTemplate {
	/**
	 * @param {HarmonyExportExpressionDependency} dep dependency
	 * @param {ReplaceSource} source source
	 * @returns {void}
	 */
	apply(dep, source) {
		const used = dep.originModule.isUsed("default");
		const content = this.getContent(dep.originModule, used);

		if (dep.range) {
			source.replace(
				dep.rangeStatement[0],
				dep.range[0] - 1,
				content + "(" + dep.prefix
			);
			source.replace(dep.range[1], dep.rangeStatement[1] - 1, ");");
			return;
		}

		source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
	}

	/**
	 * @param {Module} module current module
	 * @param {string|boolean} used export name
	 * @returns {string} if export is used `harmony default export` otherwise `unused harmony default export`
	 */
	getContent(module, used) {
		const exportsName = module.exportsArgument;
		if (used) {
			return `/* harmony default export */ ${exportsName}[${JSON.stringify(
				used
			)}] = `;
		}
		return "/* unused harmony default export */ var _unused_webpack_default_export = ";
	}
};

module.exports = HarmonyExportExpressionDependency;

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { compareModulesByIdentifier } = require("../util/comparators");
const {
	getShortModuleName,
	getLongModuleName,
	assignNames,
	getUsedModuleIdsAndModules,
	assignAscendingModuleIds
} = require("./IdHelpers");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class NamedModuleIdsPlugin {
	constructor(options) {
		this.options = options || {};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { root } = compiler;
		compiler.hooks.compilation.tap("NamedModuleIdsPlugin", compilation => {
			const { hashFunction } = compilation.outputOptions;
			compilation.hooks.moduleIds.tap("NamedModuleIdsPlugin", () => {
				const chunkGraph = compilation.chunkGraph;
				const context = this.options.context
					? this.options.context
					: compiler.context;

				const [usedIds, modules] = getUsedModuleIdsAndModules(compilation);
				const unnamedModules = assignNames(
					modules,
					m => getShortModuleName(m, context, root),
					(m, shortName) =>
						getLongModuleName(shortName, m, context, hashFunction, root),
					compareModulesByIdentifier,
					usedIds,
					(m, name) => chunkGraph.setModuleId(m, name)
				);
				if (unnamedModules.length > 0) {
					assignAscendingModuleIds(usedIds, unnamedModules, compilation);
				}
			});
		});
	}
}

module.exports = NamedModuleIdsPlugin;

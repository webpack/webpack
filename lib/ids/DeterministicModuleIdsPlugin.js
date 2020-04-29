/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const {
	getUsedModuleIds,
	getFullModuleName,
	assignDeterministicIds
} = require("./IdHelpers");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class DeterministicModuleIdsPlugin {
	constructor(options) {
		this.options = options || {};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"DeterministicModuleIdsPlugin",
			compilation => {
				compilation.hooks.moduleIds.tap(
					"DeterministicModuleIdsPlugin",
					modules => {
						const chunkGraph = compilation.chunkGraph;
						const context = this.options.context
							? this.options.context
							: compiler.context;
						const maxLength = this.options.maxLength || 3;

						const usedIds = getUsedModuleIds(compilation);
						assignDeterministicIds(
							Array.from(modules).filter(module => {
								if (!module.needId) return false;
								if (chunkGraph.getNumberOfModuleChunks(module) === 0)
									return false;
								return chunkGraph.getModuleId(module) === null;
							}),
							module => getFullModuleName(module, context, compiler.root),
							compareModulesByPreOrderIndexOrIdentifier(
								compilation.moduleGraph
							),
							(module, id) => {
								const size = usedIds.size;
								usedIds.add(`${id}`);
								if (size === usedIds.size) return false;
								chunkGraph.setModuleId(module, id);
								return true;
							},
							[Math.pow(10, maxLength)],
							10,
							usedIds.size
						);
					}
				);
			}
		);
	}
}

module.exports = DeterministicModuleIdsPlugin;

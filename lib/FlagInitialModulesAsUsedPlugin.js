/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Compiler")} Compiler */

class FlagInitialModulesAsUsedPlugin {
	constructor(explanation) {
		this.explanation = explanation;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"FlagInitialModulesAsUsedPlugin",
			compilation => {
				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.afterOptimizeChunks.tap(
					"FlagInitialModulesAsUsedPlugin",
					chunks => {
						for (const chunk of chunks) {
							if (!chunk.isOnlyInitial()) {
								return;
							}
							for (const module of chunk.modulesIterable) {
								module.used = true;
								module.usedExports = true;
								moduleGraph.addExtraReason(module, this.explanation);
							}
						}
					}
				);
			}
		);
	}
}

module.exports = FlagInitialModulesAsUsedPlugin;

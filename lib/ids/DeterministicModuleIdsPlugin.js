/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const createHash = require("../util/createHash");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

/**
 * @param {string} str string to hash
 * @param {number} len max length of the number in decimal digests
 * @returns {number} hash as number in the range from i. e. for len = 3: 0 - 999
 */
const getHashNumber = (str, len) => {
	const hash = createHash("md4");
	hash.update(str);
	const digest = hash.digest("hex") + "10000000000";
	if (len === 1) {
		return +digest.match(/\d/)[0];
	}
	return +digest
		.match(/\d/g)
		.slice(0, len)
		.join("");
};

class DeterministicModuleIdsPlugin {
	constructor(options) {
		this.options = options || {};
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"DeterministicModuleIdsPlugin",
			compilation => {
				const usedIds = new Set();
				let maxLength;
				const context = this.options.context
					? this.options.context
					: compiler.context;

				const assignIdToModule = (module, chunkGraph) => {
					if (chunkGraph.getModuleId(module) === null) {
						const ident = module.libIdent({ context }) || "";
						let id;
						let i = 0;
						do {
							id = getHashNumber(ident + i++, maxLength);
						} while (usedIds.has(id));
						chunkGraph.setModuleId(module, id);
						usedIds.add(id);
					}
				};

				compilation.hooks.moduleIds.tap(
					"DeterministicModuleIdsPlugin",
					modules => {
						const chunkGraph = compilation.chunkGraph;

						const modulesInNaturalOrder = Array.from(modules)
							.filter(m => chunkGraph.getNumberOfModuleChunks(m) > 0)
							.sort(
								compareModulesByPreOrderIndexOrIdentifier(
									compilation.moduleGraph
								)
							);

						// 80% fill rate
						const optimalLength = Math.ceil(
							Math.log10(modulesInNaturalOrder.length * 1.25 + 1)
						);

						// use the provided length or default to the optimal length
						maxLength = Math.max(
							Math.min(
								typeof this.options.maxLength === "number"
									? this.options.maxLength
									: 0,
								15 // higher values will give numerical problems
							),
							optimalLength
						);

						if (compilation.usedModuleIds) {
							for (const id of compilation.usedModuleIds) {
								usedIds.add(id);
							}
						}

						for (const module of modulesInNaturalOrder) {
							const moduleId = chunkGraph.getModuleId(module);
							if (moduleId !== null) {
								usedIds.add(moduleId);
							}
						}

						for (const module of modulesInNaturalOrder) {
							assignIdToModule(module, chunkGraph);
						}
					}
				);
				compilation.hooks.runtimeModule.tap(
					"DeterministicModuleIdsPlugin",
					module => {
						assignIdToModule(module, compilation.chunkGraph);
					}
				);
			}
		);
	}
}

module.exports = DeterministicModuleIdsPlugin;

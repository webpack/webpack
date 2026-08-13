"use strict";

const { ExternalModule } = require("../../");

/** @typedef {import("../../").Compiler} Compiler */

const PLUGIN_NAME = "assertIncludedExternals";

// A dropped external stays in the graph but reaches no chunk. Needs
// `optimization.concatenateModules: false`, which would hide it in the entry.
/**
 * @param {Record<string, boolean>} expected whether the external ends up in a chunk, by user request
 * @returns {(compiler: Compiler) => void} plugin
 */
module.exports = (expected) =>
	/**
	 * @param {Compiler} compiler compiler
	 * @returns {void}
	 */
	function assertIncludedExternalsPlugin(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				/** @type {Record<string, boolean>} */
				const actual = {};
				for (const request of Object.keys(expected)) {
					const module = [...compilation.modules].find(
						(module) =>
							module instanceof ExternalModule && module.userRequest === request
					);
					if (!module) throw new Error(`no external module for ${request}`);
					actual[request] =
						compilation.chunkGraph.getNumberOfModuleChunks(module) > 0;
				}
				expect(actual).toEqual(expected);
			});
		});
	};

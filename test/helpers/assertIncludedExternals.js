"use strict";

const { ExternalModule } = require("../../");

/** @typedef {import("../../").Compiler} Compiler */

const PLUGIN_NAME = "assertIncludedExternals";

// Asserts which externals the output still references: an external dropped as
// side-effect-free stays in the module graph but ends up in no chunk. Needs
// `optimization.concatenateModules: false`, an external folded into a
// concatenated module is in the output without being in a chunk itself.
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

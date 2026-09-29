"use strict";

const path = require("path");

/** @import { NormalModule } from "../../../../" */

/**
 * @param {boolean} sideEffects whether to honor the package's sideEffects flag
 * @param {boolean} concatenateModules whether to concatenate modules
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (sideEffects, concatenateModules) => ({
	name: `side-effects-${sideEffects}-concatenation-${concatenateModules}`,
	mode: "production",
	optimization: {
		sideEffects,
		providedExports: true,
		usedExports: true,
		concatenateModules,
		minimize: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				/** @type {string[]} */
				let modulesBeforeOptimization = [];
				compilation.hooks.finishModules.tap("Test", (modules) => {
					// Inspect the make graph, including restored modules, before tree shaking
					// or concatenation can conceal dependencies that were already built.
					modulesBeforeOptimization = [];
					for (const module of modules) {
						const resource = /** @type {NormalModule} */ (module).resource;
						if (resource) {
							modulesBeforeOptimization.push(path.basename(resource));
						}
					}
				});
				compilation.hooks.processAssets.tap("Test", () => {
					compilation.emitAsset(
						`${compiler.options.name}.modules.json`,
						new compiler.webpack.sources.RawSource(
							JSON.stringify({
								sideEffects,
								modules: modulesBeforeOptimization.sort()
							})
						)
					);
				});
			});
		}
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config(true, false),
	config(true, true),
	config(false, false)
];

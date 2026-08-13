"use strict";

const { ExternalModule } = require("../../../../");

const PLUGIN_NAME = "AssertKeptExternalsPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		css: true
	},
	optimization: {
		minimize: false
	},
	// `sideEffects: false` can't drop these: a css `@import` always applies its
	// styles and an asset external is referenced by its url
	externals: {
		"free-css-import": {
			external: "css-import free-css-import",
			sideEffects: false
		},
		"keep-css-import": "css-import keep-css-import",
		"free-css-url": {
			external: "asset-url https://example.test/free-css-url.png",
			sideEffects: false
		},
		// TODO webpack 6 remove, `css-url` is the old spelling of `asset-url`
		"free-css-url-alias": {
			external: "css-url https://example.test/free-css-url-alias.png",
			sideEffects: false
		},
		"free-asset": {
			external: "asset https://example.test/free-asset.png",
			sideEffects: false
		}
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
					const externals = [...compilation.modules].filter(
						(module) => module instanceof ExternalModule
					);
					if (externals.length !== 5) {
						throw new Error(`expected 5 externals, got ${externals.length}`);
					}
					for (const module of externals) {
						if (compilation.chunkGraph.getNumberOfModuleChunks(module) === 0) {
							throw new Error(`external ${module.userRequest} was dropped`);
						}
					}
				});
			});
		}
	]
};

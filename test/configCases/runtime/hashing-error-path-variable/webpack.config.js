"use strict";

const {
	RuntimeModule,
	javascript: { JavascriptModulesPlugin }
} = require("../../../../");
const { getUndoPath } = require("../../../../lib/util/identifier");

const PLUGIN_NAME = "RootDirRuntimeModulePlugin";

class RootDirRuntimeModule extends RuntimeModule {
	constructor() {
		super("root dir", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string} runtime code
	 */
	generate() {
		const compilation =
			/** @type {import("../../../../").Compilation} */
			(this.compilation);
		const chunk = /** @type {import("../../../../").Chunk} */ (this.chunk);
		// Resolving the chunk's own filename asks for a hash that the hashing pass
		// has not computed yet, which is the failure this case covers.
		const dir = getUndoPath(
			compilation.getPath(
				JavascriptModulesPlugin.getChunkFilenameTemplate(
					chunk,
					compilation.outputOptions
				),
				{ chunk, contentHashType: "javascript" }
			),
			/** @type {string} */ (compilation.outputOptions.path),
			false
		);
		return `__webpack_require__.rootDir = ${JSON.stringify(dir)};`;
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "inner/[name].[contenthash].js"
	},
	optimization: {
		// the generation after hashing succeeds, so the asset is worth looking at
		emitOnErrors: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						PLUGIN_NAME,
						(chunk) => {
							compilation.addRuntimeModule(chunk, new RootDirRuntimeModule());
						}
					);
				});
			}
		}
	]
};

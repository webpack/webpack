"use strict";

const { Compilation, optimize, sources } = require("../../../../");

const PLUGIN_NAME = "MergedThreePlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: { realContentHash: true },
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				// Three assets come out the same, each with a source map of its own.
				optimize.RealContentHashPlugin.getCompilationHooks(
					compilation
				).updateHash.tap(PLUGIN_NAME, () => "dddddddd");
				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						for (const letter of ["a", "b", "c"]) {
							const hash = letter.repeat(8);
							compilation.emitAsset(
								`${hash}.js`,
								new sources.RawSource("same"),
								{
									contenthash: hash,
									related: { sourceMap: `${hash}.js.map` }
								}
							);
							compilation.emitAsset(
								`${hash}.js.map`,
								new sources.RawSource(`map ${letter}`),
								{ contenthash: hash }
							);
						}
					}
				);
			});
		}
	]
};

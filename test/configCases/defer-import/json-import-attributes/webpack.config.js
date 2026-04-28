"use strict";

const path = require("path");

/** @typedef {import("../../../../lib/util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("../../../../lib/util/fs").ReadFileSync} ReadFileSync */

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	experiments: {
		deferImport: true,
		outputModule: true
	},
	output: {
		module: true
	},
	plugins: [
		// Copy config.json next to the bundle so the `webpackIgnore: true`
		// dynamic import is resolvable by Node.js at runtime — that import is
		// our reference for "what Node.js does with JSON import attributes".
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(
					"CopyJsonForReference",
					(compilation) => {
						compilation.hooks.processAssets.tap(
							{
								name: "CopyJsonForReference",
								stage:
									compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
							},
							() => {
								if (!compiler.inputFileSystem) {
									throw new Error("Expected `compiler.inputFileSystem`");
								}
								const file = "config.json";
								const content =
									/** @type {ReadFileSync} */
									(
										/** @type {InputFileSystem} */ (compiler.inputFileSystem)
											.readFileSync
									)(path.resolve(__dirname, file));
								compilation.emitAsset(
									file,
									new compiler.webpack.sources.RawSource(content)
								);
							}
						);
					}
				);
			}
		}
	]
};

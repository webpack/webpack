"use strict";

const path = require("path");

/** @typedef {import("../../../../lib/util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("../../../../lib/util/fs").ReadFileSync} ReadFileSync */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "TestCopyPlugin",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							if (!compiler.inputFileSystem) {
								throw new Error("Expected `compiler.inputFileSystem`");
							}

							const files = [
								"file.text",
								"file.json",
								"file.js",
								"file.css",
								"file.html"
							];

							for (const file of files) {
								const testFile = path.resolve(__dirname, file);
								const content =
									/** @type {ReadFileSync} */
									(
										/** @type {InputFileSystem} */ (compiler.inputFileSystem)
											.readFileSync
									)(testFile);

								compilation.emitAsset(
									file,
									new compiler.webpack.sources.RawSource(content)
								);
							}
						}
					);
				});
			}
		}
	]
};

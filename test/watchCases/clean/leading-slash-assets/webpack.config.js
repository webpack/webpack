"use strict";

const fs = require("fs");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const PLUGIN_NAME = "CleanLeadingSlashAssetsPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: true
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			// the emit skips a file whose source it wrote already
			const source = new compiler.webpack.sources.RawSource("x");
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					if (currentWatchStep.step === "0") {
						compilation.emitAsset("x.txt", source);
						compilation.emitAsset(
							"/dir/a.txt",
							new compiler.webpack.sources.RawSource("a")
						);
					} else {
						// a leading slash is written inside the output path too
						compilation.emitAsset("/x.txt", source);
					}
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				/**
				 * @param {string} file file relative to the output path
				 * @returns {boolean} true when the file is there
				 */
				const exists = (file) => fs.existsSync(path.join(outputPath, file));
				const expected =
					currentWatchStep.step === "0"
						? { "x.txt": true, "dir/a.txt": true }
						: { "x.txt": true, "dir/a.txt": false };
				for (const [file, present] of Object.entries(expected)) {
					if (exists(file) !== present) {
						compilation.errors.push(
							new compiler.webpack.WebpackError(
								`${file} should ${present ? "" : "not "}be there`
							)
						);
					}
				}
			});
		}
	]
};

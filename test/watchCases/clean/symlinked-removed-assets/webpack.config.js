"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const PLUGIN_NAME = "CleanSymlinkedRemovedAssetsPlugin";

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
			const outputPath = /** @type {string} */ (compiler.options.output.path);
			const outside = path.join(
				outputPath,
				"..",
				"symlinked-removed-assets-outside"
			);
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					if (currentWatchStep.step === "0") {
						compilation.emitAsset(
							"data/file.txt",
							new compiler.webpack.sources.RawSource("")
						);
						return;
					}
					// a link replaced the directory the earlier build emitted into
					rimraf.sync(outside);
					fs.mkdirSync(outside, { recursive: true });
					fs.writeFileSync(path.join(outside, "file.txt"), "");
					rimraf.sync(path.join(outputPath, "data"));
					fs.symlinkSync(outside, path.join(outputPath, "data"), "junction");
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				if (currentWatchStep.step === "0") return;
				if (!fs.existsSync(path.join(outside, "file.txt"))) {
					compilation.errors.push(
						new compiler.webpack.WebpackError(
							"a file behind a link in the output directory was removed"
						)
					);
				}
			});
		}
	]
};

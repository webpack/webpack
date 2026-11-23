"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const PLUGIN_NAME = "OutsideRemoveFailurePlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		allowOutside: true,
		clean: true
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			let failed = false;
			const outputFileSystem =
				/** @type {import("../../../../").OutputFileSystem} */ (
					compiler.outputFileSystem
				);
			/** @type {NonNullable<typeof outputFileSystem.unlink>} */
			const unlink = (file, callback) => {
				if (
					compiler.watchMode &&
					currentWatchStep.step === "1" &&
					path.basename(String(file)) === "old.txt" &&
					!failed
				) {
					failed = true;
					return callback(new Error("removal failed"));
				}
				fs.unlink(file, callback);
			};
			compiler.outputFileSystem = Object.create(outputFileSystem, {
				unlink: { value: unlink }
			});
			compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
				rimraf.sync(
					path.join(compiler.outputPath, "..", "outside-remove-failure")
				);
			});
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					const step = currentWatchStep.step;
					if (step !== "0" && (!compiler.watchMode || failed)) return;
					compilation.emitAsset(
						`../outside-remove-failure/${step === "0" ? "old" : "new"}.txt`,
						new compiler.webpack.sources.RawSource("emitted")
					);
				});
			});
		}
	]
};

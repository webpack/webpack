"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				const fs = /** @type {import("../../../../").OutputFileSystem} */ (
					compiler.outputFileSystem
				);
				/** @type {string[]} */
				const checked = [];
				// the emit that follows the clean step checks its own files with lstat
				let cleaning = false;
				// records what CleanPlugin inspects without touching the shared fs module
				compiler.outputFileSystem = Object.create(fs, {
					lstat: {
						value: (
							/** @type {string} */ file,
							/** @type {EXPECTED_ANY} */ callback
						) => {
							if (cleaning) checked.push(path.basename(file));
							/** @type {EXPECTED_ANY} */ (fs).lstat(file, callback);
						}
					}
				});
				compiler.hooks.thisCompilation.tap("Test", (compilation) => {
					checked.length = 0;
					cleaning = true;
					compilation.hooks.processAssets.tap("Test", () => {
						compilation.emitAsset(
							`extra.${currentWatchStep.step}.txt`,
							new compiler.webpack.sources.RawSource("extra")
						);
						// written to `kept.txt`, so it has to be matched to that file
						compilation.emitAsset(
							"nested/../kept.txt",
							new compiler.webpack.sources.RawSource("kept")
						);
					});
				});
				compiler.hooks.emit.tap({ name: "Test", stage: Infinity }, () => {
					cleaning = false;
				});
				compiler.hooks.afterEmit.tap("Test", (compilation) => {
					const step = Number(currentWatchStep.step);
					const expected = step === 0 ? "" : `extra.${step - 1}.txt`;
					// an asset removed by an earlier build must not be checked again
					if (checked.join(",") !== expected) {
						compilation.errors.push(
							new compiler.webpack.WebpackError(
								`checked [${checked.join(",")}], expected [${expected}]`
							)
						);
					}
				});
			}
		}
	]
};

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
				// records what CleanPlugin inspects without touching the shared fs module
				compiler.outputFileSystem = Object.create(fs, {
					lstat: {
						value: (
							/** @type {string} */ file,
							/** @type {EXPECTED_ANY} */ callback
						) => {
							checked.push(path.basename(file));
							/** @type {EXPECTED_ANY} */ (fs).lstat(file, callback);
						}
					}
				});
				compiler.hooks.thisCompilation.tap("Test", (compilation) => {
					checked.length = 0;
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
				compiler.hooks.afterEmit.tap("Test", (compilation) => {
					const step = Number(currentWatchStep.step);
					const expected = step === 0 ? "" : `extra.${step - 1}.txt`;
					// an asset removed by an earlier build must not be checked again
					if (checked.join() !== expected) {
						compilation.errors.push(
							new compiler.webpack.WebpackError(
								`checked [${checked.join()}], expected [${expected}]`
							)
						);
					}
				});
			}
		}
	]
};

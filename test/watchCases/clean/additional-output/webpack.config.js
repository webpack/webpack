"use strict";

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				const { RawSource } = compiler.webpack.sources;
				const volume = new Volume();
				const fs = createFsFromVolume(volume);
				/** @type {string[]} */
				const written = [];
				const output = {
					// records what is written without touching the volume's own methods
					outputFileSystem:
						/** @type {import("../../../../").OutputFileSystem} */ (
							/** @type {unknown} */ (
								Object.create(fs, {
									writeFile: {
										value: (
											/** @type {string} */ file,
											/** @type {Buffer} */ data,
											/** @type {EXPECTED_ANY} */ callback
										) => {
											written.push(path.basename(file));
											fs.writeFile(file, data, callback);
										}
									}
								})
							)
						),
					/** @type {(targetPath: string) => boolean} */
					test: (targetPath) => !targetPath.endsWith("skipped.txt")
				};
				// the same source every build, so the additional output gets it once
				const unchanged = new RawSource("unchanged");

				compiler.hooks.initialize.tap("Test", () => {
					// left from an earlier session, as webpack would find them
					volume.fromJSON(
						{ "stale.txt": "stale", "skipped.txt": "stale" },
						compiler.outputPath
					);
				});
				compiler.hooks.additionalOutputs.tap("Test", (outputs) => {
					outputs.add(output);
				});
				compiler.hooks.thisCompilation.tap("Test", (compilation) => {
					written.length = 0;
					compilation.hooks.processAssets.tap("Test", () => {
						const { step } = currentWatchStep;
						compilation.emitAsset(`extra.${step}.txt`, new RawSource("extra"));
						compilation.emitAsset(
							`query.txt?${step}`,
							new RawSource(`query ${step}`)
						);
						compilation.emitAsset("skipped.txt", new RawSource("skipped"));
						compilation.emitAsset("unchanged.txt", unchanged);
						// written to `dropped.txt`, so that is the file cleaned once it is gone
						if (String(step) === "0") {
							compilation.emitAsset("dropped.txt?0", new RawSource("dropped"));
						}
					});
				});
				compiler.hooks.afterEmit.tap("Test", (compilation) => {
					const { step } = currentWatchStep;
					/** @type {string[]} */
					const errors = [];
					const files = /** @type {string[]} */ (
						fs.readdirSync(compiler.outputPath)
					).sort();
					const expected = [
						"bundle.js",
						...(String(step) === "0" ? ["dropped.txt"] : []),
						`extra.${step}.txt`,
						"query.txt",
						"unchanged.txt"
					];
					if (files.join() !== expected.join()) {
						errors.push(`has [${files.join()}], expected [${expected.join()}]`);
					}
					const query = fs.readFileSync(
						path.join(compiler.outputPath, "query.txt"),
						"utf8"
					);
					if (query !== `query ${step}`) {
						errors.push(`query.txt has '${query}'`);
					}
					if (written.includes("unchanged.txt") !== (String(step) === "0")) {
						errors.push(`wrote [${written.join()}]`);
					}
					for (const error of errors) {
						compilation.errors.push(new compiler.webpack.WebpackError(error));
					}
				});
			}
		}
	]
};

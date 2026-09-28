"use strict";

require("../helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");

describe("CleanPlugin", () => {
	it("stops tracking an asset once it has removed it", async () => {
		const webpack = require("../..");

		let build = 0;
		const compiler = webpack({
			mode: "development",
			context: path.join(__dirname, "..", "fixtures"),
			entry: "./a.js",
			output: { path: "/dist", clean: true },
			plugins: [
				{
					apply(compiler) {
						compiler.hooks.thisCompilation.tap("Test", (compilation) => {
							compilation.hooks.processAssets.tap("Test", () => {
								compilation.emitAsset(
									`extra.${build}.txt`,
									new compiler.webpack.sources.RawSource(`${build}`)
								);
								compilation.emitAsset(
									"nested/../kept.txt",
									new compiler.webpack.sources.RawSource("kept")
								);
							});
						});
					}
				}
			]
		});
		const fs = createFsFromVolume(new Volume());
		/** @type {string[]} */
		const checked = [];
		const lstat = fs.lstat.bind(fs);
		fs.lstat = /** @type {typeof fs.lstat} */ (
			(/** @type {string} */ file, /** @type {EXPECTED_ANY} */ callback) => {
				checked.push(path.basename(file));
				lstat(file, callback);
			}
		);
		compiler.outputFileSystem =
			/** @type {import("../../").OutputFileSystem} */
			(/** @type {unknown} */ (fs));

		const run = () =>
			new Promise((resolve, reject) => {
				compiler.run((err) => (err ? reject(err) : resolve(undefined)));
			});

		for (build = 0; build < 5; build++) {
			checked.length = 0;
			await run();
			// only the asset the previous build emitted is checked and removed
			expect(checked).toEqual(build === 0 ? [] : [`extra.${build - 1}.txt`]);
		}
		expect(fs.readdirSync("/dist").sort()).toEqual(["extra.4.txt", "kept.txt", "main.js"]);
		await new Promise((resolve) => {
			compiler.close(resolve);
		});
	});
});

"use strict";

require("../helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");

/**
 * Creates a compiler emitting `extra.<build>.txt`, a name each build changes,
 * into an in-memory output whose `lstat` calls are recorded.
 * @param {import("../../").Configuration["output"]} output output options
 * @returns {{ fs: ReturnType<typeof createFsFromVolume>, checked: string[], build: (build: number) => Promise<void>, close: () => Promise<void> }} the harness
 */
const setup = (output) => {
	const webpack = require("../..");

	let current = 0;
	const compiler = webpack({
		mode: "development",
		context: path.join(__dirname, "..", "fixtures"),
		entry: "./a.js",
		output: { path: "/dist", ...output },
		plugins: [
			{
				apply(compiler) {
					compiler.hooks.thisCompilation.tap("Test", (compilation) => {
						compilation.hooks.processAssets.tap("Test", () => {
							compilation.emitAsset(
								`extra.${current}.txt`,
								new compiler.webpack.sources.RawSource(`${current}`)
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

	return {
		fs,
		checked,
		build: (build) =>
			new Promise((resolve, reject) => {
				current = build;
				checked.length = 0;
				compiler.run((err) => (err ? reject(err) : resolve()));
			}),
		close: () =>
			new Promise((resolve) => {
				compiler.close(() => resolve());
			})
	};
};

describe("CleanPlugin", () => {
	it("stops tracking an asset once it has removed it", async () => {
		const { fs, checked, build, close } = setup({ clean: true });
		for (let i = 0; i < 5; i++) {
			await build(i);
			// only the asset the previous build emitted is checked and removed
			expect(checked).toEqual(i === 0 ? [] : [`extra.${i - 1}.txt`]);
		}
		expect(fs.readdirSync("/dist").sort()).toEqual([
			"extra.4.txt",
			"kept.txt",
			"main.js"
		]);
		await close();
	});

	it("keeps reporting what dry mode would remove", async () => {
		const { fs, checked, build, close } = setup({ clean: { dry: true } });
		for (let i = 0; i < 3; i++) await build(i);
		// nothing was removed, so every earlier asset is still reported
		expect(checked.sort()).toEqual(["extra.0.txt", "extra.1.txt"]);
		expect(fs.readdirSync("/dist").sort()).toEqual([
			"extra.0.txt",
			"extra.1.txt",
			"extra.2.txt",
			"kept.txt",
			"main.js"
		]);
		await close();
	});
});

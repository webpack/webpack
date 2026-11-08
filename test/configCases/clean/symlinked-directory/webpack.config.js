"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

const PLUGIN_NAME = "CleanSymlinkedDirectoryPlugin";

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const outputPath = path.join(testPath, "dist");
	const outside = path.join(testPath, "outside");
	/**
	 * @param {string} file path relative to the directory outside the output path
	 * @returns {boolean} true when the file is still there
	 */
	const kept = (file) => fs.existsSync(path.join(outside, file));
	return {
		output: {
			path: outputPath,
			clean: true
		},
		plugins: [
			/**
			 * @param {import("../../../../").Compiler} compiler compiler
			 */
			(compiler) => {
				compiler.hooks.environment.tap(PLUGIN_NAME, () => {
					rimraf.sync(outputPath);
					rimraf.sync(outside);
					for (const directory of ["used", "unused"]) {
						fs.mkdirSync(path.join(outside, directory), { recursive: true });
						fs.writeFileSync(path.join(outside, directory, "file.txt"), "");
					}
					fs.writeFileSync(path.join(outside, "used", ".env"), "");
					fs.mkdirSync(outputPath, { recursive: true });
					fs.writeFileSync(path.join(outputPath, "stale.txt"), "");
					// an asset is emitted into "static", while "old" holds none
					fs.symlinkSync(
						path.join(outside, "used"),
						path.join(outputPath, "static"),
						"junction"
					);
					fs.symlinkSync(
						path.join(outside, "unused"),
						path.join(outputPath, "old"),
						"junction"
					);
				});
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
						compilation.emitAsset("static/lazy.txt", new RawSource(""));
					});
				});
				compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
					expect(kept("used/file.txt")).toBe(true);
					expect(kept("used/.env")).toBe(true);
					expect(kept("used/lazy.txt")).toBe(true);
					expect(kept("unused/file.txt")).toBe(true);
					// the stale link goes, the directory it led to stays
					expect(fs.existsSync(path.join(outputPath, "stale.txt"))).toBe(false);
					expect(() => fs.lstatSync(path.join(outputPath, "old"))).toThrow(
						/ENOENT/
					);
					expect(
						fs.lstatSync(path.join(outputPath, "static")).isSymbolicLink()
					).toBe(true);
				});
			}
		]
	};
};

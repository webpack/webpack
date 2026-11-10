"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

const PLUGIN_NAME = "CleanSymlinkedDirectoryPlugin";

/**
 * @typedef {object} Variant
 * @property {string} name directory of this build
 * @property {string[]} without output file system methods the build goes without
 */

/** @type {Variant[]} */
const VARIANTS = [
	{ name: "lstat", without: [] },
	// links are told by readlink
	{ name: "readlink", without: ["lstat"] },
	// links cannot be told, so no directory below the output path is cleaned
	{ name: "none", without: ["lstat", "readlink"] }
];

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) =>
	VARIANTS.map(({ name, without }) => {
		const outputPath = path.join(testPath, name, "dist");
		const outside = path.join(testPath, name, "outside");
		/**
		 * @param {string} file path relative to the directory outside the output path
		 * @returns {boolean} true when the file is still there
		 */
		const kept = (file) => fs.existsSync(path.join(outside, file));
		return {
			name,
			output: {
				path: outputPath,
				clean: true
			},
			plugins: [
				/**
				 * @param {import("../../../../").Compiler} compiler compiler
				 */
				(compiler) => {
					let firstBuild = true;
					const base =
						/** @type {Record<string, EXPECTED_ANY>} */
						(/** @type {unknown} */ (compiler.outputFileSystem));
					/** @type {Record<string, EXPECTED_ANY>} */
					const outputFileSystem = {};
					for (const key of Object.keys(base)) {
						if (!without.includes(key)) outputFileSystem[key] = base[key];
					}
					compiler.outputFileSystem =
						/** @type {import("../../../../").OutputFileSystem} */
						(/** @type {unknown} */ (outputFileSystem));
					compiler.hooks.environment.tap(PLUGIN_NAME, () => {
						rimraf.sync(path.join(testPath, name));
						for (const directory of ["used", "unused"]) {
							fs.mkdirSync(path.join(outside, directory), { recursive: true });
							fs.writeFileSync(path.join(outside, directory, "file.txt"), "");
						}
						fs.writeFileSync(path.join(outside, "used", ".env"), "");
						fs.mkdirSync(path.join(outputPath, "stale"), { recursive: true });
						fs.writeFileSync(path.join(outputPath, "stale.txt"), "");
						fs.writeFileSync(path.join(outputPath, "stale", "file.txt"), "");
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
					compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
						expect(kept("used/file.txt")).toBe(true);
						expect(kept("used/.env")).toBe(true);
						expect(kept("used/lazy.txt")).toBe(true);
						expect(kept("unused/file.txt")).toBe(true);
						expect(fs.existsSync(path.join(outputPath, "stale.txt"))).toBe(
							false
						);
						expect(fs.existsSync(path.join(outputPath, "stale"))).toBe(
							name === "none"
						);
						expect(
							fs.lstatSync(path.join(outputPath, "static")).isSymbolicLink()
						).toBe(true);
						const warnings = (
							compilation.logging.get("webpack.CleanPlugin") || []
						).filter((entry) => entry.type === "warn");
						// a later build of the same compiler diffs to the assets it remembers
						if (firstBuild) {
							expect(warnings).toHaveLength(name === "none" ? 1 : 0);
						}
						firstBuild = false;
						// with lstat the stale link goes, the directory it led to stays
						if (name === "lstat") {
							expect(() => fs.lstatSync(path.join(outputPath, "old"))).toThrow(
								/ENOENT/
							);
						}
					});
				}
			]
		};
	});

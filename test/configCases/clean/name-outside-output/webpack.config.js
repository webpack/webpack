"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

const PLUGIN_NAME = "CleanNameOutsideOutputPlugin";

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const parent = path.join(testPath, "parent");
	const outputPath = path.join(parent, "dist");
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
					rimraf.sync(parent);
					fs.mkdirSync(path.join(parent, "neighbour"), { recursive: true });
					fs.writeFileSync(path.join(parent, "neighbour", "file.txt"), "");
					fs.writeFileSync(path.join(parent, "file.txt"), "");
					fs.mkdirSync(path.join(outputPath, "a"), { recursive: true });
					fs.writeFileSync(path.join(outputPath, "a", "stale.txt"), "");
				});
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
						// each name is a file inside the output directory once its
						// query is cut and its segments are folded
						compilation.emitAsset("..x/../inside.txt", new RawSource(""));
						compilation.emitAsset("a/..b/../c.txt", new RawSource(""));
						compilation.emitAsset(
							"picture.txt?/..a/../../../file.txt",
							new RawSource("")
						);
					});
				});
				compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
					expect(fs.existsSync(path.join(parent, "file.txt"))).toBe(true);
					expect(
						fs.existsSync(path.join(parent, "neighbour", "file.txt"))
					).toBe(true);
					expect(fs.readdirSync(outputPath).sort()).toEqual([
						"a",
						"bundle0.js",
						"inside.txt",
						"picture.txt"
					]);
					expect(fs.readdirSync(path.join(outputPath, "a"))).toEqual(["c.txt"]);
				});
			}
		]
	};
};

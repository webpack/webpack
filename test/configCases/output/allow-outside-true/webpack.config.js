"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

const PLUGIN_NAME = "AllowOutsideTruePlugin";

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const parent = path.join(testPath, "parent");
	return {
		experiments: {
			futureDefaults: true
		},
		output: {
			path: path.join(parent, "dist"),
			allowOutside: true
		},
		plugins: [
			/**
			 * @param {import("../../../../").Compiler} compiler compiler
			 */
			(compiler) => {
				compiler.hooks.environment.tap(PLUGIN_NAME, () => {
					rimraf.sync(parent);
				});
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
						compilation.emitAsset("../anywhere/file.txt", new RawSource("a"));
					});
				});
				compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
					expect(
						fs.readFileSync(path.join(parent, "anywhere", "file.txt"), "utf8")
					).toBe("a");
				});
			}
		]
	};
};

"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

const PLUGIN_NAME = "AllowOutsideListPlugin";

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const parent = path.join(testPath, "parent");
	const allowed = path.join(parent, "allowed");
	return {
		output: {
			path: path.join(parent, "dist"),
			allowOutside: [allowed],
			copy: [{ from: path.resolve(__dirname, "copied.txt"), to: "../allowed" }]
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
						compilation.emitAsset("../allowed/file.txt", new RawSource("a"));
						compilation.emitAsset("../denied/file.txt", new RawSource("d"));
					});
				});
				compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
					expect(fs.readFileSync(path.join(allowed, "file.txt"), "utf8")).toBe(
						"a"
					);
					expect(
						fs.readFileSync(path.join(allowed, "copied.txt"), "utf8")
					).toBe("copied\n");
					expect(fs.existsSync(path.join(parent, "denied"))).toBe(false);
				});
			}
		]
	};
};

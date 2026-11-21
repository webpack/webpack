"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

const PLUGIN_NAME = "SymlinkedDirectoryOutsidePlugin";

/** @typedef {"unset" | "allowed" | "denied"} Mode */

/** @type {Mode[]} */
const MODES = ["unset", "allowed", "denied"];

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) =>
	MODES.map((mode) => {
		const outputPath = path.join(testPath, mode, "dist");
		// output.path holds a link to this directory, beside it
		const elsewhere = path.join(testPath, mode, "elsewhere");
		return {
			name: mode,
			output: {
				path: outputPath,
				...(mode === "allowed"
					? { allowOutside: [elsewhere] }
					: mode === "denied"
						? { allowOutside: false }
						: {})
			},
			plugins: [
				/**
				 * @param {import("../../../../").Compiler} compiler compiler
				 */
				(compiler) => {
					compiler.hooks.environment.tap(PLUGIN_NAME, () => {
						rimraf.sync(path.join(testPath, mode));
						fs.mkdirSync(elsewhere, { recursive: true });
						fs.mkdirSync(outputPath, { recursive: true });
						fs.symlinkSync(
							elsewhere,
							path.join(outputPath, "linked"),
							"junction"
						);
					});
					compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
						compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
							compilation.emitAsset("linked/file.txt", new RawSource("linked"));
							compilation.emitAsset("inside/file.txt", new RawSource("inside"));
						});
					});
					compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
						const written = fs.existsSync(path.join(elsewhere, "file.txt"));
						const inside = fs.existsSync(
							path.join(outputPath, "inside", "file.txt")
						);
						if (written !== (mode !== "denied") || !inside) {
							compilation.errors.push(
								new compiler.webpack.WebpackError(
									`${mode}: written through the link ${written}, inside ${inside}`
								)
							);
						}
					});
				}
			]
		};
	});

"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

const PLUGIN_NAME = "SymlinkedDirectoryOutsidePlugin";

/** @typedef {"unset" | "allowed" | "denied" | "allowed-link"} Mode */

/** @type {Mode[]} */
const MODES = ["unset", "allowed", "denied", "allowed-link"];

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
				...(mode === "allowed" || mode === "allowed-link"
					? // with "allowed-link", the link "elsewhere" holds leads out of it
						{ allowOutside: [elsewhere] }
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
						if (mode === "allowed-link") {
							fs.mkdirSync(path.join(testPath, mode, "private"));
							fs.symlinkSync(
								path.join(testPath, mode, "private"),
								path.join(elsewhere, "link"),
								"junction"
							);
						}
					});
					compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
						compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
							compilation.emitAsset(
								mode === "allowed-link"
									? "../elsewhere/link/file.txt"
									: "linked/file.txt",
								new RawSource("linked")
							);
							compilation.emitAsset("inside/file.txt", new RawSource("inside"));
						});
					});
					compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
						const written = fs.existsSync(
							mode === "allowed-link"
								? path.join(testPath, mode, "private", "file.txt")
								: path.join(elsewhere, "file.txt")
						);
						const inside = fs.existsSync(
							path.join(outputPath, "inside", "file.txt")
						);
						const refused = mode === "denied" || mode === "allowed-link";
						if (written === refused || !inside) {
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

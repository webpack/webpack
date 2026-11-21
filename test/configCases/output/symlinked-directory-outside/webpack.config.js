"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

const PLUGIN_NAME = "SymlinkedDirectoryOutsidePlugin";

/** @typedef {"unset" | "allowed" | "denied" | "allowed-link" | "future-defaults" | "emitted-link" | "nested-link"} Mode */

/** @type {Mode[]} */
const MODES = [
	"unset",
	"allowed",
	"denied",
	"allowed-link",
	"future-defaults",
	// the link is an asset of the build, created before the file below it
	"emitted-link",
	// a link below an emitted link, created after it
	"nested-link"
];

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) =>
	MODES.map((mode) => {
		const outputPath = path.join(testPath, mode, "dist");
		// output.path holds a link to this directory, beside it
		const elsewhere = path.join(testPath, mode, "elsewhere");
		return {
			name: mode,
			// experiments.futureDefaults emits ECMAScript modules
			...(mode === "future-defaults"
				? { experiments: { futureDefaults: true } }
				: {}),
			output: {
				...(mode === "future-defaults" ? { filename: "[name].mjs" } : {}),
				path: outputPath,
				...(mode === "allowed" || mode === "allowed-link"
					? // with "allowed-link", the link "elsewhere" holds leads out of it
						{ allowOutside: [elsewhere] }
					: mode === "denied" ||
						  mode === "emitted-link" ||
						  mode === "nested-link"
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
						if (mode !== "emitted-link" && mode !== "nested-link") {
							fs.symlinkSync(
								elsewhere,
								path.join(outputPath, "linked"),
								"junction"
							);
						}
						if (mode === "allowed-link") {
							fs.mkdirSync(path.join(testPath, mode, "private"));
							fs.symlinkSync(
								path.join(testPath, mode, "private"),
								path.join(elsewhere, "link"),
								"junction"
							);
						}
					});
					if (mode === "emitted-link" || mode === "nested-link") {
						// a slow link: a file below it must still wait for it
						compiler.hooks.emit.tap(PLUGIN_NAME, () => {
							const fs = /** @type {EXPECTED_ANY} */ (
								compiler.outputFileSystem
							);
							if (fs.slowSymlink) return;
							const { symlink } = fs;
							fs.slowSymlink = true;
							/**
							 * @param {...EXPECTED_ANY} args arguments of fs.symlink
							 */
							fs.symlink = (...args) => {
								setTimeout(() => symlink.apply(fs, args), 50);
							};
						});
					}
					compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
						compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
							compilation.emitAsset(
								mode === "allowed-link"
									? "../elsewhere/link/file.txt"
									: "linked/file.txt",
								new RawSource("linked")
							);
							compilation.emitAsset("inside/file.txt", new RawSource("inside"));
							// below the link emitted next, which leads out of output.path
							if (mode === "nested-link") {
								compilation.emitAsset("linked/inner", new RawSource(""), {
									symlink: { target: outputPath, isDirectory: true }
								});
							}
							// emitted after the file below it, as a plugin may; with
							// "nested-link", its name holds a query that is not written
							if (mode === "emitted-link" || mode === "nested-link") {
								compilation.emitAsset(
									mode === "nested-link" ? "linked?cache=/a/b" : "linked",
									new RawSource(""),
									{ symlink: { target: elsewhere, isDirectory: true } }
								);
							}
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
						const refused = mode !== "unset" && mode !== "allowed";
						// no link is created outside of output.path either
						const linkedOut =
							mode === "nested-link" &&
							fs.existsSync(path.join(elsewhere, "inner"));
						if (written === refused || !inside || linkedOut) {
							compilation.errors.push(
								new compiler.webpack.WebpackError(
									`${mode}: written through the link ${written}, inside ${inside}, link outside ${linkedOut}`
								)
							);
						}
					});
				}
			]
		};
	});

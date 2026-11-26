"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { RawSource } = require("webpack-sources");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "SymlinkedFileOutsidePlugin";

/** @typedef {"unset" | "allowed" | "denied" | "dangling" | "no-compare" | "parent-segment" | "backslash-name"} Mode */

/** @type {Mode[]} */
const MODES = [
	"unset",
	"allowed",
	"denied",
	// the link leads to a file that does not exist yet
	"dangling",
	// output.compareBeforeEmit is off, so the file is not read before it is written
	"no-compare",
	// the link leads to "alias/../file.txt", where "alias" is a link out of output.path
	"parent-segment",
	// on POSIX "\\" is a character of a name, so "alias\\name/.." leaves a link named so
	...(process.platform === "win32"
		? []
		: /** @type {Mode[]} */ (["backslash-name"]))
];

/** @type {(env: unknown, options: { testPath: string }) => Configuration[]} */
module.exports = (env, { testPath }) =>
	MODES.map((mode) => {
		const outputPath = path.join(testPath, mode, "dist");
		// output.path holds a link to a file in this directory, beside it
		const elsewhere = path.join(testPath, mode, "elsewhere");
		const target = path.join(elsewhere, "file.txt");
		const refused = mode !== "unset" && mode !== "allowed";
		return {
			name: mode,
			output: {
				path: outputPath,
				compareBeforeEmit: mode !== "no-compare",
				allowOutside:
					mode === "allowed"
						? [elsewhere]
						: mode === "unset"
							? undefined
							: false
			},
			plugins: [
				/**
				 * @param {Compiler} compiler compiler
				 */
				(compiler) => {
					compiler.hooks.environment.tap(PLUGIN_NAME, () => {
						rimraf.sync(path.join(testPath, mode));
						fs.mkdirSync(elsewhere, { recursive: true });
						fs.mkdirSync(outputPath, { recursive: true });
						if (mode !== "dangling") fs.writeFileSync(target, "before");
						if (mode === "backslash-name") {
							fs.mkdirSync(path.join(elsewhere, "sub"));
							fs.symlinkSync(
								path.join(elsewhere, "sub"),
								path.join(outputPath, "alias\\name"),
								"junction"
							);
							fs.symlinkSync(
								"alias\\name/../file.txt",
								path.join(outputPath, "linked.txt")
							);
						} else if (mode === "parent-segment") {
							fs.mkdirSync(path.join(elsewhere, "sub"));
							fs.symlinkSync(
								path.join(elsewhere, "sub"),
								path.join(outputPath, "alias"),
								"junction"
							);
							// written as it is, as path.join would drop "alias/.."
							fs.symlinkSync(
								["alias", "..", "file.txt"].join(path.sep),
								path.join(outputPath, "linked.txt")
							);
						} else {
							fs.symlinkSync(target, path.join(outputPath, "linked.txt"));
						}
					});
					compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
						compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
							compilation.emitAsset("linked.txt", new RawSource("after"));
						});
					});
					compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
						const content = fs.existsSync(target)
							? fs.readFileSync(target, "utf8")
							: undefined;
						const expected = refused
							? mode === "dangling"
								? undefined
								: "before"
							: "after";
						if (content !== expected) {
							compilation.errors.push(
								new compiler.webpack.WebpackError(
									`${mode}: the linked file holds ${content}, expected ${expected}`
								)
							);
						}
					});
				}
			]
		};
	});

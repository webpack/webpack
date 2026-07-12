"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { RawSource } = require("webpack-sources");
const webpack = require("../../../../");

/** @typedef {import("../../../../").Compiler} Compiler */

const CONTENT = "emitted to an absolute path\n";

class EmitAbsolutePlugin {
	/**
	 * @param {string} target absolute target file
	 */
	constructor(target) {
		this.target = target;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const target = this.target;
		compiler.hooks.thisCompilation.tap("EmitAbsolutePlugin", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "EmitAbsolutePlugin",
					stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(target, new RawSource(CONTENT));
				}
			);
		});
		compiler.hooks.afterEmit.tap("EmitAbsolutePlugin", (compilation) => {
			// Without the fix, joining this drive-absolute path onto output.path
			// throws EINVAL on Windows; with it the file lands at `target`.
			if (
				!fs.existsSync(target) ||
				fs.readFileSync(target, "utf8") !== CONTENT
			) {
				compilation.errors.push(
					new webpack.WebpackError(`Asset not written to ${target}`)
				);
			}
		});
	}
}

// `testPath` is absolute (a drive path on Windows), so the emitted asset name is
// itself absolute and lands inside the output dir, which the test harness cleans.
/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	entry: "./index.js",
	plugins: [
		new EmitAbsolutePlugin(path.join(testPath, "emitted-absolute", "asset.txt"))
	]
});

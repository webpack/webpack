"use strict";

const { RawSource } = require("webpack-sources");
const webpack = require("../../../../");

/** @typedef {import("../../../../").Compiler} Compiler */

const ASSET = "nested/deep/asset.txt";
const CONTENT = "emitted while mkdir reported EISDIR\n";

/**
 * @returns {NodeJS.ErrnoException} an EISDIR error
 */
const makeEisdir = () => {
	const err = /** @type {NodeJS.ErrnoException} */ (
		new Error("EISDIR: illegal operation on a directory")
	);
	err.code = "EISDIR";
	return err;
};

// Wrap the output file system so mkdir reports EISDIR (not EEXIST) for an
// already-existing directory, like memfs/BSD do for the output root (#10544).
class EisdirMkdirPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const real = /** @type {EXPECTED_ANY} */ (compiler.outputFileSystem);
		const fs = /** @type {EXPECTED_ANY} */ (Object.create(real));
		/**
		 * @param {string} dir directory
		 * @param {EXPECTED_ANY} optionsOrCallback options or callback
		 * @param {(err?: Error) => void=} maybeCallback callback
		 * @returns {void}
		 */
		fs.mkdir = (dir, optionsOrCallback, maybeCallback) => {
			const callback =
				typeof optionsOrCallback === "function"
					? optionsOrCallback
					: maybeCallback;
			real.mkdir(dir, (/** @type {NodeJS.ErrnoException | null} */ err) => {
				// real ENOENT drives mkdirp's recursion; otherwise pretend the dir
				// already exists by reporting EISDIR
				callback(err && err.code === "ENOENT" ? err : makeEisdir());
			});
		};
		compiler.outputFileSystem = fs;

		compiler.hooks.thisCompilation.tap("EisdirMkdirPlugin", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "EisdirMkdirPlugin",
					stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(ASSET, new RawSource(CONTENT));
				}
			);
		});
	}
}

module.exports = {
	entry: "./index.js",
	plugins: [new EisdirMkdirPlugin()]
};

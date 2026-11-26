"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "LinkedFileRewritePlugin";

/** @type {Configuration} */
module.exports = {
	output: {
		allowOutside: false
	},
	plugins: [
		/**
		 * @param {Compiler} compiler compiler
		 */
		(compiler) => {
			/** @type {string} */
			let target;
			// output.path is known once the options are applied
			compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
				const outside = path.join(compiler.outputPath, "..", "rewrite-outside");
				target = path.join(outside, "target.txt");
				rimraf.sync(outside);
				fs.mkdirSync(outside, { recursive: true });
				fs.writeFileSync(target, "before");
			});
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					const { RawSource } = compiler.webpack.sources;
					const step = Number(currentWatchStep.step);
					// the file becomes a link to a file outside of output.path, which
					// the next build must not write through
					compilation.emitAsset(
						"file.txt",
						new RawSource(String(step)),
						step === 1 ? { symlink: { target, isDirectory: false } } : undefined
					);
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const content = fs.readFileSync(target, "utf8");
				if (content !== "before") {
					compilation.errors.push(
						new compiler.webpack.WebpackError(
							`the file outside holds ${content}, expected before`
						)
					);
				}
			});
		}
	]
};

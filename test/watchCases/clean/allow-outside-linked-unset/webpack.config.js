"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const PLUGIN_NAME = "AllowOutsideLinkedUnsetCleanPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: true
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			/** @type {string} */
			let outside;
			// output.path is known once the options are applied
			compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
				outside = path.join(compiler.outputPath, "..", "outside-linked-unset");
				rimraf.sync(outside);
				fs.mkdirSync(outside, { recursive: true });
				// written by someone else, never by this build
				fs.writeFileSync(path.join(outside, "foreign.txt"), "");
				// "linked" leads out of output.path, so assets below it land outside,
				// written and removed with a warning while output.allowOutside is unset
				const link = path.join(compiler.outputPath, "linked");
				fs.mkdirSync(compiler.outputPath, { recursive: true });
				try {
					fs.unlinkSync(link);
				} catch (_err) {
					// not made yet
				}
				fs.symlinkSync(outside, link, "junction");
			});
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					const { RawSource } = compiler.webpack.sources;
					const step = Number(currentWatchStep.step);
					compilation.emitAsset(`linked/step.${step}.txt`, new RawSource(""));
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const step = Number(currentWatchStep.step);
				const files = fs.readdirSync(outside).sort().join();
				const expected = ["foreign.txt", `step.${step}.txt`].sort().join();
				if (files !== expected) {
					compilation.errors.push(
						new compiler.webpack.WebpackError(
							`outside holds [${files}], expected [${expected}]`
						)
					);
				}
			});
		}
	]
};

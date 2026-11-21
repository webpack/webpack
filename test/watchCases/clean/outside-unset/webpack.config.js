"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const PLUGIN_NAME = "OutsideUnsetCleanPlugin";

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
				outside = path.join(compiler.outputPath, "..", "outside-unset-dir");
				rimraf.sync(outside);
				fs.mkdirSync(outside, { recursive: true });
				// written by someone else, never by this build
				fs.writeFileSync(path.join(outside, "foreign.txt"), "");
			});
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					compilation.emitAsset(
						`../outside-unset-dir/step.${currentWatchStep.step}.txt`,
						new compiler.webpack.sources.RawSource("")
					);
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const files = fs.readdirSync(outside).sort().join();
				const expected = `foreign.txt,step.${currentWatchStep.step}.txt`;
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

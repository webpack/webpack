"use strict";

const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

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
			compiler.hooks.initialize.tap("Test", () => {
				rimraf.sync(path.join(compiler.outputPath, "..", "outside-unset"));
			});
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.processAssets.tap("Test", () => {
					compilation.emitAsset(
						`../outside-unset/step.${currentWatchStep.step}.txt`,
						new compiler.webpack.sources.RawSource("")
					);
				});
			});
		}
	]
};

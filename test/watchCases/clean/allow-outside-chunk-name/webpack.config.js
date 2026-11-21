"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const PLUGIN_NAME = "AllowOutsideChunkNamePlugin";

// the chunk name each step's comment gives, its CSS following it
/** @type {string[]} */
const NAMES = ["a", "b", "a"];

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	devtool: false,
	output: {
		clean: true,
		chunkFilename: "[name].js",
		cssChunkFilename: "[name].css"
	},
	experiments: { css: true },
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			/** @type {string} */
			let outside;
			// output.path is known once the options are applied
			compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
				outside = path.join(compiler.outputPath, "..", "outside-chunk-name");
				compiler.options.output.allowOutside = [outside];
				rimraf.sync(outside);
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				// a fresh build of a later step never wrote the earlier chunk
				if (!compiler.watchMode) return;
				const files = fs.readdirSync(outside).sort().join();
				const name = NAMES[Number(currentWatchStep.step)];
				const expected = `${name}.css,${name}.js`;
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

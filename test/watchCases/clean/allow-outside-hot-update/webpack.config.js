"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "AllowOutsideHotUpdatePlugin";

// the hot update each step writes outside of output.path, steps 1 and 3 write none
/** @type {string[][]} */
const WRITTEN = [["0.hot-update.json"], [], ["2.hot-update.json"], []];
// what stays: the last hot update until a build after a newer one is written
/** @type {string[][]} */
const EXPECTED = [
	["0.hot-update.json"],
	["0.hot-update.json"],
	["0.hot-update.json", "2.hot-update.json"],
	["2.hot-update.json"]
];

/** @type {Configuration} */
module.exports = {
	output: {
		clean: true
	},
	plugins: [
		/**
		 * @param {Compiler} compiler compiler
		 */
		(compiler) => {
			/** @type {string} */
			let outside;
			// output.path is known once the options are applied
			compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
				outside = path.join(compiler.outputPath, "..", "outside-hot-update");
				compiler.options.output.allowOutside = [outside];
				rimraf.sync(outside);
			});
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					const { RawSource } = compiler.webpack.sources;
					for (const file of WRITTEN[Number(currentWatchStep.step)]) {
						compilation.emitAsset(
							`../outside-hot-update/${file}`,
							new RawSource("{}"),
							{ hotModuleReplacement: true }
						);
					}
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				// a fresh build of a later step never wrote the earlier hot update
				if (!compiler.watchMode) return;
				const files = fs.existsSync(outside)
					? fs.readdirSync(outside).sort().join(",")
					: "";
				const expected = EXPECTED[Number(currentWatchStep.step)].join(",");
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

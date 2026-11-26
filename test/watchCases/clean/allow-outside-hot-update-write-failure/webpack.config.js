"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "OutsideHotUpdateWriteFailurePlugin";

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
			let failed = false;
			// output.path is known once the options are applied
			compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
				outside = path.join(compiler.outputPath, "..", "outside-write-failure");
				compiler.options.output.allowOutside = [outside];
				rimraf.sync(outside);
			});
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					compilation.emitAsset(
						`../outside-write-failure/${currentWatchStep.step}.hot-update.json`,
						new compiler.webpack.sources.RawSource("{}"),
						{ hotModuleReplacement: true }
					);
				});
			});
			// the first write of step 1 fails: a directory holds its name
			compiler.hooks.emit.tap(PLUGIN_NAME, () => {
				if (!compiler.watchMode || currentWatchStep.step !== "1" || failed) {
					return;
				}
				failed = true;
				fs.mkdirSync(path.join(outside, "1.hot-update.json"), {
					recursive: true
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				// a fresh build of a later step never wrote the earlier hot update
				if (!compiler.watchMode) return;
				const files = fs.readdirSync(outside).sort().join(",");
				// the recovered step 1 keeps step 0's hot update, as it replaces it
				const expected =
					currentWatchStep.step === "0"
						? "0.hot-update.json"
						: "0.hot-update.json,1.hot-update.json";
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

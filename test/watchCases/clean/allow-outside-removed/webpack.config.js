"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const PLUGIN_NAME = "AllowOutsideCleanPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: { keep: /kept\.txt$/ }
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			/** @type {string} */
			let outside;
			// a fresh compiler of a later step never wrote it
			let wroteKept = false;
			// output.path is known once the options are applied
			compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
				outside = path.join(compiler.outputPath, "..", "outside-removed");
				compiler.options.output.allowOutside = [outside];
				rimraf.sync(outside);
				fs.mkdirSync(outside, { recursive: true });
				// written by someone else, never by this build
				fs.writeFileSync(path.join(outside, "foreign.txt"), "");
			});
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					const { RawSource } = compiler.webpack.sources;
					const step = Number(currentWatchStep.step);
					compilation.emitAsset(
						`../outside-removed/step.${step}.txt`,
						new RawSource("")
					);
					if (step === 0) {
						wroteKept = true;
						compilation.emitAsset(
							"../outside-removed/kept.txt",
							new RawSource("")
						);
					}
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const step = Number(currentWatchStep.step);
				const files = fs.readdirSync(outside).sort().join();
				const expected = [
					"foreign.txt",
					...(wroteKept ? ["kept.txt"] : []),
					`step.${step}.txt`
				]
					.sort()
					.join();
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

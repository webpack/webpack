"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const PLUGIN_NAME = "AllowOutsideLinkKeptCleanPlugin";

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
				outside = path.join(compiler.outputPath, "..", "outside-link-kept");
				compiler.options.output.allowOutside = [outside];
				rimraf.sync(outside);
				fs.mkdirSync(outside, { recursive: true });
			});
			// before the clean step, the file written by the first build becomes a link
			compiler.hooks.emit.tap({ name: PLUGIN_NAME, stage: -100 }, () => {
				if (Number(currentWatchStep.step) !== 1) return;
				const file = path.join(outside, "file.txt");
				fs.unlinkSync(file);
				fs.symlinkSync(path.join(outside, "real.txt"), file);
			});
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					const { RawSource } = compiler.webpack.sources;
					compilation.emitAsset(
						"../outside-link-kept/file.txt",
						new RawSource(String(currentWatchStep.step))
					);
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const step = Number(currentWatchStep.step);
				if (step === 0) return;
				const file = path.join(outside, "file.txt");
				const linked = fs.lstatSync(file).isSymbolicLink();
				const content = fs.readFileSync(path.join(outside, "real.txt"), "utf8");
				if (!linked || content !== String(step)) {
					compilation.errors.push(
						new compiler.webpack.WebpackError(
							`step ${step}: file.txt is a link ${linked}, real.txt holds ${content}`
						)
					);
				}
			});
		}
	]
};

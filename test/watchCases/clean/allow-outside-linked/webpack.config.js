"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "AllowOutsideLinkedCleanPlugin";

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
				outside = path.join(compiler.outputPath, "..", "outside-linked");
				compiler.options.output.allowOutside = [outside];
				rimraf.sync(outside);
				fs.mkdirSync(outside, { recursive: true });
				// written by someone else, never by this build
				fs.writeFileSync(path.join(outside, "foreign.txt"), "");
				// a link to a directory that is not allowed, so it is never written through
				const guarded = path.join(compiler.outputPath, "..", "guarded");
				rimraf.sync(guarded);
				fs.mkdirSync(guarded, { recursive: true });
				fs.writeFileSync(path.join(guarded, "file.txt"), "before");
				fs.symlinkSync(
					path.join(guarded, "file.txt"),
					path.join(outside, "guard.txt")
				);
				// "linked" leads out of output.path, so assets below it land outside
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
					// refused, so it stays when a later build does not emit it
					if (step === 0) {
						compilation.emitAsset("linked/guard.txt", new RawSource("after"));
					}
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const step = Number(currentWatchStep.step);
				const files = fs.readdirSync(outside).sort().join(",");
				const expected = ["foreign.txt", "guard.txt", `step.${step}.txt`]
					.sort()
					.join(",");
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

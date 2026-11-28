"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, ModuleGraph } from "webpack" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	experiments: { incremental: true },
	optimization: { sideEffects: false, concatenateModules: false },
	plugins: [
		(compiler) => {
			/** @type {ModuleGraph | undefined} */
			let previousGraph;
			compiler.hooks.finishMake.tap("IncrementalRecovery", (compilation) => {
				if (!compiler.watchMode) return;
				if (previousGraph) {
					expect(compilation.moduleGraph === previousGraph).toBe(
						compiler.options.experiments.incremental === true &&
							(currentWatchStep.step === "1" ||
								currentWatchStep.step === "3" ||
								currentWatchStep.step === "6")
					);
				}
				previousGraph = compilation.moduleGraph;
			});
		}
	]
};

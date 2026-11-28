"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	experiments: { incremental: true },
	optimization: { sideEffects: false, concatenateModules: false },
	plugins: [
		(compiler) => {
			/** @type {import("webpack").ModuleGraph | undefined} */
			let previousGraph;
			compiler.hooks.finishMake.tap("CheckDescriptionFile", (compilation) => {
				if (!compiler.watchMode) return;
				if (previousGraph) {
					expect(compilation.moduleGraph === previousGraph).toBe(
						compiler.options.experiments.incremental === true &&
							currentWatchStep.step === "3"
					);
				}
				previousGraph = compilation.moduleGraph;
			});
		}
	]
};

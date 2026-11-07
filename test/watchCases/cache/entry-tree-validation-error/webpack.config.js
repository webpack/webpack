"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration} */
module.exports = {
	cache: { type: "memory" },
	bail: true,
	module: {
		rules: [{ test: /barrel\.js$/, sideEffects: false }]
	},
	optimization: {
		providedExports: true,
		usedExports: false,
		sideEffects: true,
		concatenateModules: false
	},
	plugins: [
		(compiler) => {
			/** @type {Set<string>} */
			const failedSteps = new Set();
			/** @type {Set<string>} */
			const failedEntries = new Set();
			compiler.hooks.compilation.tap("EntryValidationError", (compilation) => {
				compiler.webpack.NormalModule.getCompilationHooks(
					compilation
				).needBuild.tapAsync(
					"EntryValidationError",
					(module, context, callback) => {
						const step = currentWatchStep.step;
						const filename = step === "1" ? "direct.js" : "reexported.js";
						if (
							!compiler.watchMode ||
							(step !== "1" && step !== "2") ||
							failedSteps.has(step) ||
							module.resource !== path.join(compiler.context, filename)
						) {
							return callback();
						}
						failedSteps.add(step);
						process.nextTick(() =>
							callback(new Error("Injected entry validation failure"))
						);
					}
				);
				compilation.hooks.failedEntry.tap(
					"EntryValidationError",
					(entry, options, error) => {
						expect(error.message).toContain(
							"Injected entry validation failure"
						);
						failedEntries.add(String(currentWatchStep.step));
					}
				);
				compilation.hooks.finishModules.tap("EntryValidationError", () => {
					const step = currentWatchStep.step;
					if (compiler.watchMode && (step === "1" || step === "2")) {
						expect(failedSteps.has(step)).toBe(true);
						expect(failedEntries.has(step)).toBe(true);
					}
				});
			});
		}
	]
};

"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = [true, false].map((unsafeCache, index) => ({
	mode: "development",
	cache: { type: "memory" },
	output: { filename: `bundle${index}.js` },
	module: {
		unsafeCache,
		rules: [{ test: /(?:barrel|nested|first|second)\.js$/, sideEffects: false }]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"CheckRetainedResolutions",
				(compilation, { normalModuleFactory }) => {
					/** @type {string[]} */
					const requests = [];
					normalModuleFactory.hooks.beforeResolve.tap(
						"CheckRetainedResolutions",
						(data) => {
							if (
								["./nested.js", "./first.js", "./second.js"].includes(
									data.request
								)
							) {
								requests.push(data.request);
							}
						}
					);
					compilation.hooks.finishModules.tap(
						"CheckRetainedResolutions",
						() => {
							if (compiler.watchMode && currentWatchStep.step === "1") {
								expect(requests).toEqual([]);
							}
						}
					);
				}
			);
		}
	]
}));

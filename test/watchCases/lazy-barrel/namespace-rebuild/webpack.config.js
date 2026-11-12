"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration} */
module.exports = {
	cache: { type: "memory" },
	module: {
		unsafeCache: true,
		rules: [{ test: /pkg/, sideEffects: false }]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"CheckNamespaceResolutions",
				(compilation, { normalModuleFactory }) => {
					/** @type {string[]} */
					const requests = [];
					normalModuleFactory.hooks.beforeResolve.tap(
						"CheckNamespaceResolutions",
						(data) => {
							if (data.context === path.join(compiler.context, "pkg")) {
								requests.push(data.request);
							}
						}
					);
					compilation.hooks.finishModules.tap(
						"CheckNamespaceResolutions",
						() => {
							if (compiler.watchMode && currentWatchStep.step !== "0") {
								expect(requests).toEqual([]);
							} else {
								expect(requests.sort()).toEqual(["./a", "./b"]);
							}
						}
					);
				}
			);
		}
	]
};

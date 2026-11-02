"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	module: {
		unsafeCache: false,
		rules: [{ test: /(?:barrel|first|second)\.js$/, sideEffects: false }]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("RetargetDependency", (compilation) => {
				for (const name of /** @type {const} */ ([
					"succeedModule",
					"stillValidModule"
				])) {
					compilation.hooks[name].tap("RetargetDependency", (module) => {
						if (currentWatchStep.step !== "1") return;
						for (const dependency of module.dependencies) {
							if (
								"request" in dependency &&
								dependency.request === "./first.js"
							) {
								dependency.request = "./second.js";
							}
						}
					});
				}
			});
		}
	]
};

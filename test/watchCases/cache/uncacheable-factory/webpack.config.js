"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	module: { rules: [{ test: /barrel\.js$/, sideEffects: false }] },
	plugins: [
		(compiler) => {
			let entries = 0;
			compiler.hooks.normalModuleFactory.tap(
				"UncacheableFactory",
				(factory) => {
					entries = 0;
					factory.hooks.beforeResolve.tap("UncacheableFactory", (data) => {
						const step = Number(currentWatchStep.step);
						if (data.request === "./index.js") {
							data.cacheable = false;
							entries++;
						} else if (data.request === "choice") {
							data.cacheable = step >= 2;
							data.request = step === 0 ? "./a.js" : "./b.js";
						} else if (data.request === "optional") {
							data.cacheable = false;
							if (step % 2 === 0) return false;
							data.request = "./a.js";
						}
					});
				}
			);
			compiler.hooks.afterCompile.tap("UncacheableFactory", () => {
				expect(entries).toBe(1);
			});
		}
	]
};

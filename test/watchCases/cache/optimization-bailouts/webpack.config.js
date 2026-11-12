"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	optimization: { concatenateModules: true },
	plugins: [
		(compiler) => {
			compiler.hooks.afterCompile.tap(
				"CheckOptimizationBailouts",
				(compilation) => {
					const module = /** @type {import("webpack").Module} */ (
						[...compilation.modules].find(
							(module) =>
								module.is("normal") &&
								/** @type {import("webpack").NormalModule} */ (module)
									.resource === path.join(compiler.context, "value.js")
						)
					);
					expect(module).toBeDefined();
					const reasons = compilation.moduleGraph
						.getOptimizationBailout(module)
						.map((reason) =>
							typeof reason === "function"
								? reason(compilation.requestShortener)
								: reason
						);
					expect(reasons).toEqual([...new Set(reasons)]);
					expect(
						reasons.filter((reason) => reason.startsWith("CommonJS bailout:"))
					).toHaveLength(1);
					expect(
						reasons.some((reason) => reason.includes("not in strict mode"))
					).toBe(Number(currentWatchStep.step) < 2);
				}
			);
		}
	]
};

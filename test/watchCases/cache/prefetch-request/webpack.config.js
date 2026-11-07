"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = [false, true].map((cache, index) => ({
	cache: cache ? { type: "memory" } : false,
	output: { filename: `bundle${index}.js`, clean: false },
	plugins: [
		(compiler) => {
			const plugin = new compiler.webpack.PrefetchPlugin("./a.js");
			compiler.hooks.make.tap("ChangePrefetchRequest", () => {
				plugin.request =
					currentWatchStep.step === "0" || currentWatchStep.step === "3"
						? "./a.js"
						: "./b.js";
			});
			plugin.apply(compiler);
			compiler.hooks.finishMake.tap("ChangePrefetchRequest", (compilation) => {
				const resources = [...compilation.modules]
					.map((module) =>
						path.basename(
							/** @type {import("webpack").NormalModule} */ (module).resource
						)
					)
					.sort();
				expect(resources).toEqual(
					[path.basename(plugin.request), "index.js", "tick.js"].sort()
				);
			});
		}
	]
}));

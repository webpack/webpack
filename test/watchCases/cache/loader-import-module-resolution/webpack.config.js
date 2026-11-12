"use strict";

/** @import Compilation from "../../../../lib/Compilation" */

/** @type {import("../../../..").Configuration[]} */
module.exports = ["./loader.js", "./load-loader.js"].map((loader, index) => ({
	output: { filename: `bundle${index}.js`, clean: false },
	module: {
		rules: [{ test: /\.generated$/, use: loader }]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.afterCompile.tap(
				"CheckResolveRetention",
				(compilation) => {
					const incremental =
						/** @type {import("webpack").Compilation & Compilation} */ (
							compilation
						)._incremental;
					expect(incremental._state.disabled).toBe(true);
					expect(incremental._resolveDependencies.size).toBe(0);
				}
			);
		}
	]
}));

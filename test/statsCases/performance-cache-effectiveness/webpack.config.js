"use strict";

// Reasons a plugin attaches directly, unlike the loader below which is
// attributed automatically. `f.js` states none at all.
/** @type {[string, string[] | undefined][]} */
const REASONS = [
	["c.js", ["a runtime value changes every build"]],
	["d.js", ["an external resource is read at build time"]],
	["e.js", ["a generated file has no stable content"]],
	["f.js", undefined]
];

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	performance: {
		hints: "stats",
		cacheEffectiveness: true
	},
	module: {
		rules: [
			{ test: /[\\/](?:a|b)\.js$/, use: require.resolve("./no-cache-loader") }
		]
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.succeedModule.tap("Test", (module) => {
						const resource = /** @type {import("../../../").NormalModule} */ (
							module
						).resource;

						for (const [name, reasons] of REASONS) {
							if (!resource || !resource.endsWith(name)) continue;

							const buildInfo =
								/** @type {import("../../../").NormalModuleBuildInfo} */ (
									module.buildInfo
								);

							buildInfo.cacheable = false;
							buildInfo.notCacheableReasons = reasons;
						}
					});
				});
			}
		}
	],
	stats: {
		all: false,
		hints: true
	}
};

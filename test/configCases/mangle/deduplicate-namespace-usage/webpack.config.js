"use strict";

/** @import { Configuration, Compiler } from "../../../../" */

/**
 * @param {number} index configuration index
 * @param {true | "global"} usedExports scope of the export usage analysis
 * @param {boolean} concatenateModules whether to concatenate modules
 * @returns {Configuration} configuration
 */
const config = (index, usedExports, concatenateModules) => ({
	mode: "production",
	target: "web",
	entry: {
		first: "./index.js",
		second: "./index.js",
		mixed: "./mixed.js",
		dependent: {
			import: "./dependent.js",
			dependOn: ["first", "second"]
		}
	},
	output: { filename: `[name].${index}.js` },
	optimization: {
		usedExports,
		concatenateModules,
		mangleExports: true,
		inlineExports: true,
		minimize: false
	},
	plugins: [
		{
			/**
			 * @param {Compiler} compiler compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.compilation.tap("CheckNamespaceUsage", (compilation) => {
					compilation.hooks.afterOptimizeDependencies.tap(
						"CheckNamespaceUsage",
						() => {
							const module = [...compilation.modules].find(
								(module) =>
									module.nameForCondition() === require.resolve("./library.js")
							);
							if (!module) throw new Error("Missing namespace provider");
							const exportsInfo =
								compilation.moduleGraph.getExportsInfo(module);
							for (const runtime of ["first", "second", "mixed"]) {
								for (const name of [
									"__esModule",
									"constant",
									"increment",
									"nested",
									"value"
								]) {
									expect(exportsInfo.getUsed(name, runtime)).toBe(
										compiler.webpack.UsageState.Used
									);
								}
							}
						}
					);
				});
			}
		}
	]
});

module.exports = [
	config(0, true, false),
	config(1, true, true),
	config(2, "global", false),
	config(3, "global", true)
];

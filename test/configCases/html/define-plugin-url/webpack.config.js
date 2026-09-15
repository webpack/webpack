"use strict";

const path = require("path");
const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		html: true,
		css: true
	},
	module: {
		rules: [
			{
				test: /\.html$/,
				type: "html"
			}
		]
	},
	plugins: [
		new DefinePlugin(
			{
				"%ASSET_BASE%": "./",
				"%RUNTIME_KEY%": DefinePlugin.runtimeValue(
					({ module }) => `module:${path.basename(module.resource)}`,
					[]
				)
			},
			{ type: "html" }
		),
		// Without the main hash, `needBuild` only sees keys the cached module
		// already holds, so adding or removing a define would not rebuild it.
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("AssertMainValueDep", (compilation) => {
					compilation.hooks.finishModules.tap(
						"AssertMainValueDep",
						(modules) => {
							for (const module of modules) {
								if (module.type !== "html") continue;
								const buildInfo =
									/** @type {import("../../../../lib/NormalModule").NormalModuleBuildInfo} */
									(module.buildInfo);
								const keys = [
									...(buildInfo.valueDependencies || new Map()).keys()
								];
								if (!keys.includes(DefinePlugin.VALUE_DEP_MAIN)) {
									compilation.errors.push(
										new Error(`missing main value dependency, got ${keys}`)
									);
								}
							}
						}
					);
				});
			}
		}
	]
};

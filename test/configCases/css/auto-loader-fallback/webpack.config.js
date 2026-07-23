"use strict";

const path = require("path");

const PLUGIN_NAME = "InjectLoaderPlugin";

// `experiments.css` stays at its "auto" default (no `.css` rule in `module.rules`),
// but loaders still reach `.css` modules — via an inline request or injected by a
// plugin hook. Those modules must fall back to javascript so the loader result is
// not misparsed by the built-in CSS type.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	plugins: [
		(compiler) => {
			compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, (nmf) => {
				nmf.hooks.afterResolve.tap(PLUGIN_NAME, (resolveData) => {
					const createData = resolveData.createData;
					if (/injected\.css$/.test(String(createData.resource))) {
						/** @type {NonNullable<(typeof createData)["loaders"]>} */
						(createData.loaders).push({
							loader: path.resolve(__dirname, "js-loader.js"),
							options: undefined
						});
					}
				});
			});
		}
	]
};

"use strict";

const path = require("path");

const PLUGIN_NAME = "InjectLoaderPlugin";

/**
 * `experiments.asyncWebAssembly` stays at its "auto" default, with no `.wasm`
 * rule in `module.rules`, yet loaders still reach `.wasm` modules through an
 * inline request or a plugin hook. Those modules must fall back to javascript.
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	plugins: [
		(compiler) => {
			compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, (nmf) => {
				nmf.hooks.afterResolve.tap(PLUGIN_NAME, (resolveData) => {
					const createData = resolveData.createData;
					if (/injected\.wasm$/.test(String(createData.resource))) {
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

"use strict";

/**
 * Loader A — runs second in the chain (right-to-left).
 *
 * Demonstrates cross-loader access: uses VirtualUrlPlugin.getPlugin() to retrieve
 * the plugin instance created by loader-b, adds its own virtual module, then
 * returns an export that imports from both virtual modules.
 */
const webpack = require("../../../../");

const { VirtualUrlPlugin } = webpack.experiments.schemes;

/** @this {import("../../../../").LoaderContext<{}>} */
module.exports = function loaderA(content) {
	// Cross-loader access: retrieve the plugin created by loader-b.
	const plugin = VirtualUrlPlugin.getPlugin(this._compiler);
	if (!plugin) {
		throw new Error(
			"VirtualUrlPlugin not found — loader-b should have created it"
		);
	}

	// Add another virtual module from this loader.
	plugin.addModule("module-a.js", `export const a = "registered-by-loader-a";`);

	// Return a module that imports from both virtual modules (one registered by
	// each loader). Resolution of these imports happens after all loaders finish,
	// by which point both modules are in the plugin's registry.
	return `
export { a } from "virtual:module-a.js";
export { b } from "virtual:module-b.js";
`;
};

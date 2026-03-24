"use strict";

/**
 * Loader B — runs first in the chain (right-to-left).
 *
 * Demonstrates creating a VirtualUrlPlugin from scratch mid-compilation and
 * registering a virtual module. The plugin is applied to the already-in-progress
 * compilation so subsequent module resolutions can use the "virtual:" scheme.
 */
const webpack = require("../../../../");

const { VirtualUrlPlugin } = webpack.experiments.schemes;

/** @this {import("../../../../").LoaderContext<{}>} */
module.exports = function loaderB(content) {
	// Create and apply a VirtualUrlPlugin if one isn't already registered.
	// After this call, resolveForScheme.for("virtual") is hooked into the
	// current compilation even though the compilation has already started.
	let plugin = VirtualUrlPlugin.getPlugin(this._compiler);
	if (!plugin) {
		plugin = new VirtualUrlPlugin({});
		plugin.apply(this._compiler);
	}

	// Register a virtual module from this loader.
	// Loader-a (which runs after loader-b) will also add modules and consume both.
	plugin.addModule("module-b.js", `export const b = "registered-by-loader-b";`);

	// Pass content through unchanged — loader-a will replace it.
	return content;
};

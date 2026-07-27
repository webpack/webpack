"use strict";

// Pass-through stand-in for babel-loader (empty options): keeps a loader-processed
// module in the graph without ESM-only @babel/core@8 (unloadable on Node<24.9/Deno/Bun).
/** @type {import("../../../").LoaderDefinition} */
module.exports = function identityLoader(source, map) {
	this.cacheable();
	this.callback(null, source, map);
};

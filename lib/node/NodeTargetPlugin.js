/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { builtinModules } = require("module");
const ExternalsPlugin = require("../ExternalsPlugin");

/** @typedef {import("../Compiler")} Compiler */

const builtins = [
	...builtinModules,

	/^node:/,

	// cspell:word pnpapi
	// Yarn PnP adds pnpapi as "builtin"
	"pnpapi"
];

class NodeTargetPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		new ExternalsPlugin("node-commonjs", builtins).apply(compiler);
	}
}

module.exports = NodeTargetPlugin;

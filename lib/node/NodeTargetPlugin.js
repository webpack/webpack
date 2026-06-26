/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");
const { builtins } = require("./nodeBuiltins");

/** @typedef {import("../../declarations/WebpackOptions").ExternalsType} ExternalsType */
/** @typedef {import("../Compiler")} Compiler */

class NodeTargetPlugin {
	/**
	 * Creates an instance of NodeTargetPlugin.
	 * @param {ExternalsType} type default external type
	 */
	constructor(type = "node-commonjs") {
		/** @type {ExternalsType} */
		this.type = type;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		new ExternalsPlugin((dependency) => {
			// When `require` node.js built-in modules with module output
			// we should still emit `createRequire` for compatibility
			if (dependency.category === "commonjs") {
				return "node-commonjs";
			}

			return this.type;
		}, builtins).apply(compiler);
	}
}

module.exports = NodeTargetPlugin;
module.exports.builtins = builtins;

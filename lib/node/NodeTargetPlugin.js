/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ExternalsPlugin from "../ExternalsPlugin.js";
import { builtins } from "./nodeBuiltins.js";
/** @typedef {import("../../declarations/WebpackOptions.js").ExternalsType} ExternalsType */
/** @typedef {import("../Compiler.js").default} Compiler */

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

export default NodeTargetPlugin;

// attach named exports as properties to keep the CJS shape
NodeTargetPlugin.builtins = builtins;

export { NodeTargetPlugin as "module.exports" };
export { builtins } from "./nodeBuiltins.js";

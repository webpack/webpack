/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("../Compiler.js").default} Compiler */

class NodeSourcePlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {}
}

export default NodeSourcePlugin;

export { NodeSourcePlugin as "module.exports" };

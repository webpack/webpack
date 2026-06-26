/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");
const { coreModules } = require("../node/nodeBuiltins");

/** @typedef {import("../Compiler")} Compiler */

// Bun exposes the node.js core modules; externalize them with the `node:`
// specifier (Bun resolves both forms) like the deno target.

// Bun's own built-in modules (`bun`, `bun:sqlite`, ...) are provided by the
// runtime, never bundled.
const BUN_BUILTINS = /^bun(?::|$)/;

class BunTargetPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		new ExternalsPlugin(
			(dependency) =>
				dependency.category === "commonjs" ? "node-commonjs" : "module-import",
			({ request }, callback) => {
				if (!request) return callback();
				if (request.startsWith("node:") || BUN_BUILTINS.test(request)) {
					return callback(null, request);
				}
				if (coreModules.has(request)) return callback(null, `node:${request}`);
				callback();
			}
		).apply(compiler);
	}
}

module.exports = BunTargetPlugin;

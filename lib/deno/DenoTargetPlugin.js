/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");
const NodeTargetPlugin = require("../node/NodeTargetPlugin");

/** @typedef {import("../Compiler")} Compiler */

// Deno only resolves node.js core modules through the `node:` specifier, so the
// prefix is baked into the external request for both `import` and `require`.
// cspell:word pnpapi
const coreModules = new Set(
	NodeTargetPlugin.builtins.filter(
		(builtin) => typeof builtin === "string" && builtin !== "pnpapi"
	)
);

// Deno's own import protocols are resolved by the runtime, never bundled.
const DENO_PROTOCOLS = /^(?:npm|jsr|https?):/;

class DenoTargetPlugin {
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
				if (request.startsWith("node:") || DENO_PROTOCOLS.test(request)) {
					return callback(null, request);
				}
				if (coreModules.has(request)) return callback(null, `node:${request}`);
				callback();
			}
		).apply(compiler);
	}
}

module.exports = DenoTargetPlugin;

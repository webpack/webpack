/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");

/** @typedef {import("../../declarations/WebpackOptions").ExternalsType} ExternalsType */
/** @typedef {import("../Compiler")} Compiler */

const builtins = [
	"assert",
	"assert/strict",
	"async_hooks",
	"buffer",
	"child_process",
	"cluster",
	"console",
	"constants",
	"crypto",
	"dgram",
	"diagnostics_channel",
	"dns",
	"dns/promises",
	"domain",
	"events",
	"fs",
	"fs/promises",
	"http",
	"http2",
	"https",
	"inspector",
	"inspector/promises",
	"module",
	"net",
	"os",
	"path",
	"path/posix",
	"path/win32",
	"perf_hooks",
	"process",
	"punycode",
	"querystring",
	"readline",
	"readline/promises",
	"repl",
	"stream",
	"stream/consumers",
	"stream/promises",
	"stream/web",
	"string_decoder",
	"sys",
	"timers",
	"timers/promises",
	"tls",
	"trace_events",
	"tty",
	"url",
	"util",
	"util/types",
	"v8",
	"vm",
	"wasi",
	"worker_threads",
	"zlib",
	/^node:/,

	// cspell:word pnpapi
	// Yarn PnP adds pnpapi as "builtin"
	"pnpapi"
];

// Core module names (no `node:` prefix, no regex, no pnpapi) used to recognize a
// stripped request that may carry the prefix.
const coreModules = new Set(
	builtins.filter(
		(builtin) => typeof builtin === "string" && builtin !== "pnpapi"
	)
);

const NODE_PREFIX = "node:";

/**
 * Externalizes node.js core modules while stripping the `node:` prefix, since
 * the target runtime can't resolve a prefixed request.
 * @type {import("../ExternalModuleFactoryPlugin").ExternalItemFunctionCallback}
 */
const externalsWithoutNodePrefix = ({ request }, callback) => {
	if (!request) return callback();
	if (request.startsWith(NODE_PREFIX)) {
		const name = request.slice(NODE_PREFIX.length);
		// Strip the prefix from core modules, keep other `node:` requests as-is.
		return callback(null, coreModules.has(name) ? name : request);
	}
	if (coreModules.has(request) || request === "pnpapi") {
		return callback(null, request);
	}
	callback();
};

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
		// Targets predating the `node:` specifier can't resolve a prefixed request.
		const supportsNodePrefix =
			compiler.options.output.environment.nodePrefixForCoreModules !== false;
		new ExternalsPlugin(
			(dependency) => {
				// When `require` node.js built-in modules with module output
				// we should still emit `createRequire` for compatibility
				if (dependency.category === "commonjs") {
					return "node-commonjs";
				}

				return this.type;
			},
			supportsNodePrefix ? builtins : externalsWithoutNodePrefix
		).apply(compiler);
	}
}

module.exports = NodeTargetPlugin;
module.exports.builtins = builtins;

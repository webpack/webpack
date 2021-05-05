/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");

/** @typedef {import("../Compiler")} Compiler */

const builtins = [
	"node:assert",
	"assert",
	"node:async_hooks",
	"async_hooks",
	"node:buffer",
	"buffer",
	"node:child_process",
	"child_process",
	"node:cluster",
	"cluster",
	"node:console",
	"console",
	"node:constants",
	"constants",
	"node:crypto",
	"crypto",
	"node:dgram",
	"dgram",
	"node:dns",
	"dns",
	"node:dns/promises",
	"dns/promises",
	"node:domain",
	"domain",
	"node:events",
	"events",
	"node:fs",
	"fs",
	"node:fs/promises",
	"fs/promises",
	"node:http",
	"http",
	"node:http2",
	"http2",
	"node:https",
	"https",
	"node:inspector",
	"inspector",
	"node:module",
	"module",
	"node:net",
	"net",
	"node:os",
	"os",
	"node:path",
	"path",
	"node:perf_hooks",
	"perf_hooks",
	"node:process",
	"process",
	"node:punycode",
	"punycode",
	"node:querystring",
	"querystring",
	"node:readline",
	"readline",
	"node:repl",
	"repl",
	"node:stream",
	"stream",
	"node:stream/promises",
	"stream/promises",
	"node:string_decoder",
	"string_decoder",
	"node:sys",
	"sys",
	"node:timers",
	"timers",
	"node:timers/promises",
	"timers/promises",
	"node:tls",
	"tls",
	"node:trace_events",
	"trace_events",
	"node:tty",
	"tty",
	"node:url",
	"url",
	"node:util",
	"util",
	"node:v8",
	"v8",
	"node:vm",
	"vm",
	"node:wasi",
	"wasi",
	"node:worker_threads",
	"worker_threads",
	"node:zlib",
	"zlib",

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
		new ExternalsPlugin("commonjs", builtins).apply(compiler);
	}
}

module.exports = NodeTargetPlugin;

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// node.js built-in modules externalized by the node/deno/bun target presets.
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

// Bare core module names (no `node:` prefix, no regex, no pnpapi), used to
// recognize a request that has a `node:`-prefixed equivalent.
const coreModules = new Set(
	builtins.filter(
		(builtin) => typeof builtin === "string" && builtin !== "pnpapi"
	)
);

module.exports.builtins = builtins;
module.exports.coreModules = coreModules;

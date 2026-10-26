"use strict";

// One `[fullhash]` read at runtime next to one re-encoded by a digest: the digest is
// inlined, but the plain placeholder still calls `getFullHash`, so it must be defined.

/** @type {import("../../../../").Configuration[]} */
const configurations = [];

for (const [target, phases] of [
	["universal", ["instantiate", "source"]],
	["node", ["instantiate", "source", "sync"]],
	["web", ["instantiate", "source", "sync"]]
]) {
	for (const phase of phases) {
		for (const [index, hash] of [
			"[fullhash].[fullhash:base64safe:8]",
			"[fullhash:8].[fullhash:hex:8]"
		].entries()) {
			const name = `${target}-${phase}-${index}`;
			// ESM output, where `eval` keeps the url off the baked path; node output
			// stays CommonJS, which never bakes it.
			const esm = target !== "node";
			configurations.push({
				mode: "development",
				target,
				devtool: esm ? "eval" : false,
				entry: phase === "source" ? "./source.js" : "./index.js",
				module: {
					rules: [
						{
							test: /\.wat$/,
							loader: "wast-loader",
							type: phase === "sync" ? "webassembly/sync" : "webassembly/async"
						}
					]
				},
				output: {
					module: esm,
					chunkFilename: `${name}-[name].${esm ? "mjs" : "js"}`,
					webassemblyModuleFilename: `${name}.${hash}.wasm`
				},
				experiments: {
					asyncWebAssembly: phase !== "sync",
					syncWebAssembly: phase === "sync",
					sourceImport: true
				}
			});
		}
	}
}

module.exports = configurations;

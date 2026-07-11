"use strict";

const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");

module.exports = {
	findBundle(i, options) {
		const isModule = Boolean(options.experiments.outputModule);
		const bundle = `./bundle${i}.${isModule ? "mjs" : "js"}`;
		// Module output loads chunks through the ESM linker, so only the entry
		// bundle is needed. JSONP (non-module) output needs the chunk preloaded
		// so its chunk-loading promise resolves in the test runner.
		if (isModule) return [bundle];
		const suffix = i === 1 ? ".async.js" : ".sync.js";
		const chunks = fs
			.readdirSync(path.join(options.output.path, "chunks"))
			.filter((f) => f.endsWith(suffix))
			.map((f) => `./chunks/${f}`);
		return [...chunks, bundle];
	},
	moduleScope(scope, options) {
		// Serve wasm with a wrong MIME type so streaming instantiation fails
		// and the runtime must fall back to `WebAssembly.instantiate`.
		scope.fetch = (resource) =>
			new Promise((resolve, reject) => {
				const file = /^file:/i.test(resource)
					? url.fileURLToPath(resource)
					: path.join(options.output.path, path.basename(resource));

				fs.readFile(file, (err, data) => {
					if (err) {
						reject(err);
						return;
					}

					return resolve(
						new Response(data, {
							headers: { "Content-Type": "application/octet-stream" }
						})
					);
				});
			});
	}
};

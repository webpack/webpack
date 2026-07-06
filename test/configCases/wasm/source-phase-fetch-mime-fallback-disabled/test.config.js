"use strict";

const fs = require("fs");
const path = require("path");
const url = require("url");

module.exports = {
	findBundle(i, options) {
		const isModule = Boolean(options.experiments.outputModule);
		const bundle = `./bundle${i}.${isModule ? "mjs" : "js"}`;
		// Module output links chunks through the ESM linker, so only the entry
		// bundle is needed. JSONP (non-module) output needs the chunk preloaded
		// so its chunk-loading promise resolves in the test runner.
		if (isModule) return [bundle];
		const chunks = fs
			.readdirSync(path.join(options.output.path, "chunks"))
			.filter((f) => f.endsWith(".async.js"))
			.map((f) => `./chunks/${f}`);
		return [...chunks, bundle];
	},
	moduleScope(scope, options) {
		// Serve wasm with a wrong MIME type so streaming compilation fails
		// and the runtime must fall back to `WebAssembly.compile`.
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

"use strict";

const fs = require("fs");
const path = require("path");
const url = require("url");

module.exports = {
	findBundle(i, options) {
		const bundle = `./bundle${i}.js`;
		const suffix = i === 0 ? ".async.js" : ".sync.js";
		const chunks = fs
			.readdirSync(path.join(options.output.path, "chunks"))
			.filter((f) => f.endsWith(suffix))
			.map((f) => `./chunks/${f}`);
		return [...chunks, bundle];
	},
	moduleScope(scope, options) {
		// Serve wasm with a wrong MIME type; with `wasmStreamingFallback` disabled
		// streaming instantiation must reject instead of falling back.
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

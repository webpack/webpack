"use strict";

const fs = require("fs");
const path = require("path");
const url = require("url");

module.exports = {
	findBundle(i) {
		switch (i) {
			case 0:
				return ["chunks/93.async.js", "bundle0.js"];
			case 1:
				return ["chunks/93.sync.js", "bundle1.js"];
		}
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

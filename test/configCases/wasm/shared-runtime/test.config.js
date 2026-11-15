"use strict";

const fs = require("fs");
const path = require("path");
const url = require("url");

module.exports = {
	evaluateScriptOnAttached: true,
	findBundle(index, options) {
		const extension = options.output.module ? "mjs" : "js";
		return [`runtime.${index}.${extension}`, `main.${index}.${extension}`];
	},
	moduleScope(scope, options) {
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
							headers: { "Content-Type": "application/wasm" }
						})
					);
				});
			});
	}
};

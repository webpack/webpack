"use strict";

const fs = require("fs");
const path = require("path");
const url = require("url");

module.exports = {
	moduleScope(scope, options, target) {
		if (target !== "web") return;
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

					resolve(
						new Response(data, {
							headers: { "Content-Type": "application/wasm" }
						})
					);
				});
			});
	}
};

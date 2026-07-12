"use strict";

const fs = require("node:fs");
const url = require("node:url");

module.exports = {
	moduleScope(scope, options, target) {
		if (target === "web") {
			scope.fetch = (resource) =>
				new Promise((resolve, reject) => {
					fs.readFile(url.fileURLToPath(resource), (err, data) => {
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
	}
};

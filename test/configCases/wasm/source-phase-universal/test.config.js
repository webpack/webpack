"use strict";

const fs = require("fs");
const url = require("url");
const worker = require("worker_threads");

module.exports = {
	moduleScope(scope, options) {
		if (options.name.includes("node")) {
			delete scope.window;
			delete scope.document;
			delete scope.self;
			scope.Worker = worker.Worker;
		} else {
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

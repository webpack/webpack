const fs = require("fs");
const url = require("url");
const path = require("path");

module.exports = {
	findBundle: function (i, options) {
		switch (i) {
			case 0:
				return ["bundle0.mjs"];
			case 1:
				return ["chunks/93.async.js", "bundle1.js"];
			case 2:
				return ["bundle2.mjs"];
			case 3:
				return ["chunks/93.sync.js", "bundle3.js"];
		}
	},
	moduleScope(scope, options) {
		scope.fetch = resource =>
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
						// eslint-disable-next-line n/no-unsupported-features/node-builtins
						new Response(data, {
							headers: { "Content-Type": "application/wasm" }
						})
					);
				});
			});
	}
};

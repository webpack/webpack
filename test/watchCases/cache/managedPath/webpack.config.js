const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory",
		managedPaths: [
			path.resolve(
				__dirname,
				"../../../js/watch-src/cache/managedPath/node_modules"
			)
		]
	},
	module: {
		unsafeCache: false
	}
};

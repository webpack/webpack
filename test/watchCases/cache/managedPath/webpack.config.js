const path = require("path");

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

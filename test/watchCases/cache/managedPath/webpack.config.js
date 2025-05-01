const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	cache: {
		type: "memory"
	},
	snapshot: {
		managedPaths: [path.resolve(srcPath, "node_modules")]
	},
	module: {
		unsafeCache: false
	}
});

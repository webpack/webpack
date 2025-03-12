const path = require("path");
/** @type {(env: any, options: any) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
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

const path = require("path");

/** @typedef {import("../../../WatchTestCases.template").Env} */
/** @typedef {import("../../../WatchTestCases.template").TestOptions} */

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => {
	console.log(env);

	return {
		cache: {
			type: "memory"
		},
		snapshot: {
			managedPaths: [path.resolve(srcPath, "node_modules")]
		},
		module: {
			unsafeCache: false
		}
	};
};

var path = require("path");

/** @typedef {import("../../../WatchTestCases.template").Env} Env */
/** @typedef {import("../../../WatchTestCases.template").TestOptions} TestOptions */

/** @type {(env: Env, options: TestOptions) => import("../../../../types").Configuration} */
module.exports = (env, { testPath }) => ({
	target: "node14",
	output: {
		chunkLoading: "import"
	},
	resolve: {
		alias: {
			library: path.resolve(testPath, "../0-create-library/lib.js")
		}
	},
	experiments: {
		topLevelAwait: true,
		outputModule: true
	}
});

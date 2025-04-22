const path = require("path");

/** @typedef {import("../../../WatchTestCases.template").Env} Env */
/** @typedef {import("../../../WatchTestCases.template").TestOptions} TestOptions */

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	mode: "development",
	entry: "./test",
	recordsOutputPath: path.resolve(testPath, "records.json"),
	optimization: {
		chunkIds: "size"
	},
	target: "node",
	node: {
		__dirname: false
	}
});

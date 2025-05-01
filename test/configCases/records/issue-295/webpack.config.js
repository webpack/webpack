const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	entry: "./test",
	recordsPath: path.resolve(testPath, "records.json"),
	target: "node",
	node: {
		__dirname: false
	}
});

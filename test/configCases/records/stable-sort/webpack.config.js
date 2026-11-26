"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {(env: Env, options: TestOptions) => Configuration} */
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

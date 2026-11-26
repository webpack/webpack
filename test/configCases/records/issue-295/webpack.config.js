"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {(env: Env, options: TestOptions) => Configuration} */
module.exports = (env, { testPath }) => ({
	entry: "./test",
	recordsPath: path.resolve(testPath, "records.json"),
	target: "node",
	node: {
		__dirname: false
	}
});

"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {(env: unknown, options: { testPath: string }) => Configuration} */
module.exports = (env, { testPath }) => ({
	output: {
		allowOutside: [path.join(testPath, "..", "allow-outside-copy-allowed")],
		copy: [{ from: path.resolve(__dirname, "copied.txt"), to: "../denied" }]
	}
});

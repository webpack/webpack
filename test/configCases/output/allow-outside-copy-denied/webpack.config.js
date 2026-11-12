"use strict";

const path = require("path");

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	output: {
		allowOutside: [path.join(testPath, "..", "allow-outside-copy-allowed")],
		copy: [{ from: path.resolve(__dirname, "copied.txt"), to: "../denied" }]
	}
});

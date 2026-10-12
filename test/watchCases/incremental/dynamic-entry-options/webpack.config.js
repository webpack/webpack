"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @param {Record<string, unknown> | undefined} env env
 * @param {{ srcPath: string }} argv argv
 * @returns {import("../../../../").Configuration} configuration
 */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	entry: () => ({
		main: "./index.js",
		other: {
			import: ["./other.js"],
			filename: fs.existsSync(path.join(srcPath, "first-flag.js"))
				? "first-other.js"
				: "second-other.js"
		}
	}),
	output: {
		filename: "[name].js"
	}
});

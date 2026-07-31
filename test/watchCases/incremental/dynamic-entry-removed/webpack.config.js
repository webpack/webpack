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
	output: {
		filename: "[name].js"
	},
	entry: () =>
		fs.existsSync(path.join(srcPath, "extra-flag.js"))
			? { main: "./index.js", extra: "./extra.js" }
			: { main: "./index.js" }
});

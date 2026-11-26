"use strict";

const fs = require("fs");
const path = require("path");

/** @import { Configuration } from "../../../../" */

/**
 * @param {Record<string, unknown> | undefined} env env
 * @param {{ srcPath: string }} argv argv
 * @returns {Configuration} configuration
 */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	output: {
		filename: "[name].js"
	},
	entry: () => {
		/** @type {Record<string, string>} */
		const entries = { main: "./index.js" };
		if (fs.existsSync(path.join(srcPath, "extra-flag.js"))) {
			entries.extra = "./extra.js";
		}
		return entries;
	}
});

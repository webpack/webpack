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
	entry: () => {
		/** @type {Record<string, string>} */
		const entries = { bundle: "./index.js", first: "./shared.js" };
		// keyed off a watched file so the rebuild actually fires
		const changing = fs.readFileSync(path.join(srcPath, "changing.js"), "utf8");
		if (changing.includes("second")) {
			entries.second = "./shared.js";
		}
		return entries;
	},
	output: {
		filename: "[name].js"
	}
});

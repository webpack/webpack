"use strict";

const EntryPlugin = require("../../../../lib/EntryPlugin");

/**
 * @param {Record<string, unknown> | undefined} env env
 * @param {{ srcPath: string }} argv argv
 * @returns {import("../../../../").Configuration} configuration
 */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	entry: {},
	output: {
		filename: "[name].js"
	},
	plugins: [
		// two addEntry calls for one name: the second contributes `runtime`
		new EntryPlugin(srcPath, "./client.js", { name: "main" }),
		new EntryPlugin(srcPath, "./index.js", { name: "main", runtime: "rt" })
	]
});

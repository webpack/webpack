"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		environment: {
			nodePrefixForCoreModules: false
		}
	},
	plugins: [
		new webpack.WorkerEntryPlugin(
			__dirname,
			path.resolve(__dirname, "client.js")
		)
	]
};

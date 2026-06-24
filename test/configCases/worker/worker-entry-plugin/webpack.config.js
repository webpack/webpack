"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js"
	},
	plugins: [
		new webpack.WorkerEntryPlugin(
			__dirname,
			path.resolve(__dirname, "injected.js")
		)
	]
};

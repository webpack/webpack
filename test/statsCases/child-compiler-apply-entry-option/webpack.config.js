"use strict";

var TestApplyEntryOptionPlugin = require("./TestApplyEntryOptionPlugin");

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: {
		parent: "./parent"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new TestApplyEntryOptionPlugin({
			entry: {
				child: "./child"
			}
		})
	],
	stats: {
		children: true,
		entrypoints: true
	}
};

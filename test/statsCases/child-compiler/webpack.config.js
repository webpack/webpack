"use strict";

const TestApplyEntryOptionPlugin = require("./TestApplyEntryOptionPlugin");

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: {
		parent: "./parent"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new TestApplyEntryOptionPlugin(
			{
				entry: {
					child1: "./child1"
				}
			},
			"first"
		),
		new TestApplyEntryOptionPlugin(
			{
				entry: {
					child2: "./child2"
				}
			},
			"second"
		)
	],
	stats: {
		children: [{ hash: false, modules: true, entrypoints: true }, "minimal"]
	}
};

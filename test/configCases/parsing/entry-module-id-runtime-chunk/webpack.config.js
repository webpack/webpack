"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimize: false,
		// the split runtime chunk holds the tree requirements for the entry
		runtimeChunk: "single"
	}
};

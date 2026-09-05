"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	// The runtime lives in the entry depended on, so the async entries run through
	// the chunk format's own startup rather than the runtime chunk's.
	entry: {
		app: { import: ["./a.js", "./b.js"], dependOn: "vendors" },
		vendors: "./vendors.js"
	},
	output: {
		module: true,
		filename: "[name].mjs"
	}
};

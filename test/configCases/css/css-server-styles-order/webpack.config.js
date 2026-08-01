"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: ["web", "node"],
	mode: "development",
	// numeric module ids are what makes enumeration order observable
	optimization: {
		moduleIds: "deterministic"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css",
				parser: {
					exportType: "style"
				}
			}
		]
	},
	experiments: {
		css: true
	},
	output: {
		uniqueName: "order"
	}
};

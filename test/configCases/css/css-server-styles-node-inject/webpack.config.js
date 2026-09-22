"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css",
				// route the stylesheet through the inject runtime rather than a chunk asset
				parser: {
					exportType: "style"
				}
			}
		],
		generator: {
			css: {
				exportsOnly: false
			}
		}
	},
	output: {
		module: true
	},
	experiments: {
		css: true
	}
};

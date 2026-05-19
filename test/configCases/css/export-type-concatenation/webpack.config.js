"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		chunkIds: "named"
	},
	module: {
		rules: [
			{
				test: /text-.*\.css$/,
				type: "css/module",
				parser: {
					exportType: "text"
				}
			},
			{
				test: /sheet-.*\.css$/,
				type: "css/module",
				parser: {
					exportType: "css-style-sheet"
				}
			},
			{
				test: /link-.*\.css$/,
				type: "css/module",
				parser: {
					exportType: "link"
				}
			},
			{
				test: /style-.*\.css$/,
				type: "css/module",
				parser: {
					exportType: "style"
				}
			}
		]
	},
	experiments: {
		css: true
	}
};

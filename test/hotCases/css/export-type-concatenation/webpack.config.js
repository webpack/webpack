"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	optimization: {
		concatenateModules: true
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
				test: /style-.*\.css$/,
				type: "css/module",
				parser: {
					exportType: "style"
				}
			},
			{
				test: /link-.*\.css$/,
				type: "css/module",
				parser: {
					exportType: "link"
				}
			}
		]
	},
	experiments: {
		css: true
	}
};

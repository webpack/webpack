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
				test: /text\.css$/,
				type: "css/module",
				parser: {
					exportType: "text"
				}
			},
			{
				test: /stylesheet\.css$/,
				type: "css/module",
				parser: {
					exportType: "css-style-sheet"
				}
			}
		]
	},
	experiments: {
		css: true
	}
};

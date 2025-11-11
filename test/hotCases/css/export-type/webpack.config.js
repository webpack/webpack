"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
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
				type: "css/module"
			}
		]
	},
	experiments: {
		css: true
	}
};

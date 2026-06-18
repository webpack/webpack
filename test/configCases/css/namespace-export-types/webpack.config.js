"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{ test: /text\.css$/, type: "css/auto", parser: { exportType: "text" } },
			{
				test: /sheet\.css$/,
				type: "css/auto",
				parser: { exportType: "css-style-sheet" }
			},
			{
				test: /inject\.css$/,
				type: "css/auto",
				parser: { exportType: "style" }
			}
		]
	},
	experiments: {
		css: true
	}
};

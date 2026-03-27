"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: "source-map",
	target: "node",
	mode: "development",
	module: {
		rules: [
			{
				test: /style\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			}
		]
	},
	experiments: {
		css: true
	}
};

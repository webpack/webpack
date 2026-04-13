"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].chunk.js"
	},
	module: {
		rules: [
			{
				test: /\.link\.css$/,
				type: "css/auto",
				parser: { exportType: "link" }
			},
			{
				test: /\.text\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			},
			{
				test: /\.css-style-sheet\.css$/,
				type: "css/auto",
				parser: { exportType: "css-style-sheet" }
			},
			{
				test: /\.style\.css$/,
				type: "css/auto",
				parser: { exportType: "style" }
			}
		]
	},
	experiments: {
		css: true
	}
};

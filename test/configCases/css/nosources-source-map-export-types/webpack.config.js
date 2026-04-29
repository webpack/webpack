"use strict";

/**
 * @param {string} exportType the CSS parser exportType under test
 * @returns {import("../../../../").Configuration} webpack configuration
 */
const makeConfig = (exportType) => ({
	name: exportType,
	target: "web",
	mode: "development",
	devtool: "nosources-source-map",
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				...(exportType !== "link" && { parser: { exportType } })
			}
		]
	},
	experiments: {
		css: true
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	makeConfig("link"),
	makeConfig("text"),
	makeConfig("style"),
	makeConfig("css-style-sheet")
];

"use strict";

/**
 * @param {"text" | "css-style-sheet"} exportType the CSS parser exportType
 * @returns {import("../../../../").Configuration} webpack configuration
 */
const makeConfig = (exportType) => ({
	name: exportType,
	target: "web",
	mode: "development",
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				parser: { exportType }
			}
		]
	},
	experiments: {
		css: true
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [makeConfig("text"), makeConfig("css-style-sheet")];

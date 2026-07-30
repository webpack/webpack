"use strict";

/**
 * @param {string} name config name
 * @param {import("../../../../").Configuration["devtool"]} devtool devtool under test
 * @returns {import("../../../../").Configuration} webpack configuration
 */
const makeConfig = (name, devtool) => ({
	name,
	target: "web",
	mode: "development",
	devtool,
	experiments: { css: true },
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	}
});

module.exports = [
	makeConfig("hidden", "hidden-source-map"),
	makeConfig("hidden-per-type", [{ type: "all", use: "hidden-source-map" }]),
	makeConfig("source-map", "source-map")
];

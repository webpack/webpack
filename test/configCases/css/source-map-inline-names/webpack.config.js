"use strict";

const path = require("path");

/**
 * @param {string} name config name
 * @param {object} options options
 * @param {string=} options.devtoolModuleFilenameTemplate custom template under test
 * @param {boolean=} options.withLoader whether to run the css through a loader reporting its own map
 * @returns {import("../../../../").Configuration} webpack configuration
 */
const makeConfig = (name, options = {}) => ({
	name,
	target: "web",
	mode: "development",
	devtool: "source-map",
	experiments: { css: true },
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				parser: { exportType: "text" },
				use: options.withLoader
					? [path.resolve(__dirname, "loader.js")]
					: undefined
			}
		]
	},
	output: options.devtoolModuleFilenameTemplate
		? { devtoolModuleFilenameTemplate: options.devtoolModuleFilenameTemplate }
		: {}
});

module.exports = [
	makeConfig("default"),
	makeConfig("custom-template", {
		devtoolModuleFilenameTemplate: "webpack://custom/[resource-path]"
	}),
	makeConfig("loader-reported-sources", { withLoader: true })
];

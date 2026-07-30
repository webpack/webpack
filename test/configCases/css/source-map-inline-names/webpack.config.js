"use strict";

const path = require("path");

/**
 * @param {string} name config name
 * @param {object} options options
 * @param {string=} options.devtoolModuleFilenameTemplate custom template under test
 * @param {string=} options.loader a loader reporting its own map, relative to this directory
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
				use: options.loader
					? [path.resolve(__dirname, options.loader)]
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
	makeConfig("loader-reported-sources", { loader: "loader.js" }),
	makeConfig("loader-reported-urls", { loader: "remote-loader.js" })
];

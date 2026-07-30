"use strict";

/**
 * @param {string} name config name
 * @param {string=} devtoolModuleFilenameTemplate custom template under test
 * @returns {import("../../../../").Configuration} webpack configuration
 */
const makeConfig = (name, devtoolModuleFilenameTemplate) => ({
	name,
	target: "web",
	mode: "development",
	devtool: "source-map",
	experiments: { css: true },
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	},
	output: devtoolModuleFilenameTemplate ? { devtoolModuleFilenameTemplate } : {}
});

module.exports = [
	makeConfig("default"),
	makeConfig("custom-template", "webpack://custom/[resource-path]")
];

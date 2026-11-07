"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: { threads: { max: 1 } },
	output: {
		filename: () => "bundle0.js",
		publicPath: () => "/assets/",
		devtoolModuleFilenameTemplate: (info) => `webpack:///${info.resourcePath}`
	},
	module: {
		rules: [
			{
				test: /value\.js$/,
				use: ["./loader"],
				threads: true
			}
		]
	}
};

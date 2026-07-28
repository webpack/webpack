"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	node: { __dirname: false, __filename: false },
	mode: "development",
	devtool: "source-map",
	experiments: { css: true },
	output: {
		devtoolModuleFilenameTemplate:
			"webpack://[namespace]/[resource-path]?loaders=[loaders]"
	}
};

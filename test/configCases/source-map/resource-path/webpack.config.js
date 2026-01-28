"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	entry: {
		main: {
			import: "./index",
			layer: "something"
		}
	},
	output: {
		devtoolModuleFilenameTemplate(info) {
			return info.absoluteResourcePath;
		}
	}
};

"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	entry: "./index.html",
	experiments: {
		html: true
	},
	output: {
		assetModuleFilename: "bundle0[ext]"
	}
};

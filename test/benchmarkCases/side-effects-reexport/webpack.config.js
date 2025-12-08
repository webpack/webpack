"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	entry: "./index.js",
	mode: "development",
	experiments: {
		css: true
	},
	optimization: {
		concatenateModules: false
	}
};

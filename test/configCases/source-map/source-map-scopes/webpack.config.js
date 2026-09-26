"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "source-map-scopes",
	entry: "./index.js",
	optimization: {
		concatenateModules: false
	}
};

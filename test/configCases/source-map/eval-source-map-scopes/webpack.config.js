"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "eval-source-map-scopes",
	entry: "./index.js",
	optimization: {
		concatenateModules: false
	}
};

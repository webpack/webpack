"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	devtool: "source-map",
	module: {
		rules: [{ test: /dep\.js$/, extractSourceMap: true }]
	}
};

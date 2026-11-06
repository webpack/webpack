"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "source-map",
	experiments: { threads: { max: 1 } },
	module: {
		rules: [{ test: /value\.js$/, extractSourceMap: true, threads: true }]
	}
};

"use strict";

// Regression test for https://github.com/webpack/webpack/issues/21459:
// `output.module` with jsonp/array-push must emit a plain-JSON hot-update
// manifest (fetched via `fetch().json()`), not an `export default` ES module.
/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkLoading: "jsonp",
		chunkFormat: "array-push",
		library: {
			type: "module"
		}
	},
	optimization: {
		minimize: false
	}
};

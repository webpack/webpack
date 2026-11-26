"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

// Regression test for https://github.com/webpack/webpack/issues/21459:
// `output.module` with jsonp/array-push must emit a plain-JSON hot-update
// manifest (fetched via `fetch().json()`), not an `export default` ES module.
/** @type {Configuration} */
module.exports = {
	mode: "development",
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

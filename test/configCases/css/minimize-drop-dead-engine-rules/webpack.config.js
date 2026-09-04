"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A selection with no Trident, EdgeHTML or Presto in it, so a rule only one
	// of those engines could ever have read paints nothing and goes.
	target: "browserslist: chrome 120, firefox 120, safari 17",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// `"..."` keeps the default minimizer, which resolves the target.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};

"use strict";

// `shared.js` is generated once per runtime, since each entry uses another export.
// The next step drops it from `bundle`, so only the result `b` generated second is
// restored, and the reason must have been stored with that one too.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	devtool: "eval",
	cache: { type: "memory" },
	entry: { bundle: "./a.js", b: "./b.js" },
	output: {
		module: true,
		filename: "[name].mjs",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	optimization: { usedExports: true, concatenateModules: false }
};

"use strict";

// A lazy chunk whose only css is an `@import` external still emits a stylesheet, so
// the css loading runtime has to cover it -- its predicate is the emitting one.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: { css: true },
	optimization: { chunkIds: "named", minimize: false },
	externals: { "./ext.css": "css-import ./ext.css" },
	output: { chunkFilename: "[name].js" }
};

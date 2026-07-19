"use strict";

// A custom loader is attached to CSS `@import` requests through the
// `dependency: "css-import"` rule condition, so developers can plug their own
// loader in for `@import`ed resources without affecting JS-imported CSS.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				dependency: "css-import",
				use: ["./import-loader"]
			}
		]
	},
	experiments: {
		css: true
	}
};

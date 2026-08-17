"use strict";

// `b` is the only runtime that reaches `shared` lazily, so its `import()`
// genuinely splits even though `a` carries the module up front.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		a: "./entry-a",
		b: "./entry-b"
	},
	output: {
		filename: "[name].js"
	},
	performance: {
		hints: "stats",
		unsplitDynamicImports: true
	}
};

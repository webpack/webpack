"use strict";

// `b` depends on `a`, so `a`'s initial chunks are loaded before `b` runs and
// its `import()` of a module already there defers nothing.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		a: "./entry-a",
		b: { import: "./entry-b", dependOn: "a" }
	},
	output: {
		filename: "[name].js"
	},
	performance: {
		hints: "warning",
		unsplitDynamicImports: true
	}
};

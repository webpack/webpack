"use strict";

// `mid` is reached from the page and from the worker. Only the page carries the
// target up front, and a worker starts from its own chunks however much spawned
// it, so the `import()` still defers there and must not be reported.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	optimization: {
		splitChunks: false
	},
	performance: {
		hints: "stats",
		redundantDynamicImports: true
	}
};

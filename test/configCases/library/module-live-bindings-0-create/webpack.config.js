"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./lib.js",
	target: "node14",
	output: {
		filename: "lib.js",
		module: true,
		library: { type: "module" }
	},
	optimization: { concatenateModules: true },
	experiments: { outputModule: true },
	plugins: [
		/**
		 * @this {import("../../../../").Compiler} compiler
		 */
		function apply() {
			this.hooks.compilation.tap("testcase", (compilation) => {
				compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
					const source = assets["lib.js"].source();
					// The inlined entry's own exports must be live bindings to its
					// top-level declarations, not snapshots of `__webpack_exports__`.
					expect(source).not.toMatch(/const __webpack_exports__\w+ =/);
					expect(source).toMatch(/export \{[^}]*\bcount\b/);
				});
			});
		}
	]
};

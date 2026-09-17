"use strict";

/** @import { Compilation } from "../../../../" */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	entry: { main: "./index.js" },
	output: {
		module: true,
		library: {
			type: "module"
		},
		chunkFormat: "module"
	},
	optimization: {
		concatenateModules: true
	},
	plugins: [
		function apply() {
			/**
			 * @param {Compilation} compilation compilation
			 */
			const handler = (compilation) => {
				compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
					const source = assets["bundle0.mjs"].source();
					expect(source).toMatch(/export \{[^}]*\bas present\b/);
					// `missing` sits behind a property path into a provided export,
					// so only the last name of the path says it is not there
					expect(source).not.toMatch(/export \{[^}]*\bas missing\b/);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};

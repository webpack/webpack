"use strict";

/** @import { Compilation, Compiler } from "../../../../" */

// A `module` library names its exports in an `export { … }` clause, so merging
// has to widen that clause and not only the runtime exports object.
const EXPECTED_EXPORTS = ["fromA", "fromB", "shared"];

/**
 * @this {Compiler}
 * @returns {void}
 */
function expectExportNames() {
	/**
	 * @param {Compilation} compilation compilation
	 */
	const handler = (compilation) => {
		compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
			const source = assets["main.mjs"].source().toString();
			const [, names = ""] = /export \{([^}]*)\};/.exec(source) || [];
			for (const name of EXPECTED_EXPORTS) {
				expect(names).toContain(` as ${name}`);
			}
		});
	};
	this.hooks.compilation.tap("testcase", handler);
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: {
			import: ["./a.js", "./b.js"],
			mergeExports: true
		}
	},
	target: "node14",
	output: {
		filename: "[name].mjs",
		module: true,
		library: { type: "module" }
	},
	experiments: { outputModule: true },
	optimization: { concatenateModules: false },
	plugins: [expectExportNames]
};

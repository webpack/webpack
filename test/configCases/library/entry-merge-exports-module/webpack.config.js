"use strict";

/** @import { Compilation, Compiler } from "../../../../" */

// A `module` library names its exports in an `export { … }` clause, so merging
// has to widen that clause and not only the runtime exports object.
const EXPECTED_EXPORTS = ["fromA", "fromB", "fromBoth"];
// Both modules bind these differently, so `export *` leaves them out too.
const CONFLICTING_EXPORTS = [" as shared", " as default"];

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
			for (const name of CONFLICTING_EXPORTS) {
				expect(names).not.toContain(name);
			}
		});
	};
	this.hooks.compilation.tap("testcase", handler);
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: ["./a.js", "./b.js"]
	},
	target: "node14",
	output: {
		filename: "[name].mjs",
		module: true,
		library: { entryExports: "all", type: "module" }
	},
	experiments: { outputModule: true },
	optimization: { concatenateModules: false },
	plugins: [expectExportNames]
};

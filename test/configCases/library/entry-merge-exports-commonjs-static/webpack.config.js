"use strict";

/** @import { Compilation, Compiler } from "../../../../" */

// A `commonjs-static` library writes one assignment per export name, so merging
// has to widen that list and not only the runtime exports object.
const EXPECTED_EXPORTS = ["fromA", "fromB", "fromBoth"];
// Both modules bind it differently, so `export *` would leave it out too.
const CONFLICTING_EXPORT = "shared";

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
			const source = assets["main.js"].source().toString();
			// `matchAll` is newer than the Node baseline the harness runs on.
			const regexp = /exports\.(\w+) = __webpack_exports__\./g;
			/** @type {Set<string>} */
			const assigned = new Set();
			let match;
			while ((match = regexp.exec(source)) !== null) assigned.add(match[1]);
			for (const name of EXPECTED_EXPORTS) expect(assigned).toContain(name);
			expect(assigned).not.toContain(CONFLICTING_EXPORT);
		});
	};
	this.hooks.compilation.tap("testcase", handler);
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: ["./a.js", "./b.js"]
	},
	output: {
		filename: "[name].js",
		library: { entryExports: "all", type: "commonjs-static" }
	},
	plugins: [expectExportNames]
};

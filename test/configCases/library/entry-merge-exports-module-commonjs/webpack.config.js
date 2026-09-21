"use strict";

/** @import { Compilation, Compiler } from "../../../../" */

// A CommonJS entry module adds `export default __webpack_exports__` so that the
// library stays importable, which only holds while no merged module exports a
// real `default` — two exports of that name are not a module any engine loads.
/**
 * @param {boolean} synthetic whether the synthetic default export is expected
 * @returns {(this: Compiler) => void} plugin
 */
const expectOneDefaultExport = (synthetic) =>
	function expectOneDefaultExportPlugin() {
		/**
		 * @param {Compilation} compilation compilation
		 */
		const handler = (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				const source = assets["main.mjs"].source().toString();
				const [, names = ""] = /export \{([^}]*)\};/.exec(source) || [];
				expect(names).toContain(" as fromB");
				if (synthetic) {
					expect(source).toContain("export default __webpack_exports__;");
					expect(names).not.toContain(" as default");
					expect(names).toContain(" as fromC");
				} else {
					expect(source).not.toContain("export default ");
					expect(names.match(/ as default\b/g)).toHaveLength(1);
					expect(names).toContain(" as fromA");
				}
			});
		};
		this.hooks.compilation.tap("testcase", handler);
	};

/**
 * @param {string[]} entry entry modules, the last one CommonJS
 * @param {boolean} synthetic whether the synthetic default export is expected
 * @returns {import("../../../../").Configuration} config
 */
const config = (entry, synthetic) => ({
	entry: { main: entry },
	target: "node14",
	output: {
		filename: "[name].mjs",
		module: true,
		library: { entryExports: "all", type: "module" }
	},
	experiments: { outputModule: true },
	optimization: { concatenateModules: false },
	plugins: [expectOneDefaultExport(synthetic)]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config(["./a.js", "./b.js"], false),
	config(["./c.js", "./b.js"], true)
];

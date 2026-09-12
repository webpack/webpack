"use strict";

/** @import { Compilation, Compiler, Configuration } from "../../../../" */

/**
 * A library type that is an ECMAScript module turns `output.module` on, which in
 * turn drops the IIFE an `export` statement cannot live in.
 * @this {Compiler}
 * @returns {void}
 */
function expectModuleOutput() {
	/**
	 * @param {Compilation} compilation compilation
	 */
	const handler = (compilation) => {
		expect(compilation.outputOptions.module).toBe(true);
		expect(compilation.outputOptions.iife).toBe(false);
	};
	this.hooks.compilation.tap("testcase", handler);
}

/**
 * @param {string} name emitted bundle base name
 * @param {"module" | "modern-module"} type library type declared on `output`
 * @returns {Configuration} configuration
 */
const outputLibrary = (name, type) => ({
	mode: "development",
	entry: "./index.js",
	output: {
		filename: `${name}.mjs`,
		library: { type }
	},
	plugins: [expectModuleOutput]
});

/** @type {Configuration[]} */
module.exports = [
	outputLibrary("module", "module"),
	outputLibrary("modern-module", "modern-module"),
	{
		mode: "development",
		entry: {
			"entry-module": {
				import: "./index.js",
				library: { type: "module" }
			},
			"entry-modern-module": {
				import: "./index.js",
				library: { type: "modern-module" }
			}
		},
		output: { filename: "[name].mjs" },
		plugins: [expectModuleOutput]
	}
];

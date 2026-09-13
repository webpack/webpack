"use strict";

/** @import { Compilation, Compiler, Configuration } from "../../../../" */

/**
 * A library type read out of a script says the output is not an ECMAScript
 * module, so it holds the `futureDefaults` module default back.
 * @this {Compiler}
 * @returns {void}
 */
function expectScriptOutput() {
	/**
	 * @param {Compilation} compilation compilation
	 */
	const handler = (compilation) => {
		expect(compilation.outputOptions.module).toBe(false);
		expect(compilation.outputOptions.iife).toBe(true);
	};
	this.hooks.compilation.tap("testcase", handler);
}

/**
 * @param {import("../../../../declarations/WebpackOptions").LibraryType} type library type declared on `output`
 * @returns {Configuration} configuration
 */
const outputLibrary = (type) => ({
	mode: "development",
	entry: "./index.js",
	experiments: { futureDefaults: true },
	output: { library: { type, name: "myLib" } },
	plugins: [expectScriptOutput]
});

/** @type {Configuration[]} */
module.exports = [
	outputLibrary("var"),
	outputLibrary("umd"),
	{
		mode: "development",
		entry: {
			main: {
				import: "./index.js",
				library: { type: "var", name: "myLib" }
			}
		},
		experiments: { futureDefaults: true },
		plugins: [expectScriptOutput]
	}
];

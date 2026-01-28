"use strict";

/** @typedef {import("../../../").Compiler} Compiler */
/** @typedef {import("../../../").EntryNormalized} EntryNormalized */

var EntryPlugin = require("../../../").EntryPlugin;

/**
 * Runs a child compilation which produces an error in order to test that NoEmitErrorsPlugin
 * recognizes errors within child compilations.
 */
module.exports = class TestChildCompilationFailurePlugin {
	/**
	 * @param {{ filename: string }} output output
	 */
	constructor(output) {
		this.output = output;
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.make.tapAsync(
			"TestChildCompilationFailurePlugin",
			(compilation, cb) => {
				const child = compilation.createChildCompiler("child", this.output);
				child.hooks.compilation.tap(
					"TestChildCompilationFailurePlugin",
					childCompilation => {
						childCompilation.errors.push(new Error("forced error"));
					}
				);
				new EntryPlugin(
					/** @type {string} */
					(compiler.options.context),
					/** @type {string[]} */
					(
						/** @type {Exclude<EntryNormalized, EXPECTED_FUNCTION>} */
						(compiler.options.entry).main.import
					)[0],
					"child"
				).apply(child);
				child.runAsChild(
					/** @type {EXPECTED_ANY} */
					(cb)
				);
			}
		);
	}
};

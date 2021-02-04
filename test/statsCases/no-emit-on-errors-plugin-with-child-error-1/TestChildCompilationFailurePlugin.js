"use strict";

var EntryPlugin = require("../../../").EntryPlugin;

/**
 * Runs a child compilation which produces an error in order to test that NoEmitErrorsPlugin
 * recognizes errors within child compilations.
 */
module.exports = class TestChildCompilationFailurePlugin {
	constructor(output) {
		this.output = output;
	}

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
					compiler.options.context,
					compiler.options.entry.main.import[0],
					"child"
				).apply(child);
				child.runAsChild(cb);
			}
		);
	}
};

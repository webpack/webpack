"use strict";

var SingleEntryPlugin = require("../../../lib/SingleEntryPlugin");

/**
 * Runs a child compilation which produces an error in order to test that NoEmitErrorsPlugin
 * recognizes errors within child compilations.
 */
module.exports = class TestChildCompilationFailurePlugin {

	constructor(output) {
		this.output = output;
	}

	apply(compiler) {
		compiler.plugin("make", (compilation, cb) => {
			const child = compilation.createChildCompiler("child", this.output);
			child.plugin("compilation", childCompilation => {
				childCompilation.errors.push(new Error("forced error"));
			});
			child.apply(new SingleEntryPlugin(compiler.options.context, compiler.options.entry, "child"));
			child.runAsChild(cb);
		});
	}
};

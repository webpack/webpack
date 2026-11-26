"use strict";

const { EntryPlugin } = require("../../../../");

/** @import { Compiler, Configuration } from "../../../../" */

const PLUGIN_NAME = "ChildCompilationPlugin";

/** Builds the same modules again in a child compilation, like html plugins do. */
class ChildCompilationPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			const child = compilation.createChildCompiler(
				PLUGIN_NAME,
				{ filename: "child.js" },
				[
					new EntryPlugin(compiler.context, "./child-entry.js", {
						name: "child"
					})
				]
			);
			child.runAsChild((err) => callback(err));
		});
	}
}

/** @type {Configuration} */
module.exports = {
	performance: {
		hints: "warning",
		duplicatePackages: true
	},
	plugins: [new ChildCompilationPlugin()]
};

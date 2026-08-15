"use strict";

const { EntryPlugin } = require("../../../../");

const PLUGIN_NAME = "ChildCompilationPlugin";

/** Builds the same modules again in a child compilation, like html plugins do. */
class ChildCompilationPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
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

/** @type {import("../../../../").Configuration} */
module.exports = {
	performance: {
		hints: "warning",
		duplicatePackages: true
	},
	plugins: [new ChildCompilationPlugin()]
};

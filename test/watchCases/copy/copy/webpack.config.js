"use strict";

const path = require("path");

const PLUGIN_NAME = "AssertCopyDependenciesPlugin";

/**
 * The watcher only rebuilds on a copied file which the compilation depends on,
 * so a change to one alone reaches the output through these two sets.
 * @param {import("../../../../").Compiler} compiler the compiler
 * @returns {void}
 */
const assertCopyDependencies = (compiler) => {
	compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
		/**
		 * @param {ReadonlySet<string>} set dependencies of the compilation
		 * @param {string} name path the dependency ends with
		 * @returns {boolean} true when one of them ends with it
		 */
		const dependsOn = (set, name) =>
			[...set].some((item) => item.split(path.sep).join("/").endsWith(name));

		expect(dependsOn(compilation.fileDependencies, "static/data.txt")).toBe(
			true
		);
		expect(dependsOn(compilation.contextDependencies, "static")).toBe(true);
	});
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [{ from: "static", to: "copied" }]
	},
	plugins: [assertCopyDependencies]
};

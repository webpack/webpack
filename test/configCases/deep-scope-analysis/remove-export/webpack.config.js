"use strict";

/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Module} Module */

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		usedExports: true,
		concatenateModules: false,
		sideEffects: false
	},
	plugins: [
		function apply() {
			this.hooks.compilation.tap("Test", compilation => {
				compilation.hooks.dependencyReferencedExports.tap(
					"Test",
					(referencedExports, dep) => {
						const module =
							/** @type {Module} */
							(compilation.moduleGraph.getParentModule(dep));
						if (!module.identifier().endsWith("module.js")) {
							return referencedExports;
						}
						const refModule = compilation.moduleGraph.getModule(dep);
						if (
							refModule &&
							refModule.identifier().endsWith("reference.js") &&
							referencedExports.some(
								names =>
									Array.isArray(names) &&
									names.length === 1 &&
									names[0] === "unused"
							)
						) {
							return referencedExports.filter(
								names =>
									(Array.isArray(names) && names.length !== 1) ||
									/** @type {string[]} */
									(names)[0] !== "unused"
							);
						}
						return referencedExports;
					}
				);
			});
		}
	]
};

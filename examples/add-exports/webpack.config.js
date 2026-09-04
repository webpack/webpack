"use strict";

const { NormalModule } = require("../../");

/** @import { Compiler } from "../../" */

const PLUGIN_NAME = "AddExportsPlugin";

/** @type {[RegExp, string][]} */
const addedExports = [
	// a script, so CommonJs exports
	[/legacy-global\.js$/, "module.exports = Legacy;"],
	// `export` makes the module an ES module, as it would in the source
	[/math\.js$/, "export { add, PI };"]
];

/**
 * Appends exports to modules which have none, before webpack parses them, so
 * the exports are read as the module's own.
 * @param {Compiler} compiler the compiler instance
 * @returns {void}
 */
const addExports = (compiler) => {
	compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
		NormalModule.getCompilationHooks(compilation).processResult.tap(
			PLUGIN_NAME,
			(result, module) => {
				const [source, sourceMap] = result;
				for (const [test, code] of addedExports) {
					// a global or sticky pattern keeps its lastIndex between calls,
					// which would skip the next module it is tested against
					test.lastIndex = 0;
					if (!module.resource || !test.test(module.resource)) continue;
					// appending moves nothing before it, so the source map still fits;
					// a preparsed ast would be parsed instead of the appended code
					return [`${source}\n${code}`, sourceMap, undefined];
				}
				return result;
			}
		);
	});
};

/** @type {import("../../").Configuration} */
module.exports = {
	plugins: [addExports]
};

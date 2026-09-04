"use strict";

const { NormalModule } = require("../../");

/** @import { Compiler } from "../../" */

const PLUGIN_NAME = "ExposeGlobalPlugin";

/**
 * Appends the assignment that puts a module in the global object, before
 * webpack parses it, so the reference is read as the module's own.
 */
class ExposeGlobalPlugin {
	/**
	 * Creates an instance of ExposeGlobalPlugin.
	 * @param {[RegExp, string][]} exposes pairs of a resource condition and the code to append
	 */
	constructor(exposes) {
		this.exposes = exposes;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tap(
				PLUGIN_NAME,
				(result, module) => {
					const [source, sourceMap] = result;
					for (const [test, code] of this.exposes) {
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
	}
}

/** @type {import("../../").Configuration} */
module.exports = {
	plugins: [
		new ExposeGlobalPlugin([
			// the default export is a binding in scope, under both names a script reads
			[/jquery\.js$/, "globalThis.$ = globalThis.jQuery = jQuery;"],
			// one export of many, the rest of the module still shaken out
			[/math\.js$/, "globalThis.add = add;"]
		])
	]
};

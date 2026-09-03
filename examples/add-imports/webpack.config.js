"use strict";

const { NormalModule } = require("../../");

/** @import { Compiler } from "../../" */

const PLUGIN_NAME = "AddImportsPlugin";

// A prepend before a directive would demote it to an expression, silently making
// the module sloppy, so the code goes after one.
const DIRECTIVE = /^\s*(["'])use strict\1;?/;

/** @type {[RegExp, { before?: string, after?: string }][]} */
const imports = [
	[
		/legacy-lib\.js$/,
		{
			// the polyfill for its side effects, `$` as a binding the script reads,
			// and a wrapper so its top-level `this` is the global object
			before:
				'require("./polyfill.js");var $ = require("./jquery.js");(function () {',
			after: "}).call(globalThis);"
		}
	]
];

/**
 * Puts code around modules which read values they never import, before webpack
 * parses them, so the imports are read as the module's own.
 * @param {Compiler} compiler the compiler instance
 * @returns {void}
 */
const addImports = (compiler) => {
	compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
		NormalModule.getCompilationHooks(compilation).processResult.tap(
			PLUGIN_NAME,
			(result, module) => {
				const [source, sourceMap] = result;
				for (const [test, { before = "", after = "" }] of imports) {
					// a global or sticky pattern keeps its lastIndex between calls,
					// which would skip the next module it is tested against
					test.lastIndex = 0;
					if (!module.resource || !test.test(module.resource)) continue;
					// a file no loader touched arrives as the buffer webpack read
					const code =
						typeof source === "string" ? source : source.toString("utf8");
					const directive = DIRECTIVE.exec(code);
					const at = directive ? directive[0].length : 0;
					// no newline after `before`: one would shift every line below it out
					// of the source map; a preparsed ast would be parsed instead of this
					return [
						`${code.slice(0, at)}${before}${code.slice(at)}\n${after}`,
						sourceMap,
						undefined
					];
				}
				return result;
			}
		);
	});
};

/** @type {import("../../").Configuration} */
module.exports = {
	plugins: [addImports]
};

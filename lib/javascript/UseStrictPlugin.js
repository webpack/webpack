/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("../dependencies/core/ConstDependency");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");

/** @import { JavascriptParserOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */

const PLUGIN_NAME = "UseStrictPlugin";

class UseStrictPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions the javascript parser options
				 */
				const handler = (parser, parserOptions) => {
					/**
					 * Removes a `"use strict"` directive, marking the module strict.
					 * @param {Range} range the directive statement's range
					 * @param {boolean} afterDirective whether another directive precedes it
					 * @returns {void}
					 */
					const removeUseStrict = (range, afterDirective) => {
						// Remove "use strict" expression. It will be added later by the renderer again.
						// This is necessary in order to not break the strict mode when webpack prepends code.
						// @see https://github.com/webpack/webpack/issues/1970
						const dep = new ConstDependency(afterDirective ? ";" : "", range);
						dep.loc = parser.getLocation({ range });
						parser.state.module.addPresentationalDependency(dep);
						parser.state.module.buildInfo.strict = true;
					};
					/**
					 * Lets `parser.javascript.overrideStrict` decide over the directives.
					 * @returns {void}
					 */
					const applyOverrideStrict = () => {
						if (parserOptions.overrideStrict) {
							parser.state.module.buildInfo.strict =
								parserOptions.overrideStrict === "strict";
						}
					};
					if (parser.options.walkIds) {
						const { Field, Part } = require("./syntax-parser");

						parser.hooks.programTree.tap(PLUGIN_NAME, (tree, program) => {
							const count = tree.fieldCount(Field.body, program);
							for (let i = 0; i < count; i++) {
								const statement = tree.field(i, Field.body, program);
								const directive = tree.textOf(Part.directive, statement);
								if (directive === null) break;
								if (directive !== "use strict") continue;
								removeUseStrict(tree.range(statement), i > 0);
							}
							applyOverrideStrict();
						});
						return;
					}
					parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
						for (let i = 0; i < ast.body.length; i++) {
							const statement = ast.body[i];
							const directive = parser.getDirective(statement);
							if (directive === undefined) break;
							if (directive !== "use strict") continue;
							removeUseStrict(/** @type {Range} */ (statement.range), i > 0);
						}
						applyOverrideStrict();
					});
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

module.exports = UseStrictPlugin;

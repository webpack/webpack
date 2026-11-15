/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { Field } = require("../../javascript/syntax").parser;
const RequireContextDependency = require("./RequireContextDependency");

/** @import { ContextMode } from "../../context/ContextModule" */
/** @import JavascriptParser from "../../javascript/JavascriptParser" */

const PLUGIN_NAME = "RequireContextDependencyParserPlugin";

module.exports = class RequireContextDependencyParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.call
			.for("require.context")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				/**
				 * @param {number} index the argument's index
				 * @returns {import("../../javascript/BasicEvaluatedExpression")} its evaluation
				 */
				const evaluateArgument = (index) =>
					parser.evaluateExpression(
						parser.nodeOfPath(path, path.field(index, Field.arguments, node))
					);
				let regExp = /^\.\/.*$/;
				let recursive = true;
				/** @type {ContextMode} */
				let mode = "sync";
				switch (path.fieldCount(Field.arguments, node)) {
					case 4: {
						const modeExpr = evaluateArgument(3);
						if (!modeExpr.isString()) return;
						mode = /** @type {ContextMode} */ (modeExpr.string);
					}
					// falls through
					case 3: {
						const regExpExpr = evaluateArgument(2);
						if (!regExpExpr.isRegExp()) return;
						regExp = /** @type {RegExp} */ (regExpExpr.regExp);
					}
					// falls through
					case 2: {
						const recursiveExpr = evaluateArgument(1);
						if (!recursiveExpr.isBoolean()) return;
						recursive = /** @type {boolean} */ (recursiveExpr.bool);
					}
					// falls through
					case 1: {
						const requestExpr = evaluateArgument(0);
						if (!requestExpr.isString()) return;
						const dep = new RequireContextDependency(
							{
								request: /** @type {string} */ (requestExpr.string),
								recursive,
								regExp,
								mode,
								category: "commonjs"
							},
							path.range(node)
						);
						dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
						dep.optional = Boolean(parser.scope.inTry);
						parser.state.current.addDependency(dep);
						return true;
					}
				}
			});
	}
};

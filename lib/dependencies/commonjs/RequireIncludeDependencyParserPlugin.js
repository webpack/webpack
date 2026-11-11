/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RequireIncludeDeprecationWarning = require("../../errors/RequireIncludeDeprecationWarning");
const {
	evaluateToStringByPath,
	toConstantDependencyByPath
} = require("../../javascript/JavascriptParserHelpers");
const { Field } = require("../../javascript/syntax-parser");
const RequireIncludeDependency = require("./RequireIncludeDependency");

/** @import JavascriptParser from "../../javascript/JavascriptParser" */

const PLUGIN_NAME = "RequireIncludeDependencyParserPlugin";

module.exports = class RequireIncludeDependencyParserPlugin {
	/**
	 * Creates an instance of RequireIncludeDependencyParserPlugin.
	 * @param {boolean} warn true: warn about deprecation, false: don't warn
	 */
	constructor(warn) {
		/** @type {boolean} */
		this.warn = warn;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const { warn } = this;
		parser.hooks.call
			.for("require.include")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				if (path.fieldCount(Field.arguments, node) !== 1) return;
				const param = parser.evaluateExpression(
					parser.nodeOfPath(path, path.field(0, Field.arguments, node))
				);
				if (!param.isString()) return;
				const loc = parser.getLocation(parser.nodeOfPath(path, node));

				if (warn) {
					parser.state.module.addWarning(
						new RequireIncludeDeprecationWarning(loc)
					);
				}

				const dep = new RequireIncludeDependency(
					/** @type {string} */ (param.string),
					path.range(node)
				);
				dep.loc = loc;
				parser.state.current.addDependency(dep);
				return true;
			});
		const evaluateToFunction = evaluateToStringByPath("function");
		parser.hooks.evaluateTypeof
			.for("require.include")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				if (warn) {
					parser.state.module.addWarning(
						new RequireIncludeDeprecationWarning(
							parser.getLocation(parser.nodeOfPath(path, node))
						)
					);
				}
				return evaluateToFunction(path, node);
			});
		const typeofFunction = toConstantDependencyByPath(
			parser,
			JSON.stringify("function")
		);
		parser.hooks.typeof
			.for("require.include")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				if (warn) {
					parser.state.module.addWarning(
						new RequireIncludeDeprecationWarning(
							parser.getLocation(parser.nodeOfPath(path, node))
						)
					);
				}
				return typeofFunction(path, node);
			});
	}
};

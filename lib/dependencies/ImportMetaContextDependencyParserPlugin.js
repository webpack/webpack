/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const {
	evaluateToIdentifier
} = require("../javascript/JavascriptParserHelpers");
const ImportMetaContextDependency = require("./ImportMetaContextDependency");

/** @typedef {import("estree").Expression} ExpressionNode */
/** @typedef {import("estree").ObjectExpression} ObjectExpressionNode */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

/**
 * @param {JavascriptParser} parser parser
 * @param {ObjectExpressionNode} optionsNode node
 * @returns {{mode: string, recursive: boolean, regExp: RegExp}} options
 */
function getOptions(parser, optionsNode) {
	let regExp = /^\.\/.*$/;
	let recursive = true;
	let mode = "sync";
	if (optionsNode) {
		for (const prop of optionsNode.properties) {
			if (prop.type !== "Property" || prop.key.type !== "Identifier") return;
			switch (prop.key.name) {
				case "regExp": {
					const regExpExpr = parser.evaluateExpression(
						/** @type {ExpressionNode} */ (prop.value)
					);
					if (!regExpExpr.isRegExp()) return;
					regExp = regExpExpr.regExp;
					break;
				}
				case "mode": {
					const modeExpr = parser.evaluateExpression(
						/** @type {ExpressionNode} */ (prop.value)
					);
					if (!modeExpr.isString()) return;
					mode = modeExpr.string;
					break;
				}
				case "recursive": {
					const recursiveExpr = parser.evaluateExpression(
						/** @type {ExpressionNode} */ (prop.value)
					);
					if (!recursiveExpr.isBoolean()) return;
					recursive = recursiveExpr.bool;
				}
			}
		}
	}

	return { recursive, regExp, mode };
}

module.exports = class ImportMetaContextDependencyParserPlugin {
	apply(parser) {
		parser.hooks.evaluateIdentifier
			.for("import.meta.webpackContext")
			.tap("HotModuleReplacementPlugin", expr => {
				return evaluateToIdentifier(
					"import.meta.webpackContext",
					"import.meta",
					() => ["webpackContext"],
					true
				)(expr);
			});
		parser.hooks.call
			.for("import.meta.webpackContext")
			.tap("ImportMetaContextDependencyParserPlugin", expr => {
				if (expr.arguments.length < 1 || expr.arguments.length > 2) return;
				const [directoryNode, optionsNode] = expr.arguments;
				if (optionsNode && optionsNode.type !== "ObjectExpression") return;
				const requestExpr = parser.evaluateExpression(directoryNode);
				if (!requestExpr.isString()) return;
				const request = requestExpr.string;
				const options = getOptions(parser, optionsNode);
				if (!options) return;

				const dep = new ImportMetaContextDependency(
					{
						request,
						...options,
						category: "esm"
					},
					expr.range
				);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			});
	}
};

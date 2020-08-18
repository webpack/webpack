/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const formatLocation = require("../formatLocation");
const { evaluateToString } = require("../javascript/JavascriptParserHelpers");
const propertyAccess = require("../util/propertyAccess");
const CommonJsExportRequireDependency = require("./CommonJsExportRequireDependency");
const CommonJsExportsDependency = require("./CommonJsExportsDependency");
const CommonJsSelfReferenceDependency = require("./CommonJsSelfReferenceDependency");
const DynamicExports = require("./DynamicExports");
const HarmonyExports = require("./HarmonyExports");
const ModuleDecoratorDependency = require("./ModuleDecoratorDependency");

/** @typedef {import("estree").Expression} ExpressionNode */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/BasicEvaluatedExpression")} BasicEvaluatedExpression */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

const getValueOfPropertyDescription = expr => {
	if (expr.type !== "ObjectExpression") return;
	for (const property of expr.properties) {
		if (property.computed) continue;
		const key = property.key;
		if (key.type !== "Identifier" || key.name !== "value") continue;
		return property.value;
	}
};

const isTruthyLiteral = expr => {
	switch (expr.type) {
		case "Literal":
			return !!expr.value;
		case "UnaryExpression":
			if (expr.operator === "!") return isFalsyLiteral(expr.argument);
	}
	return false;
};

const isFalsyLiteral = expr => {
	switch (expr.type) {
		case "Literal":
			return !expr.value;
		case "UnaryExpression":
			if (expr.operator === "!") return isTruthyLiteral(expr.argument);
	}
	return false;
};

/**
 * @param {JavascriptParser} parser the parser
 * @param {ExpressionNode} expr expression
 * @returns {{ argument: BasicEvaluatedExpression, ids: string[] } | undefined} parsed call
 */
const parseRequireCall = (parser, expr) => {
	const ids = [];
	while (expr.type === "MemberExpression") {
		if (expr.object.type === "Super") return;
		if (!expr.property) return;
		const prop = expr.property;
		if (expr.computed) {
			if (prop.type !== "Literal") return;
			ids.push(`${prop.value}`);
		} else {
			if (prop.type !== "Identifier") return;
			ids.push(prop.name);
		}
		expr = expr.object;
	}
	if (expr.type !== "CallExpression" || expr.arguments.length !== 1) return;
	const callee = expr.callee;
	if (
		callee.type !== "Identifier" ||
		parser.getVariableInfo(callee.name) !== "require"
	) {
		return;
	}
	const arg = expr.arguments[0];
	if (arg.type === "SpreadElement") return;
	const argValue = parser.evaluateExpression(arg);
	return { argument: argValue, ids: ids.reverse() };
};

class CommonJsExportsParserPlugin {
	constructor(moduleGraph) {
		this.moduleGraph = moduleGraph;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 */
	apply(parser) {
		const enableStructuredExports = () => {
			DynamicExports.enable(parser.state);
		};
		const checkNamespace = (topLevel, members, valueExpr) => {
			if (!DynamicExports.isEnabled(parser.state)) return;
			if (members.length > 0 && members[0] === "__esModule") {
				if (isTruthyLiteral(valueExpr) && topLevel) {
					DynamicExports.setFlagged(parser.state);
				} else {
					DynamicExports.setDynamic(parser.state);
				}
			}
		};
		const bailout = reason => {
			DynamicExports.bailout(parser.state);
			if (reason) bailoutHint(reason);
		};
		const bailoutHint = reason => {
			this.moduleGraph
				.getOptimizationBailout(parser.state.module)
				.push(`CommonJS bailout: ${reason}`);
		};

		// metadata //
		parser.hooks.evaluateTypeof
			.for("module")
			.tap("CommonJsExportsParserPlugin", evaluateToString("object"));
		parser.hooks.evaluateTypeof
			.for("exports")
			.tap("CommonJsPlugin", evaluateToString("object"));

		// exporting //
		const handleAssignExport = (expr, base, members) => {
			if (HarmonyExports.isEnabled(parser.state)) return;
			// Handle reexporting
			const requireCall = parseRequireCall(parser, expr.right);
			if (
				requireCall &&
				requireCall.argument.isString() &&
				(members.length === 0 || members[0] !== "__esModule")
			) {
				enableStructuredExports();
				// It's possible to reexport __esModule, so we must convert to a dynamic module
				if (members.length === 0) DynamicExports.setDynamic(parser.state);
				const dep = new CommonJsExportRequireDependency(
					expr.range,
					null,
					base,
					members,
					requireCall.argument.string,
					requireCall.ids,
					!parser.isStatementLevelExpression(expr)
				);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.module.addDependency(dep);
				return true;
			}
			if (members.length === 0) return;
			enableStructuredExports();
			const remainingMembers = members;
			checkNamespace(
				parser.statementPath.length === 1 &&
					parser.isStatementLevelExpression(expr),
				remainingMembers,
				expr.right
			);
			const dep = new CommonJsExportsDependency(
				expr.left.range,
				null,
				base,
				remainingMembers
			);
			dep.loc = expr.loc;
			parser.state.module.addDependency(dep);
			parser.walkExpression(expr.right);
			return true;
		};
		parser.hooks.assignMemberChain
			.for("exports")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				return handleAssignExport(expr, "exports", members);
			});
		parser.hooks.assignMemberChain
			.for("this")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (!parser.scope.topLevelScope) return;
				return handleAssignExport(expr, "this", members);
			});
		parser.hooks.assignMemberChain
			.for("module")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (members[0] !== "exports") return;
				return handleAssignExport(expr, "module.exports", members.slice(1));
			});
		parser.hooks.call
			.for("Object.defineProperty")
			.tap("CommonJsExportsParserPlugin", expression => {
				const expr = /** @type {import("estree").CallExpression} */ (expression);
				if (!parser.isStatementLevelExpression(expr)) return;
				if (expr.arguments.length !== 3) return;
				if (expr.arguments[0].type === "SpreadElement") return;
				if (expr.arguments[1].type === "SpreadElement") return;
				if (expr.arguments[2].type === "SpreadElement") return;
				const exportsArg = parser.evaluateExpression(expr.arguments[0]);
				if (!exportsArg || !exportsArg.isIdentifier()) return;
				if (
					exportsArg.identifier !== "exports" &&
					exportsArg.identifier !== "module.exports" &&
					(exportsArg.identifier !== "this" || !parser.scope.topLevelScope)
				) {
					return;
				}
				const propertyArg = parser.evaluateExpression(expr.arguments[1]);
				if (!propertyArg) return;
				const property = propertyArg.asString();
				if (typeof property !== "string") return;
				enableStructuredExports();
				const descArg = expr.arguments[2];
				checkNamespace(
					parser.statementPath.length === 1,
					[property],
					getValueOfPropertyDescription(descArg)
				);
				const dep = new CommonJsExportsDependency(
					expr.range,
					expr.arguments[2].range,
					`Object.defineProperty(${exportsArg.identifier})`,
					[property]
				);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);

				parser.walkExpression(expr.arguments[2]);
				return true;
			});

		// Self reference //
		const handleAccessExport = (expr, base, members, call = undefined) => {
			if (HarmonyExports.isEnabled(parser.state)) return;
			if (members.length === 0) {
				bailout(`${base} is used directly at ${formatLocation(expr.loc)}`);
			}
			if (call && members.length === 1) {
				bailoutHint(
					`${base}${propertyAccess(
						members
					)}(...) prevents optimization as ${base} is passed as call context as ${formatLocation(
						expr.loc
					)}`
				);
			}
			const dep = new CommonJsSelfReferenceDependency(
				expr.range,
				base,
				members,
				!!call
			);
			dep.loc = expr.loc;
			parser.state.module.addDependency(dep);
			if (call) {
				parser.walkExpressions(call.arguments);
			}
			return true;
		};
		parser.hooks.callMemberChain
			.for("exports")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				return handleAccessExport(expr.callee, "exports", members, expr);
			});
		parser.hooks.expressionMemberChain
			.for("exports")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				return handleAccessExport(expr, "exports", members);
			});
		parser.hooks.expression
			.for("exports")
			.tap("CommonJsExportsParserPlugin", expr => {
				return handleAccessExport(expr, "exports", []);
			});
		parser.hooks.callMemberChain
			.for("module")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (members[0] !== "exports") return;
				return handleAccessExport(
					expr.callee,
					"module.exports",
					members.slice(1),
					expr
				);
			});
		parser.hooks.expressionMemberChain
			.for("module")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (members[0] !== "exports") return;
				return handleAccessExport(expr, "module.exports", members.slice(1));
			});
		parser.hooks.expression
			.for("module.exports")
			.tap("CommonJsExportsParserPlugin", expr => {
				return handleAccessExport(expr, "module.exports", []);
			});
		parser.hooks.callMemberChain
			.for("this")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (!parser.scope.topLevelScope) return;
				return handleAccessExport(expr.callee, "this", members, expr);
			});
		parser.hooks.expressionMemberChain
			.for("this")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (!parser.scope.topLevelScope) return;
				return handleAccessExport(expr, "this", members);
			});
		parser.hooks.expression
			.for("this")
			.tap("CommonJsExportsParserPlugin", expr => {
				if (!parser.scope.topLevelScope) return;
				return handleAccessExport(expr, "this", []);
			});

		// Bailouts //
		parser.hooks.expression.for("module").tap("CommonJsPlugin", expr => {
			bailout();
			const isHarmony = HarmonyExports.isEnabled(parser.state);
			const dep = new ModuleDecoratorDependency(
				isHarmony
					? RuntimeGlobals.harmonyModuleDecorator
					: RuntimeGlobals.nodeModuleDecorator,
				!isHarmony
			);
			dep.loc = expr.loc;
			parser.state.module.addDependency(dep);
			return true;
		});
	}
}
module.exports = CommonJsExportsParserPlugin;

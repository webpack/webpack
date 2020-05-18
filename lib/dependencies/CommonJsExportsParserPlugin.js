/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const { evaluateToString } = require("../javascript/JavascriptParserHelpers");
const CommonJsExportsDependency = require("./CommonJsExportsDependency");
const CommonJsSelfReferenceDependency = require("./CommonJsSelfReferenceDependency");
const DynamicExports = require("./DynamicExports");
const HarmonyExports = require("./HarmonyExports");
const ModuleDecoratorDependency = require("./ModuleDecoratorDependency");

/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

/** @type {WeakMap<NormalModule, boolean>} */
const moduleExportsState = new WeakMap();

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

class CommonJsExportsParserPlugin {
	static bailout(module) {
		const value = moduleExportsState.get(module);
		moduleExportsState.set(module, false);
		if (value === true) {
			module.buildMeta.exportsType = undefined;
			module.buildMeta.defaultObject = false;
		}
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 */
	apply(parser) {
		const enableStructuredExports = () => {
			DynamicExports.enable(parser.state);
		};
		const checkNamespace = (members, valueExpr) => {
			if (!DynamicExports.isEnabled(parser.state)) return;
			if (members.length > 0 && members[0] === "__esModule") {
				if (isTruthyLiteral(valueExpr)) {
					DynamicExports.setFlagged(parser.state);
				} else {
					DynamicExports.bailout(parser.state);
				}
			}
		};
		const bailout = () => {
			DynamicExports.bailout(parser.state);
		};

		// metadata //
		parser.hooks.evaluateTypeof
			.for("module")
			.tap("CommonJsExportsParserPlugin", evaluateToString("object"));
		parser.hooks.evaluateTypeof
			.for("exports")
			.tap("CommonJsPlugin", evaluateToString("object"));

		// exporting //
		parser.hooks.assignMemberChain
			.for("exports")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (HarmonyExports.isEnabled(parser.state)) return;
				enableStructuredExports();
				checkNamespace(members, expr.right);
				const dep = new CommonJsExportsDependency(
					expr.left.range,
					null,
					"exports",
					members
				);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});
		parser.hooks.assignMemberChain
			.for("this")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (HarmonyExports.isEnabled(parser.state)) return;
				if (!parser.scope.topLevelScope) return;
				enableStructuredExports();
				checkNamespace(members, expr.right);
				const dep = new CommonJsExportsDependency(
					expr.left.range,
					null,
					"this",
					members
				);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});
		parser.hooks.assignMemberChain
			.for("module")
			.tap("CommonJsExportsParserPlugin", (expr, members) => {
				if (HarmonyExports.isEnabled(parser.state)) return;
				if (members[0] !== "exports" || members.length <= 1) return;
				enableStructuredExports();
				checkNamespace(members, expr.right);
				const dep = new CommonJsExportsDependency(
					expr.left.range,
					null,
					"module.exports",
					members.slice(1)
				);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});
		parser.hooks.call
			.for("Object.defineProperty")
			.tap("CommonJsExportsParserPlugin", expression => {
				const expr = /** @type {import("estree").CallExpression} */ (expression);
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
				checkNamespace([property], getValueOfPropertyDescription(descArg));
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
		parser.hooks.expression
			.for("exports")
			.tap("CommonJsExportsParserPlugin", expr => {
				if (HarmonyExports.isEnabled(parser.state)) return;
				bailout();
				const dep = new CommonJsSelfReferenceDependency(
					expr.range,
					"exports",
					[]
				);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});
		parser.hooks.expression
			.for("module.exports")
			.tap("CommonJsExportsParserPlugin", expr => {
				if (HarmonyExports.isEnabled(parser.state)) return;
				bailout();
				const dep = new CommonJsSelfReferenceDependency(
					expr.range,
					"module.exports",
					[]
				);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});
		parser.hooks.expression
			.for("this")
			.tap("CommonJsExportsParserPlugin", expr => {
				if (HarmonyExports.isEnabled(parser.state)) return;
				if (!parser.scope.topLevelScope) return;
				bailout();
				const dep = new CommonJsSelfReferenceDependency(expr.range, "this", []);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
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

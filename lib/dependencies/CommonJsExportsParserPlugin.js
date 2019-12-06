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
			DynamicExports.enable(parser.state.module);
		};
		const checkNamespace = (members, valueExpr) => {
			if (!DynamicExports.isEnabled(parser.state.module)) return;
			if (members.length > 0 && members[0] === "__esModule") {
				if (
					valueExpr &&
					valueExpr.type === "Literal" &&
					valueExpr.value === true
				) {
					DynamicExports.setFlagged(parser.state.module);
				} else {
					DynamicExports.bailout(parser.state.module);
				}
			}
		};
		const bailout = () => {
			DynamicExports.bailout(parser.state.module);
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
				if (HarmonyExports.isEnabled(parser.state.module)) return;
				enableStructuredExports();
				checkNamespace(members, expr.right);
				const dep = new CommonJsExportsDependency(
					expr.left.range,
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
				if (HarmonyExports.isEnabled(parser.state.module)) return;
				if (!parser.scope.topLevelScope) return;
				enableStructuredExports();
				checkNamespace(members, expr.right);
				const dep = new CommonJsExportsDependency(
					expr.left.range,
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
				if (HarmonyExports.isEnabled(parser.state.module)) return;
				if (members[0] !== "exports" || members.length <= 1) return;
				enableStructuredExports();
				checkNamespace(members, expr.right);
				const dep = new CommonJsExportsDependency(
					expr.left.range,
					"module.exports",
					members.slice(1)
				);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});

		// Self reference //
		parser.hooks.expression
			.for("exports")
			.tap("CommonJsExportsParserPlugin", expr => {
				if (HarmonyExports.isEnabled(parser.state.module)) return;
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
				if (HarmonyExports.isEnabled(parser.state.module)) return;
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
				if (HarmonyExports.isEnabled(parser.state.module)) return;
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
			const isHarmony = HarmonyExports.isEnabled(parser.state.module);
			const dep = new ModuleDecoratorDependency(
				isHarmony
					? RuntimeGlobals.harmonyModuleDecorator
					: RuntimeGlobals.nodeModuleDecorator
			);
			dep.loc = expr.loc;
			parser.state.module.addDependency(dep);
			return true;
		});
	}
}
module.exports = CommonJsExportsParserPlugin;

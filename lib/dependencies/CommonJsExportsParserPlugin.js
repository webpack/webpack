/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const { evaluateToString } = require("../javascript/JavascriptParserHelpers");
const CommonJsExportsDependency = require("./CommonJsExportsDependency");
const CommonJsSelfReferenceDependency = require("./CommonJsSelfReferenceDependency");
const ModuleDecoratorDependency = require("./ModuleDecoratorDependency");

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

class CommonJsExportsDependencyParserPlugin {
	/**
	 * @param {JavascriptParser} parser the parser
	 */
	apply(parser) {
		const bailedOut = new WeakSet();
		const enableModuleExports = () => {
			if (!parser.state.module.buildMeta.exportsType) {
				if (bailedOut.has(parser.state)) return;
				parser.state.module.buildMeta.exportsType = "default";
				parser.state.module.buildMeta.defaultObject = "redirect";
			}
		};
		const checkNamespace = (members, valueExpr) => {
			if (members.length > 0 && members[0] === "__esModule") {
				if (
					valueExpr &&
					valueExpr.type === "Literal" &&
					valueExpr.value === true
				) {
					parser.state.module.buildMeta.exportsType = "flagged";
				} else {
					bailoutModuleExports();
				}
			}
		};
		const bailoutModuleExports = () => {
			bailedOut.add(parser.state);
			parser.state.module.buildMeta.exportsType = undefined;
			parser.state.module.buildMeta.defaultObject = false;
		};

		// metadata //
		parser.hooks.evaluateTypeof
			.for("module")
			.tap("CommonJsExportsDependencyParserPlugin", evaluateToString("object"));
		parser.hooks.evaluateTypeof
			.for("exports")
			.tap("CommonJsPlugin", evaluateToString("object"));

		// exporting //
		parser.hooks.assignMemberChain
			.for("exports")
			.tap("CommonJsExportsDependencyParserPlugin", (expr, members) => {
				if (parser.state.harmonyModule) return;
				enableModuleExports();
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
			.tap("CommonJsExportsDependencyParserPlugin", (expr, members) => {
				if (parser.state.harmonyModule) return;
				if (!parser.scope.topLevelScope) return;
				enableModuleExports();
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
			.tap("CommonJsExportsDependencyParserPlugin", (expr, members) => {
				if (parser.state.harmonyModule) return;
				if (members[0] !== "exports" || members.length <= 1) return;
				enableModuleExports();
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
			.tap("CommonJsExportsDependencyParserPlugin", expr => {
				if (parser.state.harmonyModule) return;
				bailoutModuleExports();
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
			.tap("CommonJsExportsDependencyParserPlugin", expr => {
				if (parser.state.harmonyModule) return;
				bailoutModuleExports();
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
			.tap("CommonJsExportsDependencyParserPlugin", expr => {
				if (parser.state.harmonyModule) return;
				if (!parser.scope.topLevelScope) return;
				bailoutModuleExports();
				const dep = new CommonJsSelfReferenceDependency(expr.range, "this", []);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});

		// Bailouts //
		parser.hooks.expression.for("module").tap("CommonJsPlugin", expr => {
			bailoutModuleExports();
			const isHarmony = parser.state.harmonyModule;
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
module.exports = CommonJsExportsDependencyParserPlugin;

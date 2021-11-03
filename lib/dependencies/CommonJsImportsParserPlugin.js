/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CommentCompilationWarning = require("../CommentCompilationWarning");
const RuntimeGlobals = require("../RuntimeGlobals");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const {
	evaluateToIdentifier,
	evaluateToString,
	expressionIsUnsupported,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");
const CommonJsFullRequireDependency = require("./CommonJsFullRequireDependency");
const CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const ConstDependency = require("./ConstDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const LocalModuleDependency = require("./LocalModuleDependency");
const { getLocalModule } = require("./LocalModulesHelpers");
const RequireHeaderDependency = require("./RequireHeaderDependency");
const RequireResolveContextDependency = require("./RequireResolveContextDependency");
const RequireResolveDependency = require("./RequireResolveDependency");
const RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");

/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */

class CommonJsImportsParserPlugin {
	/**
	 * @param {JavascriptParserOptions} options parser options
	 */
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;

		// metadata //
		const tapRequireExpression = (expression, getMembers) => {
			parser.hooks.typeof
				.for(expression)
				.tap(
					"CommonJsPlugin",
					toConstantDependency(parser, JSON.stringify("function"))
				);
			parser.hooks.evaluateTypeof
				.for(expression)
				.tap("CommonJsPlugin", evaluateToString("function"));
			parser.hooks.evaluateIdentifier
				.for(expression)
				.tap(
					"CommonJsPlugin",
					evaluateToIdentifier(expression, "require", getMembers, true)
				);
		};
		tapRequireExpression("require", () => []);
		tapRequireExpression("require.resolve", () => ["resolve"]);
		tapRequireExpression("require.resolveWeak", () => ["resolveWeak"]);

		// Weird stuff //
		parser.hooks.assign.for("require").tap("CommonJsPlugin", expr => {
			// to not leak to global "require", we need to define a local require here.
			const dep = new ConstDependency("var require;", 0);
			dep.loc = expr.loc;
			parser.state.module.addPresentationalDependency(dep);
			return true;
		});

		// Unsupported //
		parser.hooks.expression
			.for("require.main.require")
			.tap(
				"CommonJsPlugin",
				expressionIsUnsupported(
					parser,
					"require.main.require is not supported by webpack."
				)
			);
		parser.hooks.call
			.for("require.main.require")
			.tap(
				"CommonJsPlugin",
				expressionIsUnsupported(
					parser,
					"require.main.require is not supported by webpack."
				)
			);
		parser.hooks.expression
			.for("module.parent.require")
			.tap(
				"CommonJsPlugin",
				expressionIsUnsupported(
					parser,
					"module.parent.require is not supported by webpack."
				)
			);
		parser.hooks.call
			.for("module.parent.require")
			.tap(
				"CommonJsPlugin",
				expressionIsUnsupported(
					parser,
					"module.parent.require is not supported by webpack."
				)
			);

		// renaming //
		parser.hooks.canRename.for("require").tap("CommonJsPlugin", () => true);
		parser.hooks.rename.for("require").tap("CommonJsPlugin", expr => {
			// To avoid "not defined" error, replace the value with undefined
			const dep = new ConstDependency("undefined", expr.range);
			dep.loc = expr.loc;
			parser.state.module.addPresentationalDependency(dep);
			return false;
		});

		// inspection //
		parser.hooks.expression
			.for("require.cache")
			.tap(
				"CommonJsImportsParserPlugin",
				toConstantDependency(parser, RuntimeGlobals.moduleCache, [
					RuntimeGlobals.moduleCache,
					RuntimeGlobals.moduleId,
					RuntimeGlobals.moduleLoaded
				])
			);

		// require as expression //
		parser.hooks.expression
			.for("require")
			.tap("CommonJsImportsParserPlugin", expr => {
				const dep = new CommonJsRequireContextDependency(
					{
						request: options.unknownContextRequest,
						recursive: options.unknownContextRecursive,
						regExp: options.unknownContextRegExp,
						mode: "sync"
					},
					expr.range,
					undefined,
					parser.scope.inShorthand
				);
				dep.critical =
					options.unknownContextCritical &&
					"require function is used in a way in which dependencies cannot be statically extracted";
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			});

		// require //
		const processRequireItem = (expr, param) => {
			if (param.isString()) {
				const dep = new CommonJsRequireDependency(param.string, param.range);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		};
		const processRequireContext = (expr, param) => {
			const dep = ContextDependencyHelpers.create(
				CommonJsRequireContextDependency,
				expr.range,
				param,
				expr,
				options,
				{
					category: "commonjs"
				},
				parser
			);
			if (!dep) return;
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		};
		const createRequireHandler = callNew => expr => {
			if (options.commonjsMagicComments) {
				const { options: requireOptions, errors: commentErrors } =
					parser.parseCommentOptions(expr.range);

				if (commentErrors) {
					for (const e of commentErrors) {
						const { comment } = e;
						parser.state.module.addWarning(
							new CommentCompilationWarning(
								`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
								comment.loc
							)
						);
					}
				}
				if (requireOptions) {
					if (requireOptions.webpackIgnore !== undefined) {
						if (typeof requireOptions.webpackIgnore !== "boolean") {
							parser.state.module.addWarning(
								new UnsupportedFeatureWarning(
									`\`webpackIgnore\` expected a boolean, but received: ${requireOptions.webpackIgnore}.`,
									expr.loc
								)
							);
						} else {
							// Do not instrument `require()` if `webpackIgnore` is `true`
							if (requireOptions.webpackIgnore) {
								return true;
							}
						}
					}
				}
			}

			if (expr.arguments.length !== 1) return;
			let localModule;
			const param = parser.evaluateExpression(expr.arguments[0]);
			if (param.isConditional()) {
				let isExpression = false;
				for (const p of param.options) {
					const result = processRequireItem(expr, p);
					if (result === undefined) {
						isExpression = true;
					}
				}
				if (!isExpression) {
					const dep = new RequireHeaderDependency(expr.callee.range);
					dep.loc = expr.loc;
					parser.state.module.addPresentationalDependency(dep);
					return true;
				}
			}
			if (
				param.isString() &&
				(localModule = getLocalModule(parser.state, param.string))
			) {
				localModule.flagUsed();
				const dep = new LocalModuleDependency(localModule, expr.range, callNew);
				dep.loc = expr.loc;
				parser.state.module.addPresentationalDependency(dep);
				return true;
			} else {
				const result = processRequireItem(expr, param);
				if (result === undefined) {
					processRequireContext(expr, param);
				} else {
					const dep = new RequireHeaderDependency(expr.callee.range);
					dep.loc = expr.loc;
					parser.state.module.addPresentationalDependency(dep);
				}
				return true;
			}
		};
		parser.hooks.call
			.for("require")
			.tap("CommonJsImportsParserPlugin", createRequireHandler(false));
		parser.hooks.new
			.for("require")
			.tap("CommonJsImportsParserPlugin", createRequireHandler(true));
		parser.hooks.call
			.for("module.require")
			.tap("CommonJsImportsParserPlugin", createRequireHandler(false));
		parser.hooks.new
			.for("module.require")
			.tap("CommonJsImportsParserPlugin", createRequireHandler(true));

		// require with property access //
		const chainHandler = (expr, calleeMembers, callExpr, members) => {
			if (callExpr.arguments.length !== 1) return;
			const param = parser.evaluateExpression(callExpr.arguments[0]);
			if (param.isString() && !getLocalModule(parser.state, param.string)) {
				const dep = new CommonJsFullRequireDependency(
					param.string,
					expr.range,
					members
				);
				dep.asiSafe = !parser.isAsiPosition(expr.range[0]);
				dep.optional = !!parser.scope.inTry;
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			}
		};
		const callChainHandler = (expr, calleeMembers, callExpr, members) => {
			if (callExpr.arguments.length !== 1) return;
			const param = parser.evaluateExpression(callExpr.arguments[0]);
			if (param.isString() && !getLocalModule(parser.state, param.string)) {
				const dep = new CommonJsFullRequireDependency(
					param.string,
					expr.callee.range,
					members
				);
				dep.call = true;
				dep.asiSafe = !parser.isAsiPosition(expr.range[0]);
				dep.optional = !!parser.scope.inTry;
				dep.loc = expr.callee.loc;
				parser.state.module.addDependency(dep);
				parser.walkExpressions(expr.arguments);
				return true;
			}
		};
		parser.hooks.memberChainOfCallMemberChain
			.for("require")
			.tap("CommonJsImportsParserPlugin", chainHandler);
		parser.hooks.memberChainOfCallMemberChain
			.for("module.require")
			.tap("CommonJsImportsParserPlugin", chainHandler);
		parser.hooks.callMemberChainOfCallMemberChain
			.for("require")
			.tap("CommonJsImportsParserPlugin", callChainHandler);
		parser.hooks.callMemberChainOfCallMemberChain
			.for("module.require")
			.tap("CommonJsImportsParserPlugin", callChainHandler);

		// require.resolve //
		const processResolve = (expr, weak) => {
			if (expr.arguments.length !== 1) return;
			const param = parser.evaluateExpression(expr.arguments[0]);
			if (param.isConditional()) {
				for (const option of param.options) {
					const result = processResolveItem(expr, option, weak);
					if (result === undefined) {
						processResolveContext(expr, option, weak);
					}
				}
				const dep = new RequireResolveHeaderDependency(expr.callee.range);
				dep.loc = expr.loc;
				parser.state.module.addPresentationalDependency(dep);
				return true;
			} else {
				const result = processResolveItem(expr, param, weak);
				if (result === undefined) {
					processResolveContext(expr, param, weak);
				}
				const dep = new RequireResolveHeaderDependency(expr.callee.range);
				dep.loc = expr.loc;
				parser.state.module.addPresentationalDependency(dep);
				return true;
			}
		};
		const processResolveItem = (expr, param, weak) => {
			if (param.isString()) {
				const dep = new RequireResolveDependency(param.string, param.range);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				dep.weak = weak;
				parser.state.current.addDependency(dep);
				return true;
			}
		};
		const processResolveContext = (expr, param, weak) => {
			const dep = ContextDependencyHelpers.create(
				RequireResolveContextDependency,
				param.range,
				param,
				expr,
				options,
				{
					category: "commonjs",
					mode: weak ? "weak" : "sync"
				},
				parser
			);
			if (!dep) return;
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		};

		parser.hooks.call
			.for("require.resolve")
			.tap("RequireResolveDependencyParserPlugin", expr => {
				return processResolve(expr, false);
			});
		parser.hooks.call
			.for("require.resolveWeak")
			.tap("RequireResolveDependencyParserPlugin", expr => {
				return processResolve(expr, true);
			});
	}
}
module.exports = CommonJsImportsParserPlugin;

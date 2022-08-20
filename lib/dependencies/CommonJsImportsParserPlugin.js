/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { fileURLToPath } = require("url");
const CommentCompilationWarning = require("../CommentCompilationWarning");
const RuntimeGlobals = require("../RuntimeGlobals");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const WebpackError = require("../WebpackError");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
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

/** @typedef {import("estree").CallExpression} CallExpressionNode */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */

const createRequireSpecifierTag = Symbol("createRequire");
const createdRequireIdentifierTag = Symbol("createRequire()");

class CommonJsImportsParserPlugin {
	/**
	 * @param {JavascriptParserOptions} options parser options
	 */
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;

		const getContext = () => {
			if (parser.currentTagData) {
				const { context } = parser.currentTagData;
				return context;
			}
		};

		//#region metadata
		const tapRequireExpression = (expression, getMembers) => {
			parser.hooks.typeof
				.for(expression)
				.tap(
					"CommonJsImportsParserPlugin",
					toConstantDependency(parser, JSON.stringify("function"))
				);
			parser.hooks.evaluateTypeof
				.for(expression)
				.tap("CommonJsImportsParserPlugin", evaluateToString("function"));
			parser.hooks.evaluateIdentifier
				.for(expression)
				.tap(
					"CommonJsImportsParserPlugin",
					evaluateToIdentifier(expression, "require", getMembers, true)
				);
		};
		const tapRequireExpressionTag = tag => {
			parser.hooks.typeof
				.for(tag)
				.tap(
					"CommonJsImportsParserPlugin",
					toConstantDependency(parser, JSON.stringify("function"))
				);
			parser.hooks.evaluateTypeof
				.for(tag)
				.tap("CommonJsImportsParserPlugin", evaluateToString("function"));
		};
		tapRequireExpression("require", () => []);
		tapRequireExpression("require.resolve", () => ["resolve"]);
		tapRequireExpression("require.resolveWeak", () => ["resolveWeak"]);
		//#endregion

		// Weird stuff //
		parser.hooks.assign
			.for("require")
			.tap("CommonJsImportsParserPlugin", expr => {
				// to not leak to global "require", we need to define a local require here.
				const dep = new ConstDependency("var require;", 0);
				dep.loc = expr.loc;
				parser.state.module.addPresentationalDependency(dep);
				return true;
			});

		//#region Unsupported
		parser.hooks.expression
			.for("require.main")
			.tap(
				"CommonJsImportsParserPlugin",
				expressionIsUnsupported(
					parser,
					"require.main is not supported by webpack."
				)
			);
		parser.hooks.call
			.for("require.main.require")
			.tap(
				"CommonJsImportsParserPlugin",
				expressionIsUnsupported(
					parser,
					"require.main.require is not supported by webpack."
				)
			);
		parser.hooks.expression
			.for("module.parent.require")
			.tap(
				"CommonJsImportsParserPlugin",
				expressionIsUnsupported(
					parser,
					"module.parent.require is not supported by webpack."
				)
			);
		parser.hooks.call
			.for("module.parent.require")
			.tap(
				"CommonJsImportsParserPlugin",
				expressionIsUnsupported(
					parser,
					"module.parent.require is not supported by webpack."
				)
			);
		//#endregion

		//#region Renaming
		const defineUndefined = expr => {
			// To avoid "not defined" error, replace the value with undefined
			const dep = new ConstDependency("undefined", expr.range);
			dep.loc = expr.loc;
			parser.state.module.addPresentationalDependency(dep);
			return false;
		};
		parser.hooks.canRename
			.for("require")
			.tap("CommonJsImportsParserPlugin", () => true);
		parser.hooks.rename
			.for("require")
			.tap("CommonJsImportsParserPlugin", defineUndefined);
		//#endregion

		//#region Inspection
		const requireCache = toConstantDependency(
			parser,
			RuntimeGlobals.moduleCache,
			[
				RuntimeGlobals.moduleCache,
				RuntimeGlobals.moduleId,
				RuntimeGlobals.moduleLoaded
			]
		);

		parser.hooks.expression
			.for("require.cache")
			.tap("CommonJsImportsParserPlugin", requireCache);
		//#endregion

		//#region Require as expression
		const requireAsExpressionHandler = expr => {
			const dep = new CommonJsRequireContextDependency(
				{
					request: options.unknownContextRequest,
					recursive: options.unknownContextRecursive,
					regExp: options.unknownContextRegExp,
					mode: "sync"
				},
				expr.range,
				undefined,
				parser.scope.inShorthand,
				getContext()
			);
			dep.critical =
				options.unknownContextCritical &&
				"require function is used in a way in which dependencies cannot be statically extracted";
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		};
		parser.hooks.expression
			.for("require")
			.tap("CommonJsImportsParserPlugin", requireAsExpressionHandler);
		//#endregion

		//#region Require
		const processRequireItem = (expr, param) => {
			if (param.isString()) {
				const dep = new CommonJsRequireDependency(
					param.string,
					param.range,
					getContext()
				);
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
				parser,
				undefined,
				getContext()
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
		//#endregion

		//#region Require with property access
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
				parser.state.current.addDependency(dep);
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
				parser.state.current.addDependency(dep);
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
		//#endregion

		//#region Require.resolve
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
				const dep = new RequireResolveDependency(
					param.string,
					param.range,
					getContext()
				);
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
				parser,
				getContext()
			);
			if (!dep) return;
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		};

		parser.hooks.call
			.for("require.resolve")
			.tap("CommonJsImportsParserPlugin", expr => {
				return processResolve(expr, false);
			});
		parser.hooks.call
			.for("require.resolveWeak")
			.tap("CommonJsImportsParserPlugin", expr => {
				return processResolve(expr, true);
			});
		//#endregion

		//#region Create require

		if (!options.createRequire) return;

		let moduleName;
		let specifierName;

		if (options.createRequire === true) {
			moduleName = "module";
			specifierName = "createRequire";
		} else {
			const match = /^(.*) from (.*)$/.exec(options.createRequire);
			if (match) {
				[, specifierName, moduleName] = match;
			}
			if (!specifierName || !moduleName) {
				const err = new WebpackError(
					`Parsing javascript parser option "createRequire" failed, got ${JSON.stringify(
						options.createRequire
					)}`
				);
				err.details =
					'Expected string in format "createRequire from module", where "createRequire" is specifier name and "module" name of the module';
				throw err;
			}
		}

		tapRequireExpressionTag(createdRequireIdentifierTag);
		tapRequireExpressionTag(createRequireSpecifierTag);
		parser.hooks.evaluateCallExpression
			.for(createRequireSpecifierTag)
			.tap("CommonJsImportsParserPlugin", expr => {
				const context = parseCreateRequireArguments(expr);
				if (context === undefined) return;
				const ident = parser.evaluatedVariable({
					tag: createdRequireIdentifierTag,
					data: { context },
					next: undefined
				});
				return new BasicEvaluatedExpression()
					.setIdentifier(ident, ident, () => [])
					.setSideEffects(false)
					.setRange(expr.range);
			});
		parser.hooks.unhandledExpressionMemberChain
			.for(createdRequireIdentifierTag)
			.tap("CommonJsImportsParserPlugin", (expr, members) => {
				return expressionIsUnsupported(
					parser,
					`createRequire().${members.join(".")} is not supported by webpack.`
				)(expr);
			});
		parser.hooks.canRename
			.for(createdRequireIdentifierTag)
			.tap("CommonJsImportsParserPlugin", () => true);
		parser.hooks.canRename
			.for(createRequireSpecifierTag)
			.tap("CommonJsImportsParserPlugin", () => true);
		parser.hooks.rename
			.for(createRequireSpecifierTag)
			.tap("CommonJsImportsParserPlugin", defineUndefined);
		parser.hooks.expression
			.for(createdRequireIdentifierTag)
			.tap("CommonJsImportsParserPlugin", requireAsExpressionHandler);
		parser.hooks.call
			.for(createdRequireIdentifierTag)
			.tap("CommonJsImportsParserPlugin", createRequireHandler(false));
		/**
		 * @param {CallExpressionNode} expr call expression
		 * @returns {string} context
		 */
		const parseCreateRequireArguments = expr => {
			const args = expr.arguments;
			if (args.length !== 1) {
				const err = new WebpackError(
					"module.createRequire supports only one argument."
				);
				err.loc = expr.loc;
				parser.state.module.addWarning(err);
				return;
			}
			const arg = args[0];
			const evaluated = parser.evaluateExpression(arg);
			if (!evaluated.isString()) {
				const err = new WebpackError(
					"module.createRequire failed parsing argument."
				);
				err.loc = arg.loc;
				parser.state.module.addWarning(err);
				return;
			}
			const ctx = evaluated.string.startsWith("file://")
				? fileURLToPath(evaluated.string)
				: evaluated.string;
			// argument always should be a filename
			return ctx.slice(0, ctx.lastIndexOf(ctx.startsWith("/") ? "/" : "\\"));
		};

		parser.hooks.import.tap(
			{
				name: "CommonJsImportsParserPlugin",
				stage: -10
			},
			(statement, source) => {
				if (
					source !== moduleName ||
					statement.specifiers.length !== 1 ||
					statement.specifiers[0].type !== "ImportSpecifier" ||
					statement.specifiers[0].imported.type !== "Identifier" ||
					statement.specifiers[0].imported.name !== specifierName
				)
					return;
				// clear for 'import { createRequire as x } from "module"'
				// if any other specifier was used import module
				const clearDep = new ConstDependency(
					parser.isAsiPosition(statement.range[0]) ? ";" : "",
					statement.range
				);
				clearDep.loc = statement.loc;
				parser.state.module.addPresentationalDependency(clearDep);
				parser.unsetAsiPosition(statement.range[1]);
				return true;
			}
		);
		parser.hooks.importSpecifier.tap(
			{
				name: "CommonJsImportsParserPlugin",
				stage: -10
			},
			(statement, source, id, name) => {
				if (source !== moduleName || id !== specifierName) return;
				parser.tagVariable(name, createRequireSpecifierTag);
				return true;
			}
		);
		parser.hooks.preDeclarator.tap(
			"CommonJsImportsParserPlugin",
			declarator => {
				if (
					declarator.id.type !== "Identifier" ||
					!declarator.init ||
					declarator.init.type !== "CallExpression" ||
					declarator.init.callee.type !== "Identifier"
				)
					return;
				const variableInfo = parser.getVariableInfo(
					declarator.init.callee.name
				);
				if (
					variableInfo &&
					variableInfo.tagInfo &&
					variableInfo.tagInfo.tag === createRequireSpecifierTag
				) {
					const context = parseCreateRequireArguments(declarator.init);
					if (context === undefined) return;
					parser.tagVariable(declarator.id.name, createdRequireIdentifierTag, {
						name: declarator.id.name,
						context
					});
					return true;
				}
			}
		);

		parser.hooks.memberChainOfCallMemberChain
			.for(createRequireSpecifierTag)
			.tap(
				"CommonJsImportsParserPlugin",
				(expr, calleeMembers, callExpr, members) => {
					if (
						calleeMembers.length !== 0 ||
						members.length !== 1 ||
						members[0] !== "cache"
					)
						return;
					// createRequire().cache
					const context = parseCreateRequireArguments(callExpr);
					if (context === undefined) return;
					return requireCache(expr);
				}
			);
		parser.hooks.callMemberChainOfCallMemberChain
			.for(createRequireSpecifierTag)
			.tap(
				"CommonJsImportsParserPlugin",
				(expr, calleeMembers, innerCallExpression, members) => {
					if (
						calleeMembers.length !== 0 ||
						members.length !== 1 ||
						members[0] !== "resolve"
					)
						return;
					// createRequire().resolve()
					return processResolve(expr, false);
				}
			);
		parser.hooks.expressionMemberChain
			.for(createdRequireIdentifierTag)
			.tap("CommonJsImportsParserPlugin", (expr, members) => {
				// require.cache
				if (members.length === 1 && members[0] === "cache") {
					return requireCache(expr);
				}
			});
		parser.hooks.callMemberChain
			.for(createdRequireIdentifierTag)
			.tap("CommonJsImportsParserPlugin", (expr, members) => {
				// require.resolve()
				if (members.length === 1 && members[0] === "resolve") {
					return processResolve(expr, false);
				}
			});
		parser.hooks.call
			.for(createRequireSpecifierTag)
			.tap("CommonJsImportsParserPlugin", expr => {
				const clearDep = new ConstDependency(
					"/* createRequire() */ undefined",
					expr.range
				);
				clearDep.loc = expr.loc;
				parser.state.module.addPresentationalDependency(clearDep);
				return true;
			});
		//#endregion
	}
}
module.exports = CommonJsImportsParserPlugin;

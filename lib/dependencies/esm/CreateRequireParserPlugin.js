/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { fileURLToPath } = require("url");
const WebpackError = require("../../errors/WebpackError");
const BasicEvaluatedExpression = require("../../javascript/BasicEvaluatedExpression");
const { isVariableInfo } = require("../../javascript/JavascriptParser");
const {
	evaluateToStringByPath,
	expressionIsUnsupportedByPath,
	toConstantDependencyByPath
} = require("../../javascript/JavascriptParserHelpers");
const { Field, NodeType } = require("../../javascript/syntax-parser");
const CommonJsImportsParserPlugin = require("../commonjs/CommonJsImportsParserPlugin");
const ConstDependency = require("../core/ConstDependency");

/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/**
 * @import JavascriptParser, {
 * 	ImportSource,
 * 	JavascriptNodeReader
 * } from "../../javascript/JavascriptParser"
 */

/**
 * Defines the common js import settings type used by this module.
 * @typedef {object} CommonJsImportSettings
 * @property {string=} name
 * @property {string} context
 */

const createRequireSpecifierTag = Symbol("createRequire");
const createdRequireIdentifierTag = Symbol("createRequire()");

const PLUGIN_NAME = "CreateRequireParserPlugin";

const {
	createProcessResolveHandlerByPath,
	createRequireAsExpressionHandlerByPath,
	createRequireCacheDependencyByPath,
	createRequireHandlerByPath
} = CommonJsImportsParserPlugin;

class CreateRequireParserPlugin {
	/**
	 * Creates an instance of CreateRequireParserPlugin.
	 * @param {JavascriptParserOptions} options parser options
	 */
	constructor(options) {
		/** @type {JavascriptParserOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const options = this.options;
		if (!options.createRequire) return;

		const getContext = () => {
			if (parser.currentTagData) {
				const { context } =
					/** @type {CommonJsImportSettings} */
					(parser.currentTagData);
				return context;
			}
		};

		/**
		 * Tap require expression tag.
		 * @param {string | symbol} tag tag
		 */
		const tapRequireExpressionTag = (tag) => {
			parser.hooks.typeof
				.for(tag)
				.tap(
					{ name: PLUGIN_NAME, path: true },
					toConstantDependencyByPath(parser, JSON.stringify("function"))
				);
			parser.hooks.evaluateTypeof
				.for(tag)
				.tap(
					{ name: PLUGIN_NAME, path: true },
					evaluateToStringByPath("function")
				);
		};

		/**
		 * Returns true when set undefined.
		 * @param {JavascriptNodeReader} path the path
		 * @param {number} node the renamed expression
		 * @returns {boolean} true when set undefined
		 */
		const defineUndefined = (path, node) => {
			const dep = new ConstDependency("undefined", path.range(node));
			dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
			parser.state.module.addPresentationalDependency(dep);
			return false;
		};

		const requireCache = createRequireCacheDependencyByPath(parser);
		const requireAsExpressionHandler = createRequireAsExpressionHandlerByPath(
			parser,
			options,
			getContext
		);
		const createRequireCallHandler = createRequireHandlerByPath(
			parser,
			options,
			getContext
		);
		const processResolve = createProcessResolveHandlerByPath(
			parser,
			options,
			getContext
		);

		/** @type {ImportSource[]} */
		let moduleNames = [];
		/** @type {string | undefined} */
		let specifierName;

		if (options.createRequire === true) {
			moduleNames = ["module", "node:module"];
			specifierName = "createRequire";
		} else if (typeof options.createRequire === "string") {
			/** @type {undefined | string} */
			let parsedModuleName;
			const match = /^(.*) from (.*)$/.exec(options.createRequire);
			if (match) {
				[, specifierName, parsedModuleName] = match;
			}
			if (!specifierName || !parsedModuleName) {
				const err = new WebpackError(
					`Parsing javascript parser option "createRequire" failed, got ${JSON.stringify(
						options.createRequire
					)}`
				);
				err.details =
					'Expected string in format "createRequire from module", where "createRequire" is specifier name and "module" name of the module';
				throw err;
			}
			moduleNames = [parsedModuleName];
		} else {
			return;
		}

		/**
		 * Parses create require arguments.
		 * @param {JavascriptNodeReader} path the path
		 * @param {number} expr call expression
		 * @returns {string | void} context
		 */
		const parseCreateRequireArguments = (path, expr) => {
			if (path.fieldCount(Field.arguments, expr) !== 1) {
				const err = new WebpackError(
					"module.createRequire supports only one argument."
				);
				err.loc = parser.getLocation(parser.nodeOfPath(path, expr));
				parser.state.module.addWarning(err);
				return;
			}
			const arg = parser.nodeOfPath(path, path.field(0, Field.arguments, expr));
			const evaluated = parser.evaluateExpression(arg);
			if (!evaluated.isString()) {
				const err = new WebpackError(
					"module.createRequire failed parsing argument."
				);
				err.loc = parser.getLocation(arg);
				parser.state.module.addWarning(err);
				return;
			}
			const ctx = /** @type {string} */ (evaluated.string).startsWith("file://")
				? fileURLToPath(/** @type {string} */ (evaluated.string))
				: /** @type {string} */ (evaluated.string);
			// argument always should be a filename
			return ctx.slice(0, ctx.lastIndexOf(ctx.startsWith("/") ? "/" : "\\"));
		};

		tapRequireExpressionTag(createdRequireIdentifierTag);
		tapRequireExpressionTag(createRequireSpecifierTag);

		parser.hooks.evaluateCallExpression
			.for(createRequireSpecifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, expr) => {
				const context = parseCreateRequireArguments(path, expr);
				if (context === undefined) return;
				const ident = parser.evaluatedVariable({
					tag: createdRequireIdentifierTag,
					data: { context },
					next: undefined
				});

				return new BasicEvaluatedExpression()
					.setIdentifier(ident, ident, () => [])
					.setSideEffects(false)
					.setRange(path.range(expr));
			});

		parser.hooks.unhandledExpressionMemberChain
			.for(createdRequireIdentifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, expr, members) =>
				expressionIsUnsupportedByPath(
					parser,
					`createRequire().${members.join(".")} is not supported by webpack.`
				)(path, expr)
			);
		parser.hooks.canRename
			.for(createdRequireIdentifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, () => true);
		parser.hooks.canRename
			.for(createRequireSpecifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, () => true);
		parser.hooks.rename
			.for(createRequireSpecifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, defineUndefined);
		parser.hooks.expression
			.for(createdRequireIdentifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, requireAsExpressionHandler);
		parser.hooks.call
			.for(createdRequireIdentifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, createRequireCallHandler(false));

		parser.hooks.import.tap(
			{
				name: PLUGIN_NAME,
				stage: -10,
				path: true
			},
			(path, statement, source) => {
				if (
					!moduleNames.includes(source) ||
					path.fieldCount(Field.specifiers, statement) !== 1
				) {
					return;
				}
				const specifier = path.field(0, Field.specifiers, statement);
				if (path.type(specifier) !== NodeType.ImportSpecifier) return;
				const imported = path.field(0, Field.imported, specifier);
				if (
					path.type(imported) !== NodeType.Identifier ||
					path.name(imported) !== specifierName
				) {
					return;
				}
				// clear for 'import { createRequire as x } from "module"'
				// if any other specifier was used import module
				const range = path.range(statement);
				const clearDep = new ConstDependency(
					parser.isAsiPosition(range[0]) ? ";" : "",
					range
				);
				clearDep.loc = parser.getLocation({ range });
				parser.state.module.addPresentationalDependency(clearDep);
				parser.unsetAsiPosition(range[1]);
				return true;
			}
		);
		parser.hooks.importSpecifier.tap(
			{
				name: PLUGIN_NAME,
				stage: -10,
				path: true
			},
			(path, statement, source, id, name) => {
				if (!moduleNames.includes(source) || id !== specifierName) return;
				parser.tagVariable(name, createRequireSpecifierTag);
				return true;
			}
		);
		// every declarator reaches this tap, so it reads ids: only a match needs objects
		parser.hooks.preDeclarator.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, declarator) => {
				const id = path.field(0, Field.id, declarator);
				if (path.type(id) !== NodeType.Identifier) return;
				const init = path.field(0, Field.init, declarator);
				if (init === 0 || path.type(init) !== NodeType.CallExpression) return;
				const callee = path.field(0, Field.callee, init);
				if (path.type(callee) !== NodeType.Identifier) return;
				const variableInfo = parser.getVariableInfo(path.name(callee));
				if (
					isVariableInfo(variableInfo) &&
					variableInfo.tagInfo &&
					variableInfo.tagInfo.tag === createRequireSpecifierTag
				) {
					const context = parseCreateRequireArguments(path, init);
					if (context === undefined) return;
					const name = path.name(id);
					parser.tagVariable(name, createdRequireIdentifierTag, {
						name,
						context
					});
					return true;
				}
			}
		);

		parser.hooks.memberChainOfCallMemberChain
			.for(createRequireSpecifierTag)
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, expr, calleeMembers, callExpr, members) => {
					if (
						calleeMembers.length !== 0 ||
						members.length !== 1 ||
						members[0] !== "cache"
					) {
						return;
					}
					// createRequire().cache
					const context = parseCreateRequireArguments(path, callExpr);
					if (context === undefined) return;
					return requireCache(path, expr);
				}
			);
		parser.hooks.callMemberChainOfCallMemberChain
			.for(createRequireSpecifierTag)
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, expr, calleeMembers, innerCallExpression, members) => {
					if (
						calleeMembers.length !== 0 ||
						members.length !== 1 ||
						members[0] !== "resolve"
					) {
						return;
					}
					// createRequire().resolve()
					return processResolve(path, expr, false);
				}
			);
		parser.hooks.expressionMemberChain
			.for(createdRequireIdentifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, expr, members) => {
				// require.cache
				if (members.length === 1 && members[0] === "cache") {
					return requireCache(path, expr);
				}
			});
		parser.hooks.callMemberChain
			.for(createdRequireIdentifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, expr, members) => {
				// require.resolve()
				if (members.length === 1 && members[0] === "resolve") {
					return processResolve(path, expr, false);
				}
			});
		parser.hooks.expression
			.for(createRequireSpecifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, expr) => {
				const clearDep = new ConstDependency(
					"/* createRequire */ undefined",
					path.range(expr)
				);
				clearDep.loc = parser.getLocation(parser.nodeOfPath(path, expr));
				parser.state.module.addPresentationalDependency(clearDep);
				return true;
			});
		parser.hooks.call
			.for(createRequireSpecifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, expr) => {
				const clearDep = new ConstDependency(
					"/* createRequire() */ undefined",
					path.range(expr)
				);
				clearDep.loc = parser.getLocation(parser.nodeOfPath(path, expr));
				parser.state.module.addPresentationalDependency(clearDep);
				return true;
			});
	}
}

module.exports = CreateRequireParserPlugin;

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyExports = require("../dependencies/HarmonyExports");
const formatLocation = require("../util/formatLocation");
const { CompilerHintNotationRegExp } = require("../util/magicComment");

/**
 * @import {
 * 	CallExpression,
 * 	Expression,
 * 	MaybeNamedClassDeclaration,
 * 	MaybeNamedFunctionDeclaration,
 * 	ModuleDeclaration,
 * 	Statement,
 * 	Super,
 * 	VariableDeclaration
 * } from "estree"
 */
/** @import { BuildMeta } from "../Module" */
/** @import { JavascriptModuleBuildInfo } from "../javascript/JavascriptModule" */
/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */
/** @import { JavascriptParserOptions } from "../../declarations/WebpackOptions" */

const PLUGIN_NAME = "SideEffectsFlagParserPlugin";

const notSideEffectsTag = Symbol("NoSideEffects");

/**
 * @param {JavascriptParser} parser parser
 * @param {number} start start position
 * @param {number} end end position
 * @returns {boolean} if annotation is found in the range
 */
const hasNoSideEffectsNotation = (parser, start, end) => {
	// Fast path
	if (end - start < 18) return false;

	const comments = parser.getComments([start, end]);
	return comments.some(
		(c) =>
			c.type === "Block" &&
			CompilerHintNotationRegExp.NoSideEffects.test(c.value)
	);
};

/**
 * Which exports bases were renamed at a value that may alias an object
 * reachable from outside the module, so a later member write on them counts.
 * @typedef {object} RenamedExports
 * @property {boolean} exports the `exports` binding
 * @property {boolean} moduleExports `module.exports`
 */

/**
 * Whether the value is an object only this module holds, whose members are plain
 * data slots: an accessor-free object literal, a function or an arrow.
 * @param {Expression} expr assigned value
 * @returns {boolean} true when a later member write on it stays a plain data write
 */
const isOwnedPlainObject = (expr) => {
	switch (expr.type) {
		case "ObjectExpression":
			return expr.properties.every(
				(property) =>
					property.type === "Property" &&
					property.kind === "init" &&
					(property.computed ||
						property.shorthand ||
						property.method ||
						(property.key.type === "Identifier"
							? property.key.name !== "__proto__"
							: property.key.type !== "Literal" ||
								property.key.value !== "__proto__"))
			);
		case "FunctionExpression":
		case "ArrowFunctionExpression":
			return true;
		case "AssignmentExpression":
			return isOwnedPlainObject(expr.right);
		default:
			return false;
	}
};

/**
 * @param {JavascriptParser} parser the parser
 * @param {Expression} expr the expression of a top-level statement
 * @param {RenamedExports} renamed bases re-pointed earlier in the module
 * @returns {boolean} true when evaluating the statement is not a side effect of the module
 */
const isCommonJsExportsPure = (parser, expr, renamed) => {
	if (expr.type !== "AssignmentExpression" || expr.operator !== "=") {
		return false;
	}
	const left = expr.left;
	if (left.type !== "Identifier" && left.type !== "MemberExpression") {
		return false;
	}
	// shape check first: most member writes have another root
	/** @type {Expression | Super} */
	let root = left;
	let syntacticDepth = 0;
	while (root.type === "MemberExpression") {
		root = root.object;
		syntacticDepth++;
	}
	if (root.type === "Identifier") {
		if (root.name !== "exports" && root.name !== "module") return false;
	} else if (root.type !== "ThisExpression") {
		return false;
	}
	// under ESM `exports` is not the module's exports object
	if (HarmonyExports.isEnabled(parser.state)) return false;
	const info = parser.getNameForExpression(left);
	if (info === undefined) return false;
	const members = info.getMembers();
	// a dynamic key cuts the chain short, and evaluating it may run code
	if (members.length !== syntacticDepth) return false;
	/** @type {keyof RenamedExports | undefined} */
	let base;
	/** @type {number} */
	let depth;
	// a tagged root takes the generic check
	switch (info.rootInfo) {
		case "exports":
			base = "exports";
			depth = members.length;
			break;
		case "module":
			if (members[0] !== "exports") return false;
			base = "moduleExports";
			depth = members.length - 1;
			break;
		case "this":
			if (members.length !== 1) return false;
			depth = 1;
			break;
		default:
			return false;
	}

	// a deeper write reads an export first
	if (depth > 1) return false;
	// after `module.exports = global`, `module.exports.x = 1` mutates global
	if (base !== undefined && depth === 1 && renamed[base]) return false;
	const right = expr.right;
	if (
		!parser.isPure(right, /** @type {Range} */ (left.range)[1]) &&
		!isCommonJsExportsPure(parser, right, renamed)
	) {
		return false;
	}
	if (base !== undefined && depth === 0) {
		renamed[base] = !isOwnedPlainObject(right);
	}
	return true;
};

/**
 * @param {JavascriptParser} parser the parser
 * @param {VariableDeclaration} declaration a top-level declaration
 * @param {RenamedExports} renamed bases re-pointed earlier in the module
 * @returns {boolean} true when evaluating the declaration is not a side effect of the module
 */
const isCommonJsExportsDeclaration = (parser, declaration, renamed) =>
	declaration.declarations.every(
		(declarator) =>
			// a pattern reads members of the value, which may run a getter
			declarator.id.type === "Identifier" &&
			(!declarator.init ||
				parser.isPure(
					declarator.init,
					/** @type {Range} */ (declarator.range)[0]
				) ||
				isCommonJsExportsPure(parser, declarator.init, renamed))
	);

class SideEffectsFlagParserPlugin {
	/**
	 * @param {JavascriptParserOptions} parserOptions the parser options
	 */
	constructor(parserOptions) {
		/** @type {JavascriptParserOptions} */
		this._parserOptions = parserOptions;
	}

	/**
	 * Applies the plugin by registering its hooks on the parser.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		this._applyNoSideEffectsNotationHandler(parser);
		this._applySideEffectsStatementHandler(parser);
	}

	/**
	 * Flags the module side-effect free when no top-level statement has an effect.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	_applySideEffectsStatementHandler(parser) {
		/** @type {undefined | Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} */
		let sideEffectsStatement;
		/** @type {RenamedExports} */
		const renamed = {
			exports: false,
			moduleExports: false
		};
		parser.hooks.program.tap(PLUGIN_NAME, () => {
			sideEffectsStatement = undefined;
			renamed.exports = false;
			renamed.moduleExports = false;
		});
		parser.hooks.statement.tap(
			{ name: PLUGIN_NAME, stage: -100 },
			(statement) => {
				if (sideEffectsStatement) return;
				if (parser.scope.topLevelScope !== true) return;
				switch (statement.type) {
					case "ExpressionStatement":
						if (
							!isCommonJsExportsPure(parser, statement.expression, renamed) &&
							!parser.isPure(
								statement.expression,
								/** @type {Range} */
								(statement.range)[0]
							)
						) {
							sideEffectsStatement = statement;
						}
						break;
					case "IfStatement":
					case "WhileStatement":
					case "DoWhileStatement":
						if (
							!parser.isPure(
								statement.test,
								/** @type {Range} */
								(statement.range)[0]
							)
						) {
							sideEffectsStatement = statement;
						}
						// statement hook will be called for child statements too
						break;
					case "ForStatement":
						if (
							!parser.isPure(
								statement.init,
								/** @type {Range} */ (statement.range)[0]
							) ||
							!parser.isPure(
								statement.test,
								statement.init
									? /** @type {Range} */ (statement.init.range)[1]
									: /** @type {Range} */ (statement.range)[0]
							) ||
							!parser.isPure(
								statement.update,
								statement.test
									? /** @type {Range} */ (statement.test.range)[1]
									: statement.init
										? /** @type {Range} */ (statement.init.range)[1]
										: /** @type {Range} */ (statement.range)[0]
							)
						) {
							sideEffectsStatement = statement;
						}
						// statement hook will be called for child statements too
						break;
					case "SwitchStatement":
						if (
							!parser.isPure(
								statement.discriminant,
								/** @type {Range} */
								(statement.range)[0]
							)
						) {
							sideEffectsStatement = statement;
						}
						// statement hook will be called for child statements too
						break;
					case "VariableDeclaration":
						if (
							!parser.isPure(
								statement,
								/** @type {Range} */ (statement.range)[0]
							) &&
							!isCommonJsExportsDeclaration(parser, statement, renamed)
						) {
							sideEffectsStatement = statement;
						}
						break;
					case "ClassDeclaration":
					case "FunctionDeclaration":
						if (
							!parser.isPure(
								statement,
								/** @type {Range} */ (statement.range)[0]
							)
						) {
							sideEffectsStatement = statement;
						}
						break;
					case "ExportNamedDeclaration":
					case "ExportDefaultDeclaration":
						if (
							!parser.isPure(
								statement.declaration,
								/** @type {Range} */
								(statement.range)[0]
							)
						) {
							sideEffectsStatement = statement;
						}
						break;
					case "LabeledStatement":
					case "BlockStatement":
						// statement hook will be called for child statements too
						break;
					case "EmptyStatement":
						break;
					case "ExportAllDeclaration":
					case "ImportDeclaration":
						// imports will be handled by the dependencies
						break;
					default:
						sideEffectsStatement = statement;
						break;
				}
			}
		);
		parser.hooks.finish.tap(PLUGIN_NAME, () => {
			if (sideEffectsStatement === undefined) {
				/** @type {BuildMeta} */
				(parser.state.module.buildMeta).sideEffectFree = true;
			} else {
				const type = sideEffectsStatement.type;
				const loc = parser.getLocation(sideEffectsStatement);
				parser.state.compilation.moduleGraph
					.getOptimizationBailout(parser.state.module)
					.push(
						() =>
							`Statement (${type}) with side effects in source code at ${formatLocation(
								loc
							)}`
					);
			}
		});
	}

	/**
	 * Tags functions marked `/*#__NO_SIDE_EFFECTS__*\/` or listed in `pureFunctions`.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	_applyNoSideEffectsNotationHandler(parser) {
		const parserOptions = this._parserOptions;
		/** @type {Set<string> | undefined} */
		let pureFunctions;

		const pureFunctionsFromOption =
			parserOptions &&
			Array.isArray(parserOptions.pureFunctions) &&
			parserOptions.pureFunctions.length > 0
				? new Set(parserOptions.pureFunctions)
				: undefined;

		parser.hooks.program.tap(PLUGIN_NAME, () => {
			pureFunctions = undefined;
		});

		/**
		 * @param {string} name function name
		 */
		const markPure = (name) => {
			if (pureFunctions === undefined) pureFunctions = new Set();
			else if (pureFunctions.has(name)) return;
			parser.tagVariable(name, notSideEffectsTag, {});
			pureFunctions.add(name);
		};

		// Detect on function declarations
		// Covers:
		// 	1. function foo
		//  2. export function foo
		//  3. export default function foo
		// 	4. export default function / export default () => {} (anonymous)
		parser.hooks.preStatementByType
			.for("FunctionDeclaration")
			.tap(PLUGIN_NAME, (statement) => {
				if (parser.scope.topLevelScope !== true) return;
				if (statement.type !== "FunctionDeclaration") {
					return;
				}
				const name = statement.id ? statement.id.name : "default";
				if (pureFunctionsFromOption && pureFunctionsFromOption.has(name)) {
					markPure(name);
					return;
				}
				const commentsStart = parser.prevStatement
					? /** @type {Range} */ (parser.prevStatement.range)[1]
					: 0;
				if (
					hasNoSideEffectsNotation(
						parser,
						commentsStart,
						/** @type {Range} */ (statement.range)[0]
					)
				) {
					markPure(name);
				}
			});

		// Detect on variable declarations with function init
		parser.hooks.preDeclarator.tap(PLUGIN_NAME, (decl, statement) => {
			if (parser.scope.topLevelScope !== true) return;
			if (decl.id.type !== "Identifier") return;
			if (
				pureFunctionsFromOption &&
				pureFunctionsFromOption.has(decl.id.name)
			) {
				markPure(decl.id.name);
				return;
			}
			if (!decl.init) return;
			if (!decl.init.type.endsWith("FunctionExpression")) return;

			let hasAnnotation = false;
			// Before the VariableDeclaration (only for const)
			if (statement.kind === "const") {
				const commentsStart = parser.prevStatement
					? /** @type {Range} */ (parser.prevStatement.range)[1]
					: 0;
				hasAnnotation = hasNoSideEffectsNotation(
					parser,
					commentsStart,
					/** @type {Range} */ (statement.range)[0]
				);
			}

			if (!hasAnnotation) {
				hasAnnotation = hasNoSideEffectsNotation(
					parser,
					/** @type {Range} */ (decl.id.range)[1],
					/** @type {Range} */ (decl.init.range)[0]
				);
			}
			if (hasAnnotation) {
				markPure(decl.id.name);
			}
		});

		if (pureFunctionsFromOption) {
			parser.hooks.blockPreStatementByType
				.for("ExportDefaultDeclaration")
				.tap(PLUGIN_NAME, (statement) => {
					if (parser.scope.topLevelScope !== true) return;
					if (
						statement.type === "ExportDefaultDeclaration" &&
						pureFunctionsFromOption.has("default")
					) {
						const decl = statement.declaration;
						if (
							decl.type === "ArrowFunctionExpression" ||
							decl.type === "FunctionExpression"
						) {
							markPure("default");
						}
					}
				});
		}

		parser.hooks.isPure
			.for("CallExpression")
			.tap(PLUGIN_NAME, (expression, commentsStartPos) => {
				const expr = /** @type {CallExpression} */ (expression);
				if (expr.callee.type !== "Identifier") return;
				if (!parser.getTagData(expr.callee.name, notSideEffectsTag)) {
					return;
				}
				commentsStartPos = /** @type {Range} */ (expr.callee.range)[1];
				return expr.arguments.every((arg) => {
					if (arg.type === "SpreadElement") return false;
					const pure = parser.isPure(arg, commentsStartPos);
					commentsStartPos = /** @type {Range} */ (arg.range)[1];
					return pure;
				});
			});

		parser.hooks.finish.tap(PLUGIN_NAME, () => {
			if (pureFunctions === undefined || pureFunctions.size === 0) {
				return;
			}
			const buildInfo = /** @type {JavascriptModuleBuildInfo} */ (
				parser.state.module.buildInfo
			);
			if (buildInfo.pureFunctions) {
				for (const fn of pureFunctions) {
					buildInfo.pureFunctions.add(fn);
				}
			} else {
				buildInfo.pureFunctions = pureFunctions;
			}
		});
	}
}

module.exports = SideEffectsFlagParserPlugin;

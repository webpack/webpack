/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ESMExports = require("../dependencies/esm/ESMExports");
const {
	getBuildDiagnostics,
	recordOptimizationBailout
} = require("../util/buildDiagnostics");
const formatLocation = require("../util/formatLocation");
const { CompilerHintNotationRegExp } = require("../util/magicComment");

/**
 * @import {
 * 	AssignmentExpression,
 * 	CallExpression,
 * 	Expression,
 * 	MaybeNamedClassDeclaration,
 * 	MaybeNamedFunctionDeclaration,
 * 	ModuleDeclaration,
 * 	Statement,
 * 	VariableDeclaration
 * } from "estree"
 */
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
 * Whether the assignment writes the module's own exports: `exports.x = …` or `module.exports = …`.
 * Only the write is ignored; the assigned value is still judged by `isPure`.
 * @param {JavascriptParser} parser the parser
 * @param {AssignmentExpression} expr the assignment
 * @returns {boolean} true when the write is ignored for module-evaluation side effects
 */
const isCommonJsExportAssignment = (parser, expr) => {
	const left = expr.left;
	if (
		expr.operator !== "=" ||
		left.type !== "MemberExpression" ||
		left.object.type !== "Identifier"
	) {
		return false;
	}
	const name = left.object.name;
	const property = left.property;
	/** @type {string | undefined} */
	let key;
	if (!left.computed && property.type === "Identifier") {
		key = property.name;
	} else if (
		left.computed &&
		property.type === "Literal" &&
		typeof property.value === "string"
	) {
		key = property.value;
	}
	if (
		key === undefined ||
		(name === "exports"
			? key === "__proto__"
			: name !== "module" || key !== "exports")
	) {
		return false;
	}
	// under ESM `exports` is not the module's exports object
	return !ESMExports.isEnabled(parser.state) && !parser.isVariableDefined(name);
};

/**
 * Whether evaluating the expression has no effect beyond writing the module's own exports.
 * @param {JavascriptParser} parser the parser
 * @param {Expression} expr the expression
 * @param {number} commentsStartPos where comments annotating the expression may start
 * @returns {boolean} true when the expression is not a side effect of the module
 */
const isModuleEvaluationPure = (parser, expr, commentsStartPos) => {
	while (
		expr.type === "AssignmentExpression" &&
		isCommonJsExportAssignment(parser, expr)
	) {
		commentsStartPos = /** @type {Range} */ (expr.left.range)[1];
		expr = expr.right;
	}
	return parser.isPure(expr, commentsStartPos);
};

/**
 * @param {JavascriptParser} parser the parser
 * @param {VariableDeclaration} declaration a top-level declaration
 * @returns {boolean} true when evaluating the declaration is not a side effect of the module
 */
const isModuleEvaluationPureDeclaration = (parser, declaration) =>
	// a `using` binding disposes its value when the module finishes
	declaration.kind !== "using" &&
	declaration.kind !== "await using" &&
	declaration.declarations.every(
		(declarator) =>
			// a pattern reads members of the value, which may run a getter
			declarator.id.type === "Identifier" &&
			(!declarator.init ||
				isModuleEvaluationPure(
					parser,
					declarator.init,
					/** @type {Range} */ (declarator.range)[0]
				))
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
		parser.hooks.program.tap(PLUGIN_NAME, () => {
			sideEffectsStatement = undefined;
		});
		parser.hooks.statement.tap(
			{ name: PLUGIN_NAME, stage: -100 },
			(statement) => {
				if (sideEffectsStatement) return;
				if (parser.scope.topLevelScope !== true) return;
				switch (statement.type) {
					case "ExpressionStatement":
						if (
							!isModuleEvaluationPure(
								parser,
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
							!isModuleEvaluationPureDeclaration(parser, statement)
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
				parser.state.module.buildMeta.sideEffectFree = true;
			} else {
				const type = sideEffectsStatement.type;
				const loc = parser.getLocation(sideEffectsStatement);
				const at = formatLocation(loc);

				const buildInfo = parser.state.module.buildInfo;
				recordOptimizationBailout(
					buildInfo,
					`Statement (${type}) with side effects in source code at ${at}`
				);
				// `performance.unusedModules` names the statement, so it is kept typed too.
				getBuildDiagnostics(buildInfo).sideEffectStatement = `${type} at ${at}`;
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

		// Covers a plain `function foo`, an exported one, and an
		// `export default` function whether named or anonymous.
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
				if (
					hasNoSideEffectsNotation(
						parser,
						parser.getAttachedCommentsStart(statement),
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
				hasAnnotation = hasNoSideEffectsNotation(
					parser,
					parser.getAttachedCommentsStart(statement),
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
			const buildInfo = parser.state.module.buildInfo;
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

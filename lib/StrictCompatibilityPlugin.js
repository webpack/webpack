/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const WebpackError = require("./WebpackError");

/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */

class StrictCompatibilityError extends WebpackError {
	/**
	 * @param {string} message message
	 * @param {DependencyLocation | undefined} loc loc
	 */
	constructor(message, loc) {
		super(message);
		this.name = "StrictCompatibilityError";
		this.loc = loc;
	}
}

class StrictCompatibilityWarning extends WebpackError {
	/**
	 * @param {string} message message
	 * @param {DependencyLocation | undefined} loc loc
	 */
	constructor(message, loc) {
		super(message);
		this.name = "StrictCompatibilityWarning";
		this.loc = loc;
	}
}

const PLUGIN_NAME = "StrictCompatibilityPlugin";

class StrictCompatibilityPlugin {
	/**
	 * @param {import("./Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				/**
				 * @param {JavascriptParser} parser parser
				 * @param {import("../declarations/WebpackOptions").JavascriptParserOptions} parserOptions parser options
				 */
				const handler = (parser, parserOptions) => {
					/** @type {false|"warn"|"error"} */
					const mode = parserOptions && parserOptions.strictCompatibility;
					if (!mode) return;

					parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
						const mod = parser.state.module;
						const sourceObj = mod.originalSource && mod.originalSource();
						const src =
							sourceObj && typeof sourceObj.source === "function"
								? sourceObj.source()
								: undefined;
						const reportError = (msg, loc) => {
							if (mode === "error") {
								mod.addError(new StrictCompatibilityError(msg, loc));
							} else {
								mod.addWarning(new StrictCompatibilityWarning(msg, loc));
							}
						};
						const reportWarning = (msg, loc) => {
							mod.addWarning(new StrictCompatibilityWarning(msg, loc));
						};

						// ---------------------------------------------------------------------------
						// Annex C: The Strict Mode of ECMAScript — This plugin detects patterns that
						// are syntactically or semantically invalid in strict mode by leveraging the
						// parser's traversal and a lightweight source scan for literals.
						// ---------------------------------------------------------------------------

						let functionDepth = 0;
						const enterFn = () => {
							functionDepth++;
						};
						const exitFn = () => {
							functionDepth--;
						};

						const collectIdentsFromPattern = (pattern, into) => {
							if (!pattern) return;
							switch (pattern.type) {
								case "Identifier":
									into.push(pattern.name);
									break;
								case "AssignmentPattern":
									collectIdentsFromPattern(pattern.left, into);
									break;
								case "ArrayPattern":
									for (const el of pattern.elements) {
										if (el) collectIdentsFromPattern(el, into);
									}
									break;
								case "ObjectPattern":
									for (const p of pattern.properties) {
										if (p.type === "Property") {
											collectIdentsFromPattern(p.value, into);
										} else if (p.type === "RestElement") {
											collectIdentsFromPattern(p.argument, into);
										}
									}
									break;
								case "RestElement":
									collectIdentsFromPattern(pattern.argument, into);
									break;
							}
						};

						// Reserved words that must not be used as identifiers in strict mode
						// Spec: "Reserved words in strict mode" [12.7.2]
						const STRICT_RESERVED_WORDS = new Set([
							"implements",
							"interface",
							"let",
							"package",
							"private",
							"protected",
							"public",
							"static",
							"yield"
						]);

						/**
						 * ECMA-262 Strict Mode: Duplicate parameter names are SyntaxError in strict functions
						 * - "Duplicate parameter names" (Annex C / 15.2.1, 20.2.1.1.1)
						 * ECMA-262 Strict Mode: BindingIdentifier must not be "eval" or "arguments"
						 * - "eval and arguments as identifiers" (Annex C / 13.1.1)
						 * @param {import("estree").Function} node Function node to validate
						 */
						const checkParams = (node) => {
							/** @type {string[]} */
							const names = [];
							for (const p of node.params) collectIdentsFromPattern(p, names);
							const seen = new Set();
							for (const n of names) {
								if (seen.has(n)) {
									reportError(
										`Duplicate parameter name '${n}' is not allowed in strict mode`,
										node.loc
									);
								} else {
									seen.add(n);
								}
								if (n === "eval" || n === "arguments") {
									reportError(
										`Using '${n}' as parameter name is not allowed in strict mode`,
										node.loc
									);
								}
								if (STRICT_RESERVED_WORDS.has(n)) {
									reportError(
										`Using reserved word '${n}' as parameter name is not allowed in strict mode`,
										node.loc
									);
								}
							}
						};

						/**
						 * ECMA-262 Strict Mode: BindingIdentifier must not be "eval" or "arguments"
						 * - "eval and arguments as identifiers" (Annex C / 13.1.1)
						 * ECMA-262 Strict Mode: Reserved words must not be used as identifiers (Annex C / 12.7.2)
						 * @param {import("estree").Pattern | import("estree").Identifier | null | undefined} id Binding pattern or identifier
						 * @param {import("./Dependency").DependencyLocation | undefined} loc Source location for diagnostics
						 */
						const checkDeclId = (id, loc) => {
							const checkName = (n) => {
								if (n === "eval" || n === "arguments") {
									reportError(
										`Using '${n}' as identifier is not allowed in strict mode`,
										loc
									);
								}
								if (STRICT_RESERVED_WORDS.has(n)) {
									reportError(
										`Using reserved word '${n}' as identifier is not allowed in strict mode`,
										loc
									);
								}
							};
							if (!id) return;
							if (id.type === "Identifier") {
								checkName(id.name);
								return;
							}
							// Destructuring pattern: validate each BindingIdentifier
							/** @type {string[]} */
							const names = [];
							collectIdentsFromPattern(id, names);
							for (const n of names) checkName(n);
						};

						// Scope analysis: use the parser's scope to precisely detect
						// unresolvable references via parser.isVariableDefined(name)
						// (Annex C / 6.2.5.6, 13.15)

						const walk = (node) => {
							if (!node || typeof node.type !== "string") return;
							switch (node.type) {
								case "Program":
									for (const s of node.body) walk(s);
									return;
								case "WithStatement":
									// ECMA-262 Strict Mode: with statement is prohibited (Annex C / 14.11.1)
									reportError(
										"with statement is not allowed in strict mode",
										node.loc
									);
									walk(node.object);
									walk(node.body);
									return;
								case "UnaryExpression":
									// ECMA-262 Strict Mode: delete on unqualified Identifier is SyntaxError (Annex C / 13.5.1.1)
									if (
										node.operator === "delete" &&
										node.argument &&
										node.argument.type === "Identifier"
									) {
										reportError(
											"Deleting an unqualified identifier is not allowed in strict mode (delete x)",
											node.loc
										);
									}
									walk(node.argument);
									return;
								case "UpdateExpression":
									// ECMA-262 Strict Mode: eval/arguments must not be the operand of ++/-- (Annex C / 13.4, 13.4.4, 13.4.5)
									if (
										node.argument &&
										node.argument.type === "Identifier" &&
										(node.argument.name === "eval" ||
											node.argument.name === "arguments")
									) {
										reportError(
											`Using '${node.argument.name}' as operand of update expression is not allowed in strict mode`,
											node.loc
										);
									}
									return;
								case "AssignmentExpression":
									// ECMA-262 Strict Mode: eval/arguments must not be assigned (Annex C / 13.15)
									if (node.left && node.left.type === "Identifier") {
										const n = node.left.name;
										if (n === "eval" || n === "arguments") {
											reportError(
												`Assignment to '${n}' is not allowed in strict mode`,
												node.loc
											);
										}
										// ECMA-262 Strict Mode: Unresolved references cannot be assigned (Annex C / 6.2.5.6, 13.15)
										if (!parser.isVariableDefined(n)) {
											reportError(
												`Assignment to undeclared identifier '${n}' is not allowed in strict mode`,
												node.loc
											);
										}
										// ECMA-262 Strict Mode: Assignment to read-only global values (Annex C / 13.15)
										if (n === "undefined" || n === "Infinity" || n === "NaN") {
											reportError(
												`Assignment to read-only global '${n}' is not allowed in strict mode`,
												node.loc
											);
										}
									} else if (
										node.left &&
										node.left.type === "MemberExpression"
									) {
										// Accessing arguments.callee/caller throws a TypeError in strict mode (Annex C / 10.4.4.6).
										// Flag assignment to those properties as well.
										const obj = node.left.object;
										const prop = node.left.computed
											? node.left.property && node.left.property.value
											: node.left.property && node.left.property.name;
										if (
											obj &&
											obj.type === "Identifier" &&
											obj.name === "arguments" &&
											(prop === "callee" || prop === "caller")
										) {
											reportWarning(
												`Assignment to 'arguments.${prop}' may throw in strict mode`,
												node.loc
											);
										}
									}
									return;
								case "FunctionDeclaration":
								case "FunctionExpression":
								case "ArrowFunctionExpression":
									checkParams(node);
									if (node.type !== "ArrowFunctionExpression") {
										checkDeclId(node.id, node.loc);
									}
									enterFn();
									if (node.body) {
										if (node.body.type === "BlockStatement") {
											for (const st of node.body.body) walk(st);
										} else {
											walk(node.body);
										}
									}
									exitFn();
									return;
								case "ClassDeclaration":
									// ECMA-262 Strict Mode: BindingIdentifier must not be eval/arguments even for class names (Annex C / 13.1.1)
									checkDeclId(node.id, node.loc);
									if (node.body) {
										for (const el of node.body.body) walk(el);
									}
									return;
								case "VariableDeclaration":
									for (const d of node.declarations) {
										checkDeclId(d.id, d.loc);
										if (d.init) walk(d.init);
									}
									return;
								case "MemberExpression": {
									const obj = node.object;
									const prop = node.computed
										? node.property && node.property.value
										: node.property && node.property.name;
									if (
										obj &&
										obj.type === "Identifier" &&
										obj.name === "arguments" &&
										(prop === "callee" || prop === "caller")
									) {
										reportWarning(
											`'arguments.${prop}' is forbidden in strict mode`,
											node.loc
										);
									}
									// NOTE: Accessing Function#caller/arguments on strict functions throws a TypeError at runtime.
									// Conservatively warn when '.caller' or '.arguments' is accessed (Annex C / 41).
									if (
										obj &&
										obj.type === "Identifier" &&
										(prop === "caller" || prop === "arguments")
									) {
										reportWarning(
											`Accessing '.${prop}' may be restricted in strict mode`,
											node.loc
										);
									}
									walk(node.object);
									walk(node.property);
									return;
								}
								case "ThisExpression":
									// ECMA-262 Strict Mode: top-level 'this' is not coerced to the global object (Annex C / 29)
									if (functionDepth === 0) {
										reportWarning(
											"Top-level 'this' may be undefined in strict mode",
											node.loc
										);
									}
									return;
								case "CatchClause":
									// ECMA-262 Strict Mode: catch parameter must not be eval/arguments (Annex C / 14.15.1)
									if (node.param) {
										checkDeclId(node.param, node.loc);
									}
									if (node.body) {
										for (const st of node.body.body) walk(st);
									}
									return;
								default: {
									for (const k in node) {
										const v = node[k];
										if (!v) continue;
										if (Array.isArray(v)) {
											for (const c of v) {
												if (c && typeof c.type === "string") walk(c);
											}
										} else if (v && typeof v.type === "string") {
											walk(v);
										}
									}
								}
							}
						};

						walk(ast);

						// ---------------------------------------------------------------------------
						// Annex C: The following strict-mode rules are not detected statically
						// due to value/runtime dependencies:
						// - eval() variable environment restrictions (19.2.1)
						// - arguments object no longer sharing with formals (10.4.4)
						// - delete on non-configurable properties (13.5.1.2)
						// These errors are raised at runtime by the engine in strict mode.
						// ---------------------------------------------------------------------------

						// Numeric literals / string escapes: detect directly from source text
						// (most cases are parser-rejected already)
						if (src && typeof src === "string") {
							// ECMA-262 Strict Mode: Legacy octal numeric literals are prohibited
							// - (Annex C / 7-10)
							// Legacy octal integer starting with 0 but not 0x/0o/0b (e.g. 0644)
							const octalNum = /(^|[^.\w])0[0-7]+(?![0-9])/m;
							// ECMA-262 Strict Mode: NonOctalDecimalIntegerLiteral (e.g. 08, 09) is prohibited
							// - (Annex C / 7-10)
							const nonOctalDecimalNum = /(^|[^.\w])0[0-9]+(?![0-9])/m;
							// ECMA-262 Strict Mode: Legacy octal escape & NonOctalDecimalEscape (\8, \9) are prohibited
							// - (Annex C / 11-13)
							// Legacy octal escapes like \\1, \\12, \\123 (\\0 alone is allowed)
							const octalEsc = /\\(?:[1-7][0-7]{0,2})/m;
							// Non-octal decimal escape sequences: \8 or \9
							const nonOctalDecimalEsc = /\\[89]/m;
							if (octalNum.test(src)) {
								reportError(
									"Legacy octal numeric literal is not allowed in strict mode (use 0o...)",
									/** @type {DependencyLocation} */ (mod.loc)
								);
							}
							// Non-octal decimal literal with a leading zero (e.g. 08, 09)
							if (!octalNum.test(src) && nonOctalDecimalNum.test(src)) {
								reportError(
									"Non-octal decimal integer literal with leading zero is not allowed in strict mode (e.g. 08, 09)",
									/** @type {DependencyLocation} */ (mod.loc)
								);
							}
							if (octalEsc.test(src) || nonOctalDecimalEsc.test(src)) {
								reportError(
									"Legacy/non-octal decimal escape sequences in string literals are not allowed in strict mode",
									/** @type {DependencyLocation} */ (mod.loc)
								);
							}
						}
					});
				};

				for (const type of [
					JAVASCRIPT_MODULE_TYPE_AUTO,
					JAVASCRIPT_MODULE_TYPE_DYNAMIC,
					JAVASCRIPT_MODULE_TYPE_ESM
				]) {
					normalModuleFactory.hooks.parser.for(type).tap(PLUGIN_NAME, handler);
				}
			}
		);
	}
}

module.exports = StrictCompatibilityPlugin;

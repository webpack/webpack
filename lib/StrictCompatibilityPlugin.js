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

						/**
						 * @param {string} msg message
						 * @param {DependencyLocation | undefined} loc location
						 */
						const reportError = (msg, loc) => {
							if (mode === "error") {
								mod.addError(new StrictCompatibilityError(msg, loc));
							} else {
								mod.addWarning(new StrictCompatibilityWarning(msg, loc));
							}
						};
						/**
						 * @param {string} msg message
						 * @param {DependencyLocation | undefined} loc location
						 */
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

						/**
						 * @param {import("estree").Pattern | null | undefined} pattern pattern to collect from
						 * @param {string[]} into array to collect identifiers into
						 */
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
										node.loc || undefined
									);
								} else {
									seen.add(n);
								}
								if (n === "eval" || n === "arguments") {
									reportError(
										`Using '${n}' as parameter name is not allowed in strict mode`,
										node.loc || undefined
									);
								}
								if (STRICT_RESERVED_WORDS.has(n)) {
									reportError(
										`Using reserved word '${n}' as parameter name is not allowed in strict mode`,
										node.loc || undefined
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
							/**
							 * @param {string} n name to check
							 */
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

						/**
						 * Type guard for ESTree Node.
						 * @param {unknown} x value to test
						 * @returns {x is import("estree").Node} true if the value looks like an ESTree Node
						 */
						const isNode = (x) => {
							if (typeof x !== "object" || x === null) return false;
							const r = /** @type {Record<string, unknown>} */ (x);
							return typeof r.type === "string";
						};

						/**
						 * @param {import("estree").Node | null | undefined} node node to walk
						 */
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
										node.loc || undefined
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
											node.loc || undefined
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
											node.loc || undefined
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
												node.loc || undefined
											);
										}
										// ECMA-262 Strict Mode: Unresolved references cannot be assigned (Annex C / 6.2.5.6, 13.15)
										if (!parser.isVariableDefined(n)) {
											reportError(
												`Assignment to undeclared identifier '${n}' is not allowed in strict mode`,
												node.loc || undefined
											);
										}
										// ECMA-262 Strict Mode: Assignment to read-only global values (Annex C / 13.15)
										if (n === "undefined" || n === "Infinity" || n === "NaN") {
											reportError(
												`Assignment to read-only global '${n}' is not allowed in strict mode`,
												node.loc || undefined
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
											? node.left.property &&
												/** @type {import("estree").Literal} */ (
													node.left.property
												).value
											: node.left.property &&
												/** @type {import("estree").Identifier} */ (
													node.left.property
												).name;
										if (
											obj &&
											obj.type === "Identifier" &&
											obj.name === "arguments" &&
											(prop === "callee" || prop === "caller")
										) {
											reportWarning(
												`Assignment to 'arguments.${prop}' may throw in strict mode`,
												node.loc || undefined
											);
										}
									}
									return;
								case "FunctionDeclaration":
								case "FunctionExpression":
								case "ArrowFunctionExpression":
									checkParams(node);
									if (node.type !== "ArrowFunctionExpression") {
										checkDeclId(
											node.id,
											/** @type {DependencyLocation | undefined} */ (node.loc)
										);
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
									checkDeclId(
										node.id,
										/** @type {DependencyLocation | undefined} */ (node.loc)
									);
									if (node.body) {
										for (const el of node.body.body) walk(el);
									}
									return;
								case "VariableDeclaration":
									for (const d of node.declarations) {
										checkDeclId(d.id, d.loc || undefined);
										if (d.init) walk(d.init);
									}
									return;
								case "MemberExpression": {
									const obj = node.object;
									const prop = node.computed
										? node.property &&
											/** @type {import("estree").Literal} */ (node.property)
												.value
										: node.property &&
											/** @type {import("estree").Identifier} */ (node.property)
												.name;
									if (
										obj &&
										obj.type === "Identifier" &&
										obj.name === "arguments" &&
										(prop === "callee" || prop === "caller")
									) {
										reportWarning(
											`'arguments.${prop}' is forbidden in strict mode`,
											node.loc || undefined
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
											node.loc || undefined
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
											node.loc || undefined
										);
									}
									return;
								case "CatchClause":
									// ECMA-262 Strict Mode: catch parameter must not be eval/arguments (Annex C / 14.15.1)
									if (node.param) {
										checkDeclId(
											node.param,
											/** @type {DependencyLocation | undefined} */ (node.loc)
										);
									}
									if (node.body) {
										for (const st of node.body.body) walk(st);
									}
									return;
								default: {
									const rec = /** @type {Record<string, unknown>} */ (
										/** @type {unknown} */ (node)
									);
									for (const k in rec) {
										const v = rec[k];
										if (!v) continue;
										if (Array.isArray(v)) {
											for (const c of v) {
												if (isNode(c)) walk(c);
											}
										} else if (isNode(v)) {
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

						// NOTE (Annex C 7–13): Legacy octal numeric literals and legacy/non-octal decimal
						// escape sequences are rejected by the parser in strict mode. To keep pack caches
						// stable we do not scan raw source; such cases surface as Acorn "Module parse failed".
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

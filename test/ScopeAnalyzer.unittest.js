/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

// cspell:ignore Yusuke
// cspell:ignore esrecurse
// cspell:ignore insided

/*
 * The cases in this file are ported from the test suite of eslint-scope, the
 * scope analyser this package used before lib/javascript/ScopeAnalyzer.js:
 * https://github.com/eslint/js/tree/main/packages/eslint-scope/tests
 *
 * Copyright JS Foundation and other contributors, https://js.foundation
 * Copyright (C) 2012-2013 Yusuke Suzuki (twitter: @Constellation) and other
 * contributors.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   * Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *   * Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Four things changed in the port:
 *
 * 1. Parsing goes through webpack's own parser rather than espree. The options
 * eslint-scope's cases passed for which the analyser has no equivalent —
 * `ecmaVersion`, `fallback`, `childVisitorKeys`, `nodejsScope`, `optimistic` —
 * are simply not passed; the analyser always accepts the whole language and
 * always walks unknown node types.
 * 2. The analyser always analyses as a module, since generated module sources
 * are modules. eslint-scope's cases mostly analysed as a script, so every scope
 * tree here carries one extra scope — `module`, directly below `global` — and
 * the bindings those cases expected in the global scope are in the module
 * scope instead. The global scope is always empty.
 * 3. Assertions on things the analyser deliberately does not record are
 * dropped: definition objects (`variable.defs`), read/write flags
 * (`reference.isWrite()`, `writeExpr`, `init`, `partial`), strictness
 * (`scope.isStrict`), taint (`isArgumentsMaterialized`), implicit globals, and
 * the per-scope `through` lists — of which only the module's survives, as the
 * flat `unresolvedReferences`, which is the only one webpack ever read.
 * 4. An unresolved reference has `resolved === undefined` rather than `null`.
 *
 * Cases resting entirely on a dropped feature are not ported: add-globals,
 * child-visitor-keys, get-declared-variables, nodejs-scope, implied-strict,
 * use-strict and optimistic (all option- or feature-driven), jsx and typescript
 * (syntax webpack's parser does not accept), and object-expression (it builds
 * an AST by hand with no `type` on a property, which esrecurse defaulted to
 * `Property`; the analyser requires the `type` acorn always sets).
 */

"use strict";

const JavascriptParser = require("../lib/javascript/JavascriptParser");
const analyzeScope = require("../lib/javascript/ScopeAnalyzer");

/** @import { Program } from "estree" */
/** @import { Reference, Scope } from "../lib/javascript/ScopeAnalyzer" */

/**
 * @typedef {object} Analysis
 * @property {Program} ast the parsed program
 * @property {Scope} globalScope the outermost scope
 * @property {Scope} moduleScope the module body scope
 * @property {Scope[]} scopes every scope, in creation order
 * @property {Reference[]} unresolvedReferences the module's free references
 */

/**
 * eslint-scope exposed the references made in a scope as `scope.references`.
 * The analyser keeps no such list — a resolved reference hangs off its binding
 * and a free one lands in `unresolvedReferences` — so the harness rebuilds the
 * view by grouping on `reference.from`.
 *
 * The rebuilt list is in source order. eslint-scope's was in walk order, which
 * differs wherever the walker reaches a pattern's defaults before its writes,
 * as in the head of `for (var [a, b, c = d] in array)`.
 * @type {WeakMap<Scope, Reference[]>}
 */
const scopeReferences = new WeakMap();

/**
 * @param {import("estree").Node} node any node
 * @returns {number} its start offset
 */
const startOf = (node) => /** @type {EXPECTED_ANY} */ (node).start;

/**
 * @param {string} code source code
 * @param {"module" | "script"} sourceType source type
 * @returns {Program} the parsed program
 */
const parse = (code, sourceType = "module") =>
	JavascriptParser._parse(code, { sourceType }).ast;

/**
 * @param {Program} ast a program to analyse
 * @returns {Analysis} the analysis, plus the harness views over it
 */
const analyzeAst = (ast) => {
	// the cases assert on references at every depth, which the analyser only
	// collects on request — webpack itself reads back the module scope alone
	const analysis = analyzeScope(ast, true);

	/** @type {Scope[]} */
	const scopes = [];
	/**
	 * @param {Scope} scope scope to collect
	 * @returns {void}
	 */
	const collect = (scope) => {
		scopes.push(scope);
		for (const child of scope.childScopes) collect(child);
	};
	collect(analysis.globalScope);

	/** @type {Map<Scope, Reference[]>} */
	const byScope = new Map();
	for (const scope of scopes) byScope.set(scope, []);
	/**
	 * @param {Reference} reference reference to file under its scope
	 * @returns {void}
	 */
	const record = (reference) => {
		const list = byScope.get(reference.from);
		if (list !== undefined) list.push(reference);
	};
	for (const scope of scopes) {
		for (const variable of scope.variables) {
			for (const reference of variable.references) record(reference);
		}
	}
	for (const reference of analysis.unresolvedReferences) record(reference);
	for (const [scope, list] of byScope) {
		list.sort((a, b) => startOf(a.identifier) - startOf(b.identifier));
		scopeReferences.set(scope, list);
	}

	return { ast, ...analysis, scopes };
};

/**
 * @param {string} code source code
 * @param {"module" | "script"} sourceType source type
 * @returns {Analysis} the analysis
 */
const analyze = (code, sourceType = "module") =>
	analyzeAst(parse(code, sourceType));

/**
 * @param {Scope} scope a scope
 * @returns {Reference[]} the references made in it, in source order
 */
const refs = (scope) => scopeReferences.get(scope) || [];

/**
 * @param {Scope} scope a scope
 * @returns {string[]} the names referenced in it, in source order
 */
const refNames = (scope) => refs(scope).map((r) => r.identifier.name);

/**
 * @param {Scope} scope a scope
 * @returns {string[]} the names it declares
 */
const varNames = (scope) => scope.variables.map((v) => v.name);

/**
 * @param {Scope[]} scopes the scope tree, flattened
 * @returns {string[]} their kinds
 */
const scopeTypes = (scopes) => scopes.map((s) => s.type);

/**
 * @param {Analysis} analysis an analysis
 * @returns {string[]} the module's free names
 */
const freeNames = (analysis) =>
	analysis.unresolvedReferences.map((r) => r.identifier.name);

describe("ScopeAnalyzer", () => {
	describe("the scope tree the analyser always builds", () => {
		it("is a module scope under an empty global scope", () => {
			const { globalScope, moduleScope, scopes, ast } = analyze("var a;");

			expect(scopeTypes(scopes)).toEqual(["global", "module"]);
			expect(globalScope.variables).toHaveLength(0);
			expect(refs(globalScope)).toHaveLength(0);
			expect(globalScope.upper).toBeNull();
			expect(globalScope.childScopes).toEqual([moduleScope]);
			expect(moduleScope.upper).toBe(globalScope);
			expect(globalScope.block).toBe(ast);
			expect(moduleScope.block).toBe(ast);
			expect(varNames(moduleScope)).toEqual(["a"]);
		});
	});

	// ported from tests/arguments.test.js
	describe("arguments", () => {
		it("arguments are correctly materialized", () => {
			const { scopes } = analyze(`
				(function () {
					arguments;
				}());
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments"]);
			expect(refNames(scope)).toEqual(["arguments"]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[0]);
		});
	});

	// ported from tests/catch-scope.test.js
	describe("catch", () => {
		it("creates scope", () => {
			const { scopes } = analyze(`
				(function () {
					try {
					} catch (e) {
					}
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"catch"
			]);

			const functionScope = scopes[2];

			expect(varNames(functionScope)).toEqual(["arguments"]);
			expect(refs(functionScope)).toHaveLength(0);

			const catchScope = scopes[3];

			expect(catchScope.block.type).toBe("CatchClause");
			expect(varNames(catchScope)).toEqual(["e"]);
			expect(catchScope.variables[0].identifiers).toHaveLength(1);
			expect(catchScope.variables[0].identifiers[0].name).toBe("e");
			expect(refs(catchScope)).toHaveLength(0);
		});

		it("param can be a pattern", () => {
			const { scopes } = analyze(`
				(function () {
					const default_id = 0;
					try {
					} catch ({ message, id = default_id, args: [arg1, arg2] }) {
					}
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"catch"
			]);

			const functionScope = scopes[2];

			expect(varNames(functionScope)).toEqual(["arguments", "default_id"]);
			expect(refNames(functionScope)).toEqual(["default_id"]);
			expect(refs(functionScope)[0].from).toBe(functionScope);
			expect(refs(functionScope)[0].resolved).toBe(functionScope.variables[1]);

			const catchScope = scopes[3];

			expect(varNames(catchScope)).toEqual(["message", "id", "arg1", "arg2"]);
			expect(refNames(catchScope)).toEqual(["id", "default_id"]);
			expect(refs(catchScope)[0].resolved).toBe(catchScope.variables[1]);
			expect(refs(catchScope)[1].resolved).toBe(functionScope.variables[1]);
		});
	});

	// ported from tests/es6-arrow-function-expression.test.js
	describe("ES6 arrow function expression", () => {
		it("materialize scope for arrow function expression", () => {
			const { scopes } = analyze(`
				var arrow = () => {
					let i = 0;
					var j = 20;
					console.log(i);
				}
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(varNames(scopes[1])).toEqual(["arrow"]);

			const scope = scopes[2];

			expect(scope.block.type).toBe("ArrowFunctionExpression");

			// there is no "arguments"
			expect(varNames(scope)).toEqual(["i", "j"]);
		});

		it("generate bindings for parameters", () => {
			const { scopes } = analyze("var arrow = (a, b, c, d) => {}");

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

			const scope = scopes[2];

			expect(scope.block.type).toBe("ArrowFunctionExpression");
			expect(varNames(scope)).toEqual(["a", "b", "c", "d"]);
		});

		it("works with no body", () => {
			const { scopes } = analyze("var arrow = a => a;");

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["a"]);
			expect(refNames(scope)).toEqual(["a"]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[0]);
		});
	});

	// ported from tests/es6-block-scope.test.js
	describe("ES6 block scope", () => {
		it("let is materialized in ES6 block scope", () => {
			const { scopes } = analyze(`
				{
					let i = 20;
					i;
				}
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "block"]);
			expect(scopes[1].variables).toHaveLength(0);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["i"]);
			expect(refNames(scope)).toEqual(["i", "i"]);
		});

		it("function declaration is materialized in ES6 block scope", () => {
			const { scopes } = analyze(`
				{
					function test() {
					}
					test();
				}
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"block",
				"function"
			]);
			expect(scopes[1].variables).toHaveLength(0);
			expect(varNames(scopes[2])).toEqual(["test"]);
			expect(refNames(scopes[2])).toEqual(["test"]);
			expect(varNames(scopes[3])).toEqual(["arguments"]);
			expect(refs(scopes[3])).toHaveLength(0);
		});

		it("let is not hoistable#1", () => {
			const { scopes } = analyze(`
				var i = 42; (1)
				{
					i;  // (2) ReferenceError at runtime.
					let i = 20;  // (2)
					i;  // (2)
				}
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "block"]);

			const moduleScope = scopes[1];

			expect(varNames(moduleScope)).toEqual(["i"]);
			expect(refs(moduleScope)).toHaveLength(1);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["i"]);
			expect(refs(scope)).toHaveLength(3);
			for (const reference of refs(scope)) {
				expect(reference.resolved).toBe(scope.variables[0]);
			}
		});

		it("let is not hoistable#2", () => {
			const { scopes } = analyze(`
				(function () {
					var i = 42; // (1)
					i;  // (1)
					{
						i;  // (3)
						{
							i;  // (2)
							let i = 20;  // (2)
							i;  // (2)
						}
						let i = 30;  // (3)
						i;  // (3)
					}
					i;  // (1)
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"block",
				"block"
			]);

			const functionScope = scopes[2];

			expect(varNames(functionScope)).toEqual(["arguments", "i"]);
			expect(refs(functionScope)).toHaveLength(3);
			for (const reference of refs(functionScope)) {
				expect(reference.resolved).toBe(functionScope.variables[1]);
			}

			const outerBlock = scopes[3];

			expect(varNames(outerBlock)).toEqual(["i"]);
			expect(refs(outerBlock)).toHaveLength(3);
			for (const reference of refs(outerBlock)) {
				expect(reference.resolved).toBe(outerBlock.variables[0]);
			}

			const innerBlock = scopes[4];

			expect(varNames(innerBlock)).toEqual(["i"]);
			expect(refs(innerBlock)).toHaveLength(3);
			for (const reference of refs(innerBlock)) {
				expect(reference.resolved).toBe(innerBlock.variables[0]);
			}
		});
	});

	// ported from tests/es6-catch.test.js
	describe("ES6 catch", () => {
		it("takes binding pattern", () => {
			const { scopes } = analyze(`
				try {
				} catch ({ a, b, c, d }) {
					let e = 20;
					a;
					b;
					c;
					d;
				}
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"catch",
				"block"
			]);

			const catchScope = scopes[2];

			expect(catchScope.block.type).toBe("CatchClause");
			expect(varNames(catchScope)).toEqual(["a", "b", "c", "d"]);
			expect(refs(catchScope)).toHaveLength(0);

			const catchBlockScope = scopes[3];

			expect(varNames(catchBlockScope)).toEqual(["e"]);
			expect(refNames(catchBlockScope)).toEqual(["e", "a", "b", "c", "d"]);
		});
	});

	// ported from tests/es6-class.test.js
	describe("ES6 class", () => {
		it("declaration name creates class scope", () => {
			const { scopes } = analyze(`
				class Derived extends Base {
					constructor() {
					}
				}
				new Derived();
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function"
			]);

			const moduleScope = scopes[1];

			expect(varNames(moduleScope)).toEqual(["Derived"]);
			expect(refNames(moduleScope)).toEqual(["Derived"]);

			const classScope = scopes[2];

			expect(classScope.block.type).toBe("ClassDeclaration");
			expect(varNames(classScope)).toEqual(["Derived"]);
			expect(refNames(classScope)).toEqual(["Base"]);

			const functionScope = scopes[3];

			expect(functionScope.block.type).toBe("FunctionExpression");
			expect(varNames(functionScope)).toEqual(["arguments"]);
			expect(refs(functionScope)).toHaveLength(0);
		});

		it("expression name creates class scope#1", () => {
			const { scopes } = analyze(`
				(class Derived extends Base {
					constructor() {
					}
				});
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function"
			]);
			expect(scopes[1].variables).toHaveLength(0);
			expect(refs(scopes[1])).toHaveLength(0);

			const classScope = scopes[2];

			expect(classScope.block.type).toBe("ClassExpression");
			expect(varNames(classScope)).toEqual(["Derived"]);
			expect(refNames(classScope)).toEqual(["Base"]);
		});

		it("expression name creates class scope#2", () => {
			const { scopes } = analyze(`
				(class extends Base {
					constructor() {
					}
				});
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function"
			]);

			const classScope = scopes[2];

			expect(classScope.block.type).toBe("ClassExpression");
			expect(classScope.variables).toHaveLength(0);
			expect(refNames(classScope)).toEqual(["Base"]);
		});

		// cspell:ignore yuyushiki
		it("computed property key may refer variables", () => {
			const { scopes } = analyze(`
				(function () {
					var yuyushiki = 42;
					(class {
						[yuyushiki]() {
						}

						[yuyushiki + 40]() {
						}
					});
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"class",
				"function",
				"function"
			]);

			const functionScope = scopes[2];

			expect(varNames(functionScope)).toEqual(["arguments", "yuyushiki"]);
			expect(refNames(functionScope)).toEqual(["yuyushiki"]);

			const classScope = scopes[3];

			expect(classScope.block.type).toBe("ClassExpression");
			expect(classScope.variables).toHaveLength(0);
			expect(refNames(classScope)).toEqual(["yuyushiki", "yuyushiki"]);
			for (const reference of refs(classScope)) {
				expect(reference.resolved).toBe(functionScope.variables[1]);
			}
		});

		// https://github.com/eslint/eslint-scope/issues/59
		it("class heritage may refer class name in class expressions #1", () => {
			const { scopes } = analyze("const A = class A extends A {}");

			expect(scopeTypes(scopes)).toEqual(["global", "module", "class"]);

			const moduleScope = scopes[1];

			// variable `A` defined by `const A`
			expect(varNames(moduleScope)).toEqual(["A"]);

			// init reference `A` in `const A`
			expect(moduleScope.variables[0].references).toHaveLength(1);
			expect(refs(moduleScope)).toHaveLength(1);
			expect(refs(moduleScope)[0]).toBe(moduleScope.variables[0].references[0]);

			const classScope = scopes[2];

			// variable `A` defined by `class A`
			expect(varNames(classScope)).toEqual(["A"]);

			// reference `A` in `extends A`
			expect(classScope.variables[0].references).toHaveLength(1);
			expect(refs(classScope)).toHaveLength(1);
			expect(refs(classScope)[0].resolved).toBe(classScope.variables[0]);
			expect(refs(classScope)[0]).toBe(classScope.variables[0].references[0]);
		});

		it("class heritage may refer class name in class expressions #2", () => {
			const { scopes } = analyze(`
				let foo;
				(class C extends (foo = C, class {}) {});
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"class"
			]);

			const moduleScope = scopes[1];

			expect(varNames(moduleScope)).toEqual(["foo"]);
			expect(refs(moduleScope)).toHaveLength(0);

			const classScope = scopes[2];

			expect(varNames(classScope)).toEqual(["C"]);
			expect(classScope.variables[0].references).toHaveLength(1);
			expect(refNames(classScope)).toEqual(["foo", "C"]);

			// `C` in `foo = C` is a reference to variable `C` defined by `class C`
			expect(refs(classScope)[1].resolved).toBe(classScope.variables[0]);
			expect(refs(classScope)[1]).toBe(classScope.variables[0].references[0]);

			const innerClassScope = scopes[3];

			expect(innerClassScope.variables).toHaveLength(0);
			expect(refs(innerClassScope)).toHaveLength(0);
		});

		it("class heritage may refer class name in class declarations", () => {
			const { scopes } = analyze(`
				let foo;
				class C extends (foo = C, class {}) {}
				new C();
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"class"
			]);

			const moduleScope = scopes[1];

			expect(varNames(moduleScope)).toEqual(["foo", "C"]);
			expect(moduleScope.variables[0].references).toHaveLength(1);
			expect(moduleScope.variables[1].references).toHaveLength(1);

			// `C` in `new C()`
			expect(refNames(moduleScope)).toEqual(["C"]);
			expect(refs(moduleScope)[0].resolved).toBe(moduleScope.variables[1]);

			const classScope = scopes[2];

			expect(classScope.block.type).toBe("ClassDeclaration");
			expect(varNames(classScope)).toEqual(["C"]);
			expect(refNames(classScope)).toEqual(["foo", "C"]);

			/*
			 * `class C` creates two variables `C`: one in the scope where the
			 * class is declared, another in the class scope. References inside
			 * the class should be to the variable in the class scope.
			 */
			expect(refs(classScope)[1].resolved).toBe(classScope.variables[0]);
			expect(refs(classScope)[1]).toBe(classScope.variables[0].references[0]);
		});

		it("inner scopes in the class heritage of a class expression are nested in the class scope", () => {
			const { scopes } = analyze("(class extends function () {} {})");

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function"
			]);
			expect(scopes[3].upper).toBe(scopes[2]);
			expect(scopes[2].childScopes).toEqual([scopes[3]]);
		});

		it("inner scopes in the class heritage of a class declaration are nested in the class scope", () => {
			const { scopes } = analyze("class C extends function () {} {}");

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function"
			]);
			expect(scopes[3].upper).toBe(scopes[2]);
			expect(scopes[2].childScopes).toEqual([scopes[3]]);
		});

		it("regression #49", () => {
			const { scopes } = analyze(`
				class Shoe {
					constructor() {
						//Shoe.x = true;
					}
				}
				let shoe = new Shoe();
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function"
			]);

			const moduleScope = scopes[1];

			expect(varNames(moduleScope)).toEqual(["Shoe", "shoe"]);
			expect(refNames(moduleScope)).toEqual(["shoe", "Shoe"]);
		});
	});

	// ported from tests/es6-default-parameters.test.js
	describe("ES6 default parameters", () => {
		/**
		 * @param {Record<string, string>} patterns code per function form
		 * @param {(analysis: Analysis, arity: number) => void} check assertions, given the extra `arguments` binding a non-arrow gets
		 * @returns {void}
		 */
		const forEachFunctionForm = (patterns, check) => {
			for (const [name, code] of Object.entries(patterns)) {
				it(name, () => {
					check(analyze(code), name === "ArrowExpression" ? 0 : 1);
				});
			}
		};

		describe("a default parameter creates a reference for its initialization", () => {
			forEachFunctionForm(
				{
					FunctionDeclaration: "function foo(a, b = 0) {}",
					FunctionExpression: "let foo = function(a, b = 0) {};",
					ArrowExpression: "let foo = (a, b = 0) => {};"
				},
				({ scopes }, extra) => {
					expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

					const scope = scopes[2];

					// [arguments?, a, b]
					expect(scope.variables).toHaveLength(2 + extra);
					expect(refs(scope)).toHaveLength(1);

					const reference = refs(scope)[0];

					expect(reference.from).toBe(scope);
					expect(reference.identifier.name).toBe("b");
					expect(reference.resolved).toBe(
						scope.variables[scope.variables.length - 1]
					);
				}
			);
		});

		describe("a default parameter creates a reference for references in right", () => {
			forEachFunctionForm(
				{
					FunctionDeclaration: `
						let a;
						function foo(b = a) {}
					`,
					FunctionExpression: `
						let a;
						let foo = function(b = a) {}
					`,
					ArrowExpression: `
						let a;
						let foo = (b = a) => {};
					`
				},
				({ scopes }, extra) => {
					expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

					const scope = scopes[2];

					// [arguments?, b]
					expect(scope.variables).toHaveLength(1 + extra);
					expect(refNames(scope)).toEqual(["b", "a"]);

					const reference = refs(scope)[1];

					expect(reference.from).toBe(scope);
					expect(reference.resolved).toBe(scopes[1].variables[0]);
				}
			);
		});

		describe("a default parameter creates a reference for references in right (for const)", () => {
			forEachFunctionForm(
				{
					FunctionDeclaration: `
						const a = 0;
						function foo(b = a) {}
					`,
					FunctionExpression: `
						const a = 0;
						let foo = function(b = a) {}
					`,
					ArrowExpression: `
						const a = 0;
						let foo = (b = a) => {};
					`
				},
				({ scopes }, extra) => {
					const scope = scopes[2];

					expect(scope.variables).toHaveLength(1 + extra);
					expect(refNames(scope)).toEqual(["b", "a"]);
					expect(refs(scope)[1].resolved).toBe(scopes[1].variables[0]);
				}
			);
		});

		describe("a default parameter creates a reference for references in right (partial)", () => {
			forEachFunctionForm(
				{
					FunctionDeclaration: `
						let a;
						function foo(b = a.c) {}
					`,
					FunctionExpression: `
						let a;
						let foo = function(b = a.c) {}
					`,
					ArrowExpression: `
						let a;
						let foo = (b = a.c) => {};
					`
				},
				({ scopes }, extra) => {
					const scope = scopes[2];

					expect(scope.variables).toHaveLength(1 + extra);
					expect(refNames(scope)).toEqual(["b", "a"]);
					expect(refs(scope)[1].resolved).toBe(scopes[1].variables[0]);
				}
			);
		});

		describe("a default parameter creates a reference for references in right's nested scope", () => {
			forEachFunctionForm(
				{
					FunctionDeclaration: `
						let a;
						function foo(b = function() { return a; }) {}
					`,
					FunctionExpression: `
						let a;
						let foo = function(b = function() { return a; }) {}
					`,
					ArrowExpression: `
						let a;
						let foo = (b = function() { return a; }) => {};
					`
				},
				({ scopes }) => {
					expect(scopeTypes(scopes)).toEqual([
						"global",
						"module",
						"function",
						"function"
					]);

					const scope = scopes[3];

					expect(varNames(scope)).toEqual(["arguments"]);
					expect(refNames(scope)).toEqual(["a"]);

					const reference = refs(scope)[0];

					expect(reference.from).toBe(scope);
					expect(reference.resolved).toBe(scopes[1].variables[0]);
				}
			);
		});

		describe("a reference in a default parameter resolves to the outer scope even when the function body declares the same name", () => {
			forEachFunctionForm(
				{
					FunctionDeclaration: `
						let a;
						function foo(b = a) { let a; }
					`,
					FunctionExpression: `
						let a;
						let foo = function(b = a) { let a; }
					`,
					ArrowExpression: `
						let a;
						let foo = (b = a) => { let a; };
					`
				},
				({ scopes }, extra) => {
					expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

					const scope = scopes[2];

					// [arguments?, b, a]
					expect(scope.variables).toHaveLength(2 + extra);
					expect(refNames(scope)).toEqual(["b", "a"]);
					expect(refs(scope)[1].resolved).toBe(scopes[1].variables[0]);
				}
			);
		});

		describe("a reference in a default parameter resolves to a later parameter", () => {
			forEachFunctionForm(
				{
					FunctionDeclaration: `
						let a;
						function foo(b = a, a) { }
					`,
					FunctionExpression: `
						let a;
						let foo = function(b = a, a) { }
					`,
					ArrowExpression: `
						let a;
						let foo = (b = a, a) => { };
					`
				},
				({ scopes }, extra) => {
					const scope = scopes[2];

					// [arguments?, b, a]
					expect(scope.variables).toHaveLength(2 + extra);
					expect(refNames(scope)).toEqual(["b", "a"]);
					expect(refs(scope)[1].resolved).toBe(
						scope.variables[scope.variables.length - 1]
					);
				}
			);
		});

		describe("a reference in a default parameter's nested scope resolves to the outer scope even when the function body declares the same name", () => {
			forEachFunctionForm(
				{
					FunctionDeclaration: `
						let a;
						function foo(b = function(){ a }) { let a; }
					`,
					FunctionExpression: `
						let a;
						let foo = function(b = function(){ a }) { let a; }
					`,
					ArrowExpression: `
						let a;
						let foo = (b = function(){ a }) => { let a; };
					`
				},
				({ scopes }) => {
					expect(scopeTypes(scopes)).toEqual([
						"global",
						"module",
						"function",
						"function"
					]);

					const scope = scopes[3];

					expect(refNames(scope)).toEqual(["a"]);
					expect(refs(scope)[0].from).toBe(scope);
					expect(refs(scope)[0].resolved).toBe(scopes[1].variables[0]);
				}
			);
		});
	});

	// ported from tests/es6-destructuring-assignments.test.js
	describe("ES6 destructuring assignments", () => {
		it("pattern in var in ForInStatement", () => {
			const analysis = analyze(`
				(function () {
					for (var [a, b, c] in array);
				}());
			`);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(freeNames(analysis)).toEqual(["array"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "a", "b", "c"]);
			expect(refNames(scope)).toEqual(["a", "b", "c", "array"]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[1]);
			expect(refs(scope)[1].resolved).toBe(scope.variables[2]);
			expect(refs(scope)[2].resolved).toBe(scope.variables[3]);
			expect(refs(scope)[3].resolved).toBeUndefined();
		});

		it("pattern in let in ForInStatement", () => {
			const analysis = analyze(`
				(function () {
					for (let [a, b, c] in array);
				}());
			`);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"for"
			]);
			expect(freeNames(analysis)).toEqual(["array"]);

			const scope = scopes[3];

			expect(varNames(scope)).toEqual(["a", "b", "c"]);
			expect(refNames(scope)).toEqual(["a", "b", "c", "array"]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[0]);
			expect(refs(scope)[1].resolved).toBe(scope.variables[1]);
			expect(refs(scope)[2].resolved).toBe(scope.variables[2]);
			expect(refs(scope)[3].resolved).toBeUndefined();
		});

		it("pattern with default values in var in ForInStatement", () => {
			const analysis = analyze(`
				(function () {
					for (var [a, b, c = d] in array);
				}());
			`);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(freeNames(analysis)).toEqual(["d", "array"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "a", "b", "c"]);
			expect(refNames(scope)).toEqual(["a", "b", "c", "c", "d", "array"]);
			expect(refs(scope)[2].resolved).toBe(scope.variables[3]);
			expect(refs(scope)[3].resolved).toBe(scope.variables[3]);
			expect(refs(scope)[4].resolved).toBeUndefined();
		});

		it("pattern with default values in let in ForInStatement", () => {
			const analysis = analyze(`
				(function () {
					for (let [a, b, c = d] in array);
				}());
			`);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"for"
			]);
			expect(freeNames(analysis)).toEqual(["d", "array"]);
			for (const reference of analysis.unresolvedReferences) {
				expect(reference.from.type).toBe("for");
			}

			const scope = scopes[3];

			expect(varNames(scope)).toEqual(["a", "b", "c"]);
			expect(refNames(scope)).toEqual(["a", "b", "c", "c", "d", "array"]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[0]);
			expect(refs(scope)[1].resolved).toBe(scope.variables[1]);
			expect(refs(scope)[2].resolved).toBe(scope.variables[2]);
			expect(refs(scope)[3].resolved).toBe(scope.variables[2]);
		});

		it("pattern with nested default values in var in ForInStatement", () => {
			const analysis = analyze(`
				(function () {
					for (var [a, [b, c = d] = e] in array);
				}());
			`);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(freeNames(analysis)).toEqual(["d", "e", "array"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "a", "b", "c"]);
			expect(refNames(scope)).toEqual([
				"a",
				"b",
				"b",
				"c",
				"c",
				"c",
				"d",
				"e",
				"array"
			]);
		});

		it("pattern with nested default values in let in ForInStatement", () => {
			const analysis = analyze(`
				(function () {
					for (let [a, [b, c = d] = e] in array);
				}());
			`);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"for"
			]);
			expect(freeNames(analysis)).toEqual(["d", "e", "array"]);

			const scope = scopes[3];

			expect(varNames(scope)).toEqual(["a", "b", "c"]);
			expect(refNames(scope)).toEqual([
				"a",
				"b",
				"b",
				"c",
				"c",
				"c",
				"d",
				"e",
				"array"
			]);
		});

		it("pattern with default values in var in ForInStatement (separate declarations)", () => {
			const analysis = analyze(`
				(function () {
					var a, b, c;
					for ([a, b, c = d] in array);
				}());
			`);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(freeNames(analysis)).toEqual(["d", "array"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "a", "b", "c"]);
			expect(refNames(scope)).toEqual(["a", "b", "c", "c", "d", "array"]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[1]);
			expect(refs(scope)[1].resolved).toBe(scope.variables[2]);
			expect(refs(scope)[2].resolved).toBe(scope.variables[3]);
			expect(refs(scope)[3].resolved).toBe(scope.variables[3]);
		});

		it("pattern with default values in var in ForInStatement (separate declarations and with MemberExpression)", () => {
			const analysis = analyze(`
				(function () {
					var obj;
					for ([obj.a, obj.b, obj.c = d] in array);
				}());
			`);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(freeNames(analysis)).toEqual(["d", "array"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "obj"]);
			expect(refNames(scope)).toEqual(["obj", "obj", "obj", "d", "array"]);
			for (let i = 0; i < 3; i++) {
				expect(refs(scope)[i].resolved).toBe(scope.variables[1]);
			}
		});

		it("an ArrayPattern in var", () => {
			const analysis = analyze(`
				(function () {
					var [a, b, c] = array;
				}());
			`);
			const { scopes } = analysis;

			expect(freeNames(analysis)).toEqual(["array"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "a", "b", "c"]);
			expect(refNames(scope)).toEqual(["a", "b", "c", "array"]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[1]);
			expect(refs(scope)[1].resolved).toBe(scope.variables[2]);
			expect(refs(scope)[2].resolved).toBe(scope.variables[3]);
		});

		it("a SpreadElement in var", () => {
			let analysis = analyze(`
				(function () {
					var [a, b, ...rest] = array;
				}());
			`);

			expect(freeNames(analysis)).toEqual(["array"]);
			expect(varNames(analysis.scopes[2])).toEqual([
				"arguments",
				"a",
				"b",
				"rest"
			]);
			expect(refNames(analysis.scopes[2])).toEqual(["a", "b", "rest", "array"]);

			analysis = analyze(`
				(function () {
					var [a, b, ...[c, d, ...rest]] = array;
				}());
			`);

			expect(freeNames(analysis)).toEqual(["array"]);
			expect(varNames(analysis.scopes[2])).toEqual([
				"arguments",
				"a",
				"b",
				"c",
				"d",
				"rest"
			]);
			expect(refNames(analysis.scopes[2])).toEqual([
				"a",
				"b",
				"c",
				"d",
				"rest",
				"array"
			]);
		});

		it("an ObjectPattern in var", () => {
			const analysis = analyze(`
				(function () {
					var {
						shorthand,
						key: value,
						hello: {
							world
						}
					} = object;
				}());
			`);
			const scope = analysis.scopes[2];

			expect(freeNames(analysis)).toEqual(["object"]);
			expect(varNames(scope)).toEqual([
				"arguments",
				"shorthand",
				"value",
				"world"
			]);
			expect(refNames(scope)).toEqual([
				"shorthand",
				"value",
				"world",
				"object"
			]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[1]);
			expect(refs(scope)[1].resolved).toBe(scope.variables[2]);
			expect(refs(scope)[2].resolved).toBe(scope.variables[3]);
		});

		it("complex pattern in var", () => {
			const analysis = analyze(`
				(function () {
					var {
						shorthand,
						key: [ a, b, c, d, e ],
						hello: {
							world
						}
					} = object;
				}());
			`);
			const scope = analysis.scopes[2];

			expect(freeNames(analysis)).toEqual(["object"]);
			expect(varNames(scope)).toEqual([
				"arguments",
				"shorthand",
				"a",
				"b",
				"c",
				"d",
				"e",
				"world"
			]);
			expect(refNames(scope)).toEqual([
				"shorthand",
				"a",
				"b",
				"c",
				"d",
				"e",
				"world",
				"object"
			]);
		});

		it("an ArrayPattern in AssignmentExpression", () => {
			const analysis = analyze(`
				(function () {
					[a, b, c] = array;
				}());
			`);
			const scope = analysis.scopes[2];

			expect(freeNames(analysis)).toEqual(["a", "b", "c", "array"]);
			expect(varNames(scope)).toEqual(["arguments"]);
			expect(refNames(scope)).toEqual(["a", "b", "c", "array"]);
			for (const reference of refs(scope)) {
				expect(reference.resolved).toBeUndefined();
			}
		});

		it("an ArrayPattern with MemberExpression in AssignmentExpression", () => {
			const analysis = analyze(`
				(function () {
					var obj;
					[obj.a, obj.b, obj.c] = array;
				}());
			`);
			const scope = analysis.scopes[2];

			expect(freeNames(analysis)).toEqual(["array"]);
			expect(varNames(scope)).toEqual(["arguments", "obj"]);
			expect(refNames(scope)).toEqual(["obj", "obj", "obj", "array"]);
			for (let i = 0; i < 3; i++) {
				expect(refs(scope)[i].resolved).toBe(scope.variables[1]);
			}
		});

		it("a SpreadElement in AssignmentExpression", () => {
			let analysis = analyze(`
				(function () {
					[a, b, ...rest] = array;
				}());
			`);

			expect(freeNames(analysis)).toEqual(["a", "b", "rest", "array"]);
			expect(varNames(analysis.scopes[2])).toEqual(["arguments"]);
			expect(refNames(analysis.scopes[2])).toEqual(["a", "b", "rest", "array"]);

			analysis = analyze(`
				(function () {
					[a, b, ...[c, d, ...rest]] = array;
				}());
			`);

			expect(freeNames(analysis)).toEqual([
				"a",
				"b",
				"c",
				"d",
				"rest",
				"array"
			]);
			expect(varNames(analysis.scopes[2])).toEqual(["arguments"]);
			expect(refNames(analysis.scopes[2])).toEqual([
				"a",
				"b",
				"c",
				"d",
				"rest",
				"array"
			]);
		});

		it("a SpreadElement with MemberExpression in AssignmentExpression", () => {
			const analysis = analyze(`
				(function () {
					[a, b, ...obj.rest] = array;
				}());
			`);

			expect(freeNames(analysis)).toEqual(["a", "b", "obj", "array"]);
			expect(refNames(analysis.scopes[2])).toEqual(["a", "b", "obj", "array"]);
		});

		it("an ObjectPattern in AssignmentExpression", () => {
			const analysis = analyze(`
				(function () {
					({
						shorthand,
						key: value,
						hello: {
							world
						}
					} = object);
				}());
			`);

			expect(freeNames(analysis)).toEqual([
				"shorthand",
				"value",
				"world",
				"object"
			]);
			expect(varNames(analysis.scopes[2])).toEqual(["arguments"]);
			expect(refNames(analysis.scopes[2])).toEqual([
				"shorthand",
				"value",
				"world",
				"object"
			]);
		});

		it("complex pattern in AssignmentExpression", () => {
			const analysis = analyze(`
				(function () {
					({
						shorthand,
						key: [ a, b, c, d, e ],
						hello: {
							world
						}
					} = object);
				}());
			`);

			expect(freeNames(analysis)).toEqual([
				"shorthand",
				"a",
				"b",
				"c",
				"d",
				"e",
				"world",
				"object"
			]);
			expect(varNames(analysis.scopes[2])).toEqual(["arguments"]);
			expect(refNames(analysis.scopes[2])).toEqual([
				"shorthand",
				"a",
				"b",
				"c",
				"d",
				"e",
				"world",
				"object"
			]);
		});

		it("an ArrayPattern in parameters", () => {
			const analysis = analyze(`
				(function ([a, b, c]) {
				}(array));
			`);

			expect(freeNames(analysis)).toEqual(["array"]);
			expect(refNames(analysis.moduleScope)).toEqual(["array"]);
			expect(varNames(analysis.scopes[2])).toEqual([
				"arguments",
				"a",
				"b",
				"c"
			]);
			expect(refs(analysis.scopes[2])).toHaveLength(0);
		});

		it("a SpreadElement in parameters", () => {
			const analysis = analyze(`
				(function ([a, b, ...rest], ...rest2) {
				}(array));
			`);

			expect(freeNames(analysis)).toEqual(["array"]);
			expect(refNames(analysis.moduleScope)).toEqual(["array"]);
			expect(varNames(analysis.scopes[2])).toEqual([
				"arguments",
				"a",
				"b",
				"rest",
				"rest2"
			]);
			expect(refs(analysis.scopes[2])).toHaveLength(0);
		});

		it("an ObjectPattern in parameters", () => {
			const analysis = analyze(`
				(function ({
						shorthand,
						key: value,
						hello: {
							world
						}
					}) {
				}(object));
			`);

			expect(freeNames(analysis)).toEqual(["object"]);
			expect(refNames(analysis.moduleScope)).toEqual(["object"]);
			expect(varNames(analysis.scopes[2])).toEqual([
				"arguments",
				"shorthand",
				"value",
				"world"
			]);
			expect(refs(analysis.scopes[2])).toHaveLength(0);
		});

		it("complex pattern in parameters", () => {
			const analysis = analyze(`
				(function ({
						shorthand,
						key: [ a, b, c, d, e ],
						hello: {
							world
						}
					}) {
				}(object));
			`);

			expect(freeNames(analysis)).toEqual(["object"]);
			expect(varNames(analysis.scopes[2])).toEqual([
				"arguments",
				"shorthand",
				"a",
				"b",
				"c",
				"d",
				"e",
				"world"
			]);
			expect(refs(analysis.scopes[2])).toHaveLength(0);
		});

		it("default values and patterns in var", () => {
			const { scopes } = analyze(`
				(function () {
					var [a, b, c, d = 20 ] = array;
				}());
			`);
			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "a", "b", "c", "d"]);
			expect(refNames(scope)).toEqual([
				"a",
				"b",
				"c",
				"d", // assign 20
				"d", // assign array
				"array"
			]);
		});

		it("default values containing references and patterns in var", () => {
			const { scopes } = analyze(`
				(function () {
					var [a, b, c, d = e ] = array;
				}());
			`);
			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "a", "b", "c", "d"]);
			expect(refNames(scope)).toEqual([
				"a", // assign array
				"b", // assign array
				"c", // assign array
				"d", // assign e
				"d", // assign array
				"e",
				"array"
			]);
		});

		it("nested default values containing references and patterns in var", () => {
			const { scopes } = analyze(`
				(function () {
					var [a, b, [c, d = e] = f ] = array;
				}());
			`);
			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "a", "b", "c", "d"]);
			expect(refNames(scope)).toEqual([
				"a", // assign array
				"b", // assign array
				"c", // assign f
				"c", // assign array
				"d", // assign f
				"d", // assign e
				"d", // assign array
				"e",
				"f",
				"array"
			]);
		});
	});

	// ported from tests/es6-export.test.js
	describe("export declaration", () => {
		it("should create variable bindings", () => {
			const { scopes, moduleScope } = analyze("export var v;");

			expect(scopeTypes(scopes)).toEqual(["global", "module"]);
			expect(varNames(moduleScope)).toEqual(["v"]);
			expect(refs(moduleScope)).toHaveLength(0);
		});

		it("should create function declaration bindings", () => {
			const { scopes, moduleScope } = analyze("export default function f(){};");

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(varNames(moduleScope)).toEqual(["f"]);
			expect(refs(moduleScope)).toHaveLength(0);
			expect(varNames(scopes[2])).toEqual(["arguments"]);
		});

		it("should export function expression", () => {
			const { scopes, moduleScope } = analyze("export default function(){};");

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(moduleScope.variables).toHaveLength(0);
			expect(refs(moduleScope)).toHaveLength(0);
			expect(varNames(scopes[2])).toEqual(["arguments"]);
		});

		it("should export an anonymous class", () => {
			const { scopes, moduleScope } = analyze(
				"export default class extends Base {};"
			);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "class"]);
			expect(moduleScope.variables).toHaveLength(0);
			expect(scopes[2].variables).toHaveLength(0);
			expect(refNames(scopes[2])).toEqual(["Base"]);
		});

		it("should export literal", () => {
			const { scopes, moduleScope } = analyze("export default 42;");

			expect(scopeTypes(scopes)).toEqual(["global", "module"]);
			expect(moduleScope.variables).toHaveLength(0);
			expect(refs(moduleScope)).toHaveLength(0);
		});

		it("should refer exported references#1", () => {
			const { scopes, moduleScope } = analyze("const x = 1; export {x};");

			expect(scopeTypes(scopes)).toEqual(["global", "module"]);
			expect(varNames(moduleScope)).toEqual(["x"]);
			expect(refNames(moduleScope)).toEqual(["x", "x"]);
			for (const reference of refs(moduleScope)) {
				expect(reference.resolved).toBe(moduleScope.variables[0]);
			}
		});

		it("should refer exported references#2", () => {
			const { scopes, moduleScope } = analyze("const v = 1; export {v as x};");

			expect(scopeTypes(scopes)).toEqual(["global", "module"]);
			expect(varNames(moduleScope)).toEqual(["v"]);
			expect(refNames(moduleScope)).toEqual(["v", "v"]);
		});

		it("should not refer exported references from other source#1", () => {
			const analysis = analyze('export {x} from "mod";');

			expect(scopeTypes(analysis.scopes)).toEqual(["global", "module"]);
			expect(analysis.moduleScope.variables).toHaveLength(0);
			expect(refs(analysis.moduleScope)).toHaveLength(0);
			expect(freeNames(analysis)).toEqual([]);
		});

		it("should not refer exported references from other source#2", () => {
			const analysis = analyze('export {v as x} from "mod";');

			expect(analysis.moduleScope.variables).toHaveLength(0);
			expect(refs(analysis.moduleScope)).toHaveLength(0);
			expect(freeNames(analysis)).toEqual([]);
		});

		it("should not refer exported references from other source#3", () => {
			const analysis = analyze('export * from "mod";');

			expect(analysis.moduleScope.variables).toHaveLength(0);
			expect(refs(analysis.moduleScope)).toHaveLength(0);
			expect(freeNames(analysis)).toEqual([]);
		});
	});

	// ported from tests/export-star-as-ns-from-source.test.js
	describe("export * as ns from 'source'", () => {
		it("should not have any variables or references", () => {
			const analysis = analyze("export * as ns from 'source'");

			expect(scopeTypes(analysis.scopes)).toEqual(["global", "module"]);
			for (const scope of analysis.scopes) {
				expect(scope.variables).toHaveLength(0);
				expect(refs(scope)).toHaveLength(0);
			}
			expect(freeNames(analysis)).toEqual([]);
		});
	});

	// ported from tests/es6-import.test.js
	describe("import declaration", () => {
		it("should import names from source", () => {
			const { scopes, moduleScope } = analyze('import v from "mod";');

			expect(scopeTypes(scopes)).toEqual(["global", "module"]);
			expect(varNames(moduleScope)).toEqual(["v"]);
			expect(refs(moduleScope)).toHaveLength(0);
		});

		it("should import namespaces", () => {
			const { moduleScope } = analyze('import * as ns from "mod";');

			expect(varNames(moduleScope)).toEqual(["ns"]);
			expect(refs(moduleScope)).toHaveLength(0);
		});

		it("should import insided names#1", () => {
			const { moduleScope } = analyze('import {x} from "mod";');

			expect(varNames(moduleScope)).toEqual(["x"]);
			expect(refs(moduleScope)).toHaveLength(0);
		});

		it("should import insided names#2", () => {
			const { moduleScope } = analyze('import {x as v} from "mod";');

			expect(varNames(moduleScope)).toEqual(["v"]);
			expect(refs(moduleScope)).toHaveLength(0);
		});
	});

	// ported from tests/es6-iteration-scope.test.js
	describe("ES6 iteration scope", () => {
		it("let materialize iteration scope for ForInStatement#1", () => {
			const { scopes } = analyze(`
				(function () {
					let i = 20;
					for (let i in i) {
						console.log(i);
					}
				}());
			`);

			// the loop body declares nothing, so it gets no scope of its own
			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"for"
			]);

			const functionScope = scopes[2];

			expect(varNames(functionScope)).toEqual(["arguments", "i"]);
			expect(refNames(functionScope)).toEqual(["i"]);
			expect(refs(functionScope)[0].resolved).toBe(functionScope.variables[1]);

			const iterScope = scopes[3];

			expect(varNames(iterScope)).toEqual(["i"]);
			expect(refNames(iterScope)).toEqual(["i", "i", "console", "i"]);
			expect(refs(iterScope)[0].resolved).toBe(iterScope.variables[0]);
			expect(refs(iterScope)[1].resolved).toBe(iterScope.variables[0]);
			expect(refs(iterScope)[2].resolved).toBeUndefined();
			expect(refs(iterScope)[3].resolved).toBe(iterScope.variables[0]);
		});

		it("let materialize iteration scope for ForInStatement#2", () => {
			const { scopes } = analyze(`
				(function () {
					let i = 20;
					for (let { i, j, k } in i) {
						console.log(i);
					}
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"for"
			]);

			const functionScope = scopes[2];

			expect(varNames(functionScope)).toEqual(["arguments", "i"]);
			expect(refNames(functionScope)).toEqual(["i"]);

			const iterScope = scopes[3];

			expect(varNames(iterScope)).toEqual(["i", "j", "k"]);
			expect(refNames(iterScope)).toEqual(["i", "j", "k", "i", "console", "i"]);
			expect(refs(iterScope)[0].resolved).toBe(iterScope.variables[0]);
			expect(refs(iterScope)[1].resolved).toBe(iterScope.variables[1]);
			expect(refs(iterScope)[2].resolved).toBe(iterScope.variables[2]);
			expect(refs(iterScope)[3].resolved).toBe(iterScope.variables[0]);
			expect(refs(iterScope)[4].resolved).toBeUndefined();
			expect(refs(iterScope)[5].resolved).toBe(iterScope.variables[0]);
		});

		// cspell:ignore okok
		it("let materialize iteration scope for ForStatement#2", () => {
			const { scopes } = analyze(`
				(function () {
					let i = 20;
					let obj = {};
					for (let { i, j, k } = obj; i < okok; ++i) {
						console.log(i, j, k);
					}
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"for"
			]);

			const functionScope = scopes[2];

			expect(varNames(functionScope)).toEqual(["arguments", "i", "obj"]);
			expect(refNames(functionScope)).toEqual(["i", "obj"]);

			const iterScope = scopes[3];

			expect(varNames(iterScope)).toEqual(["i", "j", "k"]);
			expect(refNames(iterScope)).toEqual([
				"i",
				"j",
				"k",
				"obj",
				"i",
				"okok",
				"i",
				"console",
				"i",
				"j",
				"k"
			]);
			expect(refs(iterScope)[3].resolved).toBe(functionScope.variables[2]);
			expect(refs(iterScope)[4].resolved).toBe(iterScope.variables[0]);
			expect(refs(iterScope)[5].resolved).toBeUndefined();
			expect(refs(iterScope)[6].resolved).toBe(iterScope.variables[0]);
			expect(refs(iterScope)[7].resolved).toBeUndefined();
			expect(refs(iterScope)[8].resolved).toBe(iterScope.variables[0]);
			expect(refs(iterScope)[9].resolved).toBe(iterScope.variables[1]);
			expect(refs(iterScope)[10].resolved).toBe(iterScope.variables[2]);
		});
	});

	// ported from tests/es6-new-target.test.js
	describe("ES6 new.target", () => {
		it("should not make references of new.target", () => {
			const { scopes } = analyze(`
				class A {
					constructor() {
						new.target;
					}
				}
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function"
			]);

			const scope = scopes[3];

			expect(scope.block.type).toBe("FunctionExpression");
			expect(varNames(scope)).toEqual(["arguments"]);
			expect(refs(scope)).toHaveLength(0);
		});
	});

	// ported from tests/es6-object.test.js
	describe("ES6 object", () => {
		it("method definition", () => {
			const { scopes } = analyze(`
				({
					constructor() {
					}
				})`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

			const scope = scopes[2];

			expect(scope.block.type).toBe("FunctionExpression");
			expect(varNames(scope)).toEqual(["arguments"]);
			expect(refs(scope)).toHaveLength(0);
		});

		it("computed property key may refer variables", () => {
			const { scopes } = analyze(`
				(function () {
					var yuyushiki = 42;
					({
						[yuyushiki]() {
						},

						[yuyushiki + 40]() {
						}
					})
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"function",
				"function"
			]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "yuyushiki"]);
			expect(refNames(scope)).toEqual(["yuyushiki", "yuyushiki", "yuyushiki"]);
			for (const reference of refs(scope)) {
				expect(reference.resolved).toBe(scope.variables[1]);
			}
		});
	});

	// ported from tests/es6-rest-args.test.js
	describe("ES6 rest arguments", () => {
		it("materialize rest argument in scope", () => {
			const { scopes, moduleScope } = analyze(`
				function foo(...bar) {
					return bar;
				}
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(varNames(moduleScope)).toEqual(["foo"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "bar"]);
			expect(scope.variables[1].identifiers[0].name).toBe("bar");
			expect(refNames(scope)).toEqual(["bar"]);
			expect(refs(scope)[0].resolved).toBe(scope.variables[1]);
		});
	});

	// ported from tests/es6-super.test.js
	describe("ES6 super", () => {
		it("is not handled as reference", () => {
			const { scopes, moduleScope } = analyze(`
				class Foo extends Bar {
					constructor() {
						super();
					}

					method() {
						super.method();
					}
				}
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function",
				"function"
			]);
			expect(varNames(moduleScope)).toEqual(["Foo"]);
			expect(refs(moduleScope)).toHaveLength(0);

			const classScope = scopes[2];

			expect(varNames(classScope)).toEqual(["Foo"]);
			expect(refNames(classScope)).toEqual(["Bar"]);

			// super is specially handled like `this`
			for (const scope of [scopes[3], scopes[4]]) {
				expect(varNames(scope)).toEqual(["arguments"]);
				expect(refs(scope)).toHaveLength(0);
			}
		});
	});

	// ported from tests/es6-switch.test.js
	describe("ES6 switch", () => {
		it("materialize scope", () => {
			const { scopes, moduleScope } = analyze(`
				switch (ok) {
					case hello:
						let i = 20;
						i;
						break;

					default:
						let test = 30;
						test;
				}
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "switch"]);
			expect(moduleScope.variables).toHaveLength(0);
			expect(refNames(moduleScope)).toEqual(["ok"]);

			const scope = scopes[2];

			expect(scope.block.type).toBe("SwitchStatement");
			expect(varNames(scope)).toEqual(["i", "test"]);
			expect(refNames(scope)).toEqual(["hello", "i", "i", "test", "test"]);
		});
	});

	// ported from tests/es6-template-literal.test.js
	describe("ES6 template literal", () => {
		it("refer variables", () => {
			const { scopes } = analyze(`
				(function () {
					let i, j, k;
					function testing() { }
					let template = testing\`testing \${i} and \${j}\`
					return template;
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"function"
			]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual([
				"arguments",
				"i",
				"j",
				"k",
				"testing",
				"template"
			]);
			expect(refNames(scope)).toEqual([
				"template",
				"testing",
				"i",
				"j",
				"template"
			]);
		});
	});

	// ported from tests/function-expression-name.test.js
	describe("function name", () => {
		it("should create its special scope", () => {
			const { scopes, moduleScope } = analyze(`
				(function name() {
				}());
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function-expression-name",
				"function"
			]);

			const nameScope = scopes[2];

			expect(varNames(nameScope)).toEqual(["name"]);
			expect(refs(nameScope)).toHaveLength(0);
			expect(nameScope.upper).toBe(moduleScope);

			const functionScope = scopes[3];

			expect(varNames(functionScope)).toEqual(["arguments"]);
			expect(refs(functionScope)).toHaveLength(0);
			expect(functionScope.upper).toBe(nameScope);
		});
	});

	// ported from tests/global-increment.test.js
	describe("global increment", () => {
		it("makes one reference", () => {
			const analysis = analyze("b++;");

			expect(scopeTypes(analysis.scopes)).toEqual(["global", "module"]);
			expect(analysis.moduleScope.variables).toHaveLength(0);
			expect(refNames(analysis.moduleScope)).toEqual(["b"]);
			expect(freeNames(analysis)).toEqual(["b"]);
		});
	});

	// ported from tests/label.test.js
	describe("label", () => {
		it("should not create variables", () => {
			const { scopes, moduleScope } = analyze(
				"function bar() { q: for(;;) { break q; } }"
			);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(varNames(moduleScope)).toEqual(["bar"]);
			expect(refs(moduleScope)).toHaveLength(0);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments"]);
			expect(refs(scope)).toHaveLength(0);
		});

		it("should count child node references", () => {
			const analysis = analyze(`
				var foo = 5;

				label: while (true) {
				  console.log(foo);
				  break;
				}
			`);
			const { moduleScope } = analysis;

			expect(varNames(moduleScope)).toEqual(["foo"]);
			expect(moduleScope.variables[0].references).toHaveLength(2);
			expect(freeNames(analysis)).toEqual(["console"]);
		});
	});

	// ported from tests/with-scope.test.js
	describe("with", () => {
		it("creates scope", () => {
			const analysis = analyze(
				`
				(function () {
					with (obj) {
						testing;
					}
				}());
			`,
				"script"
			);
			const { scopes } = analysis;

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"with"
			]);

			const functionScope = scopes[2];

			expect(varNames(functionScope)).toEqual(["arguments"]);
			expect(refNames(functionScope)).toEqual(["obj"]);
			expect(refs(functionScope)[0].resolved).toBeUndefined();

			const withScope = scopes[3];

			expect(withScope.block.type).toBe("WithStatement");
			expect(withScope.variables).toHaveLength(0);
			expect(refNames(withScope)).toEqual(["testing"]);
			expect(refs(withScope)[0].resolved).toBeUndefined();
			expect(freeNames(analysis)).toEqual(["obj", "testing"]);
		});
	});

	// ported from tests/class-fields.test.js
	describe("class fields", () => {
		it("class C { f = g }", () => {
			const { moduleScope } = analyze("class C { f = g }");
			const classScope = moduleScope.childScopes[0];

			expect(moduleScope.childScopes).toHaveLength(1);
			expect(classScope.type).toBe("class");
			expect(refs(classScope)).toHaveLength(0);

			// the field name `f` is not a binding
			expect(varNames(classScope)).toEqual(["C"]);

			expect(classScope.childScopes).toHaveLength(1);

			const initializerScope = classScope.childScopes[0];

			expect(initializerScope.type).toBe("class-field-initializer");

			// the scope's block is the node of the field initializer
			expect(initializerScope.block.type).toBe("Identifier");
			expect(
				/** @type {import("estree").Identifier} */ (initializerScope.block).name
			).toBe("g");

			expect(initializerScope.variableScope).toBe(initializerScope);
			expect(refNames(initializerScope)).toEqual(["g"]);
			expect(initializerScope.variables).toHaveLength(0);
		});

		it("class C { f }", () => {
			const { moduleScope } = analyze("class C { f }");
			const classScope = moduleScope.childScopes[0];

			expect(classScope.type).toBe("class");
			expect(refs(classScope)).toHaveLength(0);

			// a field without an initializer creates no scope
			expect(classScope.childScopes).toHaveLength(0);
			expect(varNames(classScope)).toEqual(["C"]);
		});

		it("class C { #f = g }", () => {
			const { moduleScope } = analyze("class C { #f = g }");
			const classScope = moduleScope.childScopes[0];

			expect(classScope.type).toBe("class");
			expect(refs(classScope)).toHaveLength(0);
			expect(varNames(classScope)).toEqual(["C"]);
			expect(classScope.childScopes).toHaveLength(1);

			const initializerScope = classScope.childScopes[0];

			expect(initializerScope.type).toBe("class-field-initializer");
			expect(refNames(initializerScope)).toEqual(["g"]);
			expect(initializerScope.variables).toHaveLength(0);
		});

		it("class C { [fname] }", () => {
			const { moduleScope } = analyze("class C { [fname] }");
			const classScope = moduleScope.childScopes[0];

			expect(classScope.type).toBe("class");
			expect(refNames(classScope)).toEqual(["fname"]);
			expect(classScope.childScopes).toHaveLength(0);
		});

		it("class C { [fname] = value }", () => {
			const { moduleScope } = analyze("class C { [fname] = value }");
			const classScope = moduleScope.childScopes[0];

			expect(classScope.type).toBe("class");

			// `value` belongs to the initializer scope, not the class scope
			expect(refNames(classScope)).toEqual(["fname"]);

			expect(classScope.childScopes).toHaveLength(1);

			const initializerScope = classScope.childScopes[0];

			expect(initializerScope.type).toBe("class-field-initializer");
			expect(refNames(initializerScope)).toEqual(["value"]);
			expect(initializerScope.variables).toHaveLength(0);
		});

		it("class C { #f = g; e = this.#f }", () => {
			const { moduleScope } = analyze("class C { #f = g; e = this.#f }");
			const classScope = moduleScope.childScopes[0];

			expect(classScope.type).toBe("class");
			expect(refs(classScope)).toHaveLength(0);
			expect(varNames(classScope)).toEqual(["C"]);
			expect(classScope.childScopes).toHaveLength(2);
			expect(scopeTypes(classScope.childScopes)).toEqual([
				"class-field-initializer",
				"class-field-initializer"
			]);
			expect(refNames(classScope.childScopes[0])).toEqual(["g"]);
			expect(classScope.childScopes[0].variables).toHaveLength(0);
			expect(refs(classScope.childScopes[1])).toHaveLength(0);
			expect(classScope.childScopes[1].variables).toHaveLength(0);
		});
	});

	// ported from tests/class-static-blocks.test.js
	describe("class static blocks", () => {
		it("class C { static { var a; let b; const c = 1; function d(){} class e {} } }", () => {
			const { ast, moduleScope } = analyze(
				"class C { static { var a; let b; const c = 1; function d(){} class e {} } }"
			);

			expect(varNames(moduleScope)).toEqual(["C"]);
			expect(moduleScope.childScopes).toHaveLength(1);

			const classScope = moduleScope.childScopes[0];

			expect(classScope.type).toBe("class");
			expect(varNames(classScope)).toEqual(["C"]);
			expect(classScope.childScopes).toHaveLength(1);

			const staticBlockScope = classScope.childScopes[0];

			expect(staticBlockScope.type).toBe("class-static-block");
			expect(scopeTypes(staticBlockScope.childScopes)).toEqual([
				"function",
				"class"
			]);
			for (const child of staticBlockScope.childScopes) {
				expect(child.upper).toBe(staticBlockScope);
			}
			expect(staticBlockScope.upper).toBe(classScope);
			expect(staticBlockScope.variableScope).toBe(staticBlockScope);

			const staticBlockNode = /** @type {EXPECTED_ANY} */ (ast.body[0]).body
				.body[0];

			expect(staticBlockNode.type).toBe("StaticBlock");
			expect(staticBlockScope.block).toBe(staticBlockNode);

			const expectedVariableNames = ["a", "b", "c", "d", "e"];

			expect(varNames(staticBlockScope)).toEqual(expectedVariableNames);
			for (const name of expectedVariableNames) {
				expect(staticBlockScope.getBinding(name)).toBe(
					staticBlockScope.variables[expectedVariableNames.indexOf(name)]
				);
			}
			for (const variable of staticBlockScope.variables) {
				expect(variable.scope).toBe(staticBlockScope);
			}
		});

		it("class C { static { function f(){} f(); } }", () => {
			const analysis = analyze("class C { static { function f(){} f(); } }");
			const { moduleScope } = analysis;

			expect(refs(moduleScope)).toHaveLength(0);
			expect(freeNames(analysis)).toEqual([]);

			const classScope = moduleScope.childScopes[0];

			expect(refs(classScope)).toHaveLength(0);
			expect(classScope.childScopes).toHaveLength(1);

			const staticBlockScope = classScope.childScopes[0];

			expect(staticBlockScope.type).toBe("class-static-block");
			expect(varNames(staticBlockScope)).toEqual(["f"]);
			expect(refNames(staticBlockScope)).toEqual(["f"]);
			expect(refs(staticBlockScope)[0].resolved).toBe(
				staticBlockScope.variables[0]
			);
			expect(staticBlockScope.variables[0].references).toHaveLength(1);
			expect(staticBlockScope.variables[0].references[0].from).toBe(
				staticBlockScope
			);
		});

		it("class C { static { a = 1; if (this.x) { var a; } } }", () => {
			const analysis = analyze(
				"class C { static { a = 1; if (this.x) { var a; } } }"
			);
			const { moduleScope } = analysis;

			expect(refs(moduleScope)).toHaveLength(0);
			expect(freeNames(analysis)).toEqual([]);

			const staticBlockScope = moduleScope.childScopes[0].childScopes[0];

			expect(staticBlockScope.type).toBe("class-static-block");

			// `var` hoists to the static block, which is a variable scope
			expect(varNames(staticBlockScope)).toEqual(["a"]);

			expect(refNames(staticBlockScope)).toEqual(["a"]);
			expect(refs(staticBlockScope)[0].resolved).toBe(
				staticBlockScope.variables[0]
			);
			expect(staticBlockScope.variables[0].references[0].from).toBe(
				staticBlockScope
			);

			// the inner block declares nothing — `var` hoisted out of it
			expect(staticBlockScope.childScopes).toHaveLength(0);
		});

		it("class C { static { if (this.x) { var a; a = 1; } } }", () => {
			const analysis = analyze(
				"class C { static { if (this.x) { var a; a = 1; } } }"
			);
			const { moduleScope } = analysis;

			expect(freeNames(analysis)).toEqual([]);

			const staticBlockScope = moduleScope.childScopes[0].childScopes[0];

			expect(varNames(staticBlockScope)).toEqual(["a"]);
			expect(staticBlockScope.childScopes).toHaveLength(0);
			expect(refNames(staticBlockScope)).toEqual(["a"]);
			expect(refs(staticBlockScope)[0].resolved).toBe(
				staticBlockScope.variables[0]
			);
			expect(staticBlockScope.variables[0].references).toHaveLength(1);
			expect(staticBlockScope.variables[0].references[0].from).toBe(
				staticBlockScope
			);
		});

		it("class C { static { const { a } = this.foo; if (this.bar) { const b = a + 1; this.baz(b); } } }", () => {
			const analysis = analyze(
				"class C { static { const { a } = this.foo; if (this.bar) { const b = a + 1; this.baz(b); } } }"
			);
			const { moduleScope } = analysis;

			expect(freeNames(analysis)).toEqual([]);

			const staticBlockScope = moduleScope.childScopes[0].childScopes[0];

			expect(staticBlockScope.childScopes).toHaveLength(1);

			const blockScope = staticBlockScope.childScopes[0];

			expect(blockScope.type).toBe("block");
			expect(varNames(staticBlockScope)).toEqual(["a"]);

			const a = staticBlockScope.variables[0];

			expect(a.references).toHaveLength(2);
			expect(a.references[0].from).toBe(staticBlockScope);
			expect(a.references[1].from).toBe(blockScope);

			expect(varNames(blockScope)).toEqual(["b"]);

			const b = blockScope.variables[0];

			expect(b.references).toHaveLength(2);
			expect(b.references[0].from).toBe(blockScope);
			expect(b.references[1].from).toBe(blockScope);

			expect(refNames(blockScope)).toEqual(["b", "a", "b"]);
			expect(refs(blockScope)[1].resolved).toBe(a);
		});

		it("class C { static { C.x; } }", () => {
			const analysis = analyze("class C { static { C.x; } }");
			const { moduleScope } = analysis;

			expect(refs(moduleScope)).toHaveLength(0);
			expect(freeNames(analysis)).toEqual([]);
			expect(varNames(moduleScope)).toEqual(["C"]);
			expect(moduleScope.variables[0].references).toHaveLength(0);

			const classScope = moduleScope.childScopes[0];

			expect(refs(classScope)).toHaveLength(0);
			expect(classScope.childScopes).toHaveLength(1);
			expect(varNames(classScope)).toEqual(["C"]);

			const staticBlockScope = classScope.childScopes[0];

			expect(staticBlockScope.type).toBe("class-static-block");
			expect(classScope.variables[0].references).toHaveLength(1);
			expect(classScope.variables[0].references[0].from).toBe(staticBlockScope);
			expect(refNames(staticBlockScope)).toEqual(["C"]);
			expect(refs(staticBlockScope)[0].resolved).toBe(classScope.variables[0]);
			expect(staticBlockScope.variables).toHaveLength(0);
		});

		it("let a; class C { static { lbl: { this.b = a } } }", () => {
			const analysis = analyze(
				"let a; class C { static { lbl: { this.b = a } } }"
			);
			const { moduleScope } = analysis;

			expect(refs(moduleScope)).toHaveLength(0);
			expect(freeNames(analysis)).toEqual([]);
			expect(moduleScope.getBinding("a")).toBe(moduleScope.variables[0]);

			const classScope = moduleScope.childScopes[0];

			expect(refs(classScope)).toHaveLength(0);

			const staticBlockScope = classScope.childScopes[0];

			expect(staticBlockScope.type).toBe("class-static-block");
			// neither the label nor the block it holds declares anything
			expect(staticBlockScope.childScopes).toHaveLength(0);
			expect(refNames(staticBlockScope)).toEqual(["a"]);
			expect(refs(staticBlockScope)[0].resolved).toBe(
				moduleScope.getBinding("a")
			);
		});

		it("class C { static { a; } }", () => {
			const analysis = analyze("class C { static { a; } }");
			const { moduleScope } = analysis;
			const staticBlockScope = moduleScope.childScopes[0].childScopes[0];

			expect(staticBlockScope.type).toBe("class-static-block");
			expect(refNames(staticBlockScope)).toEqual(["a"]);
			expect(refs(staticBlockScope)[0].resolved).toBeUndefined();
			expect(freeNames(analysis)).toEqual(["a"]);
			expect(analysis.unresolvedReferences[0].from).toBe(staticBlockScope);
		});

		it("let a; class C { static { let a; a; } static { a; let a; } }", () => {
			const { moduleScope } = analyze(
				"let a; class C { static { let a; a; } static { a; let a; } }"
			);

			expect(moduleScope.getBinding("a")).toBe(moduleScope.variables[0]);
			expect(
				/** @type {import("../lib/javascript/ScopeAnalyzer").Variable} */ (
					moduleScope.getBinding("a")
				).references
			).toHaveLength(0);

			const classScope = moduleScope.childScopes[0];

			expect(classScope.type).toBe("class");
			expect(refs(classScope)).toHaveLength(0);
			expect(scopeTypes(classScope.childScopes)).toEqual([
				"class-static-block",
				"class-static-block"
			]);
			expect(classScope.childScopes[0]).not.toBe(classScope.childScopes[1]);
			expect(classScope.childScopes[0].block).not.toBe(
				classScope.childScopes[1].block
			);
			expect(classScope.childScopes[0].upper).toBe(
				classScope.childScopes[1].upper
			);

			for (const staticBlockScope of classScope.childScopes) {
				expect(staticBlockScope.variables).toHaveLength(1);

				const variable = staticBlockScope.variables[0];

				expect(variable.scope).toBe(staticBlockScope);
				expect(variable.name).toBe("a");
				expect(variable.references).toHaveLength(1);

				const reference = variable.references[0];

				expect(reference.from).toBe(staticBlockScope);

				// the reference is inside this static block, not the other one
				expect(startOf(reference.identifier)).toBeGreaterThanOrEqual(
					startOf(staticBlockScope.block)
				);
				expect(startOf(reference.identifier)).toBeLessThan(
					/** @type {EXPECTED_ANY} */ (staticBlockScope.block).end
				);
			}
		});

		it("let a; class C { [a]; static { let a; } [a]; static { function a(){} } [a]; static { var a; } [a]; }", () => {
			const { moduleScope } = analyze(
				"let a; class C { [a]; static { let a; } [a]; static { function a(){} } [a]; static { var a; } [a]; }"
			);

			expect(moduleScope.getBinding("a")).toBe(moduleScope.variables[0]);

			const classScope = moduleScope.childScopes[0];

			expect(classScope.type).toBe("class");

			const a =
				/** @type {import("../lib/javascript/ScopeAnalyzer").Variable} */ (
					moduleScope.getBinding("a")
				);

			expect(a.references).toHaveLength(4);
			for (const reference of a.references) {
				expect(reference.from).toBe(classScope);
			}

			expect(scopeTypes(classScope.childScopes)).toEqual([
				"class-static-block",
				"class-static-block",
				"class-static-block"
			]);
			for (const staticBlockScope of classScope.childScopes) {
				expect(varNames(staticBlockScope)).toEqual(["a"]);
				expect(staticBlockScope.variables[0].references).toHaveLength(0);
			}
		});
	});

	// ported from tests/import-attributes.test.js
	describe("import attributes", () => {
		it('const type = "json"; import pkg from "./package.json" with { type: "json" };', () => {
			const { ast, globalScope, moduleScope } = analyze(
				'const type = "json"; import pkg from "./package.json" with { type: "json" };'
			);

			expect(globalScope.variables).toHaveLength(0);
			expect(globalScope.childScopes).toEqual([moduleScope]);
			expect(moduleScope.childScopes).toHaveLength(0);
			expect(varNames(moduleScope)).toEqual(["type", "pkg"]);

			const typeVariable = moduleScope.variables[0];

			expect(typeVariable.references).toHaveLength(1);
			expect(typeVariable.references[0].identifier).toBe(
				/** @type {EXPECTED_ANY} */ (ast.body[0]).declarations[0].id
			);
		});

		it('const type = "json"; export * from "./package.json" with { type: "json" };', () => {
			const { moduleScope } = analyze(
				'const type = "json"; export * from "./package.json" with { type: "json" };'
			);

			expect(moduleScope.childScopes).toHaveLength(0);
			expect(varNames(moduleScope)).toEqual(["type"]);
			expect(moduleScope.variables[0].references).toHaveLength(1);
		});

		it('const type = "json"; export { default } from "./package.json" with { type: "json" };', () => {
			const { moduleScope } = analyze(
				'const type = "json"; export { default } from "./package.json" with { type: "json" };'
			);

			expect(moduleScope.childScopes).toHaveLength(0);
			expect(varNames(moduleScope)).toEqual(["type"]);
			expect(moduleScope.variables[0].references).toHaveLength(1);
		});

		it('const type = "json"; import("./package.json", { with: { type } });', () => {
			const { ast, moduleScope } = analyze(
				'const type = "json"; import("./package.json", { with: { type } });'
			);

			expect(moduleScope.childScopes).toHaveLength(0);
			expect(varNames(moduleScope)).toEqual(["type"]);

			const typeVariable = moduleScope.variables[0];

			expect(typeVariable.references).toHaveLength(2);
			expect(typeVariable.references[0].identifier).toBe(
				/** @type {EXPECTED_ANY} */ (ast.body[0]).declarations[0].id
			);
			expect(typeVariable.references[1].identifier).toBe(
				/** @type {EXPECTED_ANY} */ (ast.body[1]).expression.options
					.properties[0].value.properties[0].value
			);
		});
	});

	// ported from tests/using-scope.test.js
	describe("`using` and `await using` block scope", () => {
		it("`using` in block scope", () => {
			const { scopes } = analyze(`
				{
					using i = 42;
					i;
				}
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "block"]);
			expect(scopes[1].variables).toHaveLength(0);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["i"]);
			expect(refNames(scope)).toEqual(["i", "i"]);
			for (const reference of refs(scope)) {
				expect(reference.resolved).toBe(scope.variables[0]);
			}
		});

		it("`await using` in block scope", () => {
			const { scopes } = analyze(`
				async function fn() {
					{
						await using i = 42;
						i;
					}
				}
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"block"
			]);
			expect(varNames(scopes[1])).toEqual(["fn"]);
			expect(varNames(scopes[2])).toEqual(["arguments"]);

			const scope = scopes[3];

			expect(varNames(scope)).toEqual(["i"]);
			expect(refNames(scope)).toEqual(["i", "i"]);
		});
	});

	// ported from tests/references.test.js
	describe("references", () => {
		/** @type {[string, string][]} */
		const declarations = [
			["let", "let a = 0;"],
			["const", "const a = 0;"],
			["var", "var a = 0;"]
		];

		for (const [kind, code] of declarations) {
			it(`the reference to a \`${kind}\` declaration in the module scope resolves`, () => {
				const { scopes, moduleScope } = analyze(code);

				expect(scopeTypes(scopes)).toEqual(["global", "module"]);
				expect(varNames(moduleScope)).toEqual(["a"]);
				expect(refs(moduleScope)).toHaveLength(1);

				const reference = refs(moduleScope)[0];

				expect(reference.from).toBe(moduleScope);
				expect(reference.identifier.name).toBe("a");
				expect(reference.resolved).toBe(moduleScope.variables[0]);
			});
		}

		/** @type {[string, string][]} */
		const inFunctions = [
			[
				"let",
				`
					let a = 0;
					function foo() {
						let b = a;
					}
				`
			],
			[
				"const",
				`
					const a = 0;
					function foo() {
						const b = a;
					}
				`
			],
			[
				"var",
				`
					var a = 0;
					function foo() {
						var b = a;
					}
				`
			]
		];

		for (const [kind, code] of inFunctions) {
			it(`the reference to a \`${kind}\` declaration inside a function resolves`, () => {
				const { scopes, moduleScope } = analyze(code);

				expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

				const scope = scopes[2];

				expect(varNames(scope)).toEqual(["arguments", "b"]);
				expect(refNames(scope)).toEqual(["b", "a"]);

				const reference = refs(scope)[1];

				expect(reference.from).toBe(scope);
				expect(reference.resolved).toBe(moduleScope.variables[0]);
			});
		}

		it("the reference in a default parameter resolves", () => {
			const { scopes, moduleScope } = analyze(`
				let a = 0;
				function foo(b = a) {
				}
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);

			const scope = scopes[2];

			expect(varNames(scope)).toEqual(["arguments", "b"]);
			expect(refNames(scope)).toEqual(["b", "a"]);
			expect(refs(scope)[1].resolved).toBe(moduleScope.variables[0]);
		});

		it("the reference to a `function` declaration resolves", () => {
			const { scopes, moduleScope } = analyze(`
				function a() {}
				a();
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "function"]);
			expect(varNames(moduleScope)).toEqual(["a"]);
			expect(refNames(moduleScope)).toEqual(["a"]);
			expect(refs(moduleScope)[0].resolved).toBe(moduleScope.variables[0]);
		});

		it("the reference to a `function` declaration inside a function resolves", () => {
			const { scopes, moduleScope } = analyze(`
				function a() {}
				function foo() {
					let b = a();
				}
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"function",
				"function"
			]);

			const scope = scopes[3];

			expect(varNames(scope)).toEqual(["arguments", "b"]);
			expect(refNames(scope)).toEqual(["b", "a"]);
			expect(refs(scope)[1].resolved).toBe(moduleScope.variables[0]);
		});

		it("the reference to a `class` declaration resolves", () => {
			const { scopes, moduleScope } = analyze(`
				class A {}
				let b = new A();
			`);

			expect(scopeTypes(scopes)).toEqual(["global", "module", "class"]);
			expect(varNames(moduleScope)).toEqual(["A", "b"]);
			expect(refNames(moduleScope)).toEqual(["b", "A"]);
			expect(refs(moduleScope)[1].resolved).toBe(moduleScope.variables[0]);
		});

		it("the reference to a `class` declaration inside a function resolves", () => {
			const { scopes, moduleScope } = analyze(`
				class A {}
				function foo() {
					let b = new A();
				}
			`);

			expect(scopeTypes(scopes)).toEqual([
				"global",
				"module",
				"class",
				"function"
			]);

			const scope = scopes[3];

			expect(varNames(scope)).toEqual(["arguments", "b"]);
			expect(refNames(scope)).toEqual(["b", "A"]);
			expect(refs(scope)[1].resolved).toBe(moduleScope.variables[0]);
		});

		/** @type {[string, string][]} */
		const inNestedFunctions = [
			[
				"let",
				`
					function foo() {
						let a = 0;
						function bar() {
							let b = a;
						}
					}
				`
			],
			[
				"var",
				`
					function foo() {
						var a = 0;
						function bar() {
							var b = a;
						}
					}
				`
			]
		];

		for (const [kind, code] of inNestedFunctions) {
			it(`the reference to a \`${kind}\` declaration in a nested function resolves`, () => {
				const { scopes } = analyze(code);

				expect(scopeTypes(scopes)).toEqual([
					"global",
					"module",
					"function",
					"function"
				]);

				const scope = scopes[3];

				expect(varNames(scope)).toEqual(["arguments", "b"]);
				expect(refNames(scope)).toEqual(["b", "a"]);
				expect(refs(scope)[1].resolved).toBe(scopes[2].variables[1]);
			});
		}

		for (const code of [
			"let [a] = [1];",
			"let {a} = {a: 1};",
			"let {a: {a}} = {a: {a: 1}};"
		]) {
			it(`"${code}", the reference should be resolved.`, () => {
				const { scopes, moduleScope } = analyze(code);

				expect(scopeTypes(scopes)).toEqual(["global", "module"]);
				expect(varNames(moduleScope)).toEqual(["a"]);
				expect(refs(moduleScope)).toHaveLength(1);

				const reference = refs(moduleScope)[0];

				expect(reference.from).toBe(moduleScope);
				expect(reference.identifier.name).toBe("a");
				expect(reference.resolved).toBe(moduleScope.variables[0]);
			});
		}

		// every binding form that writes to `a`; all of them resolve
		for (const code of [
			"var a = 0;",
			"let a = 0;",
			"const a = 0;",
			"var [a] = [];",
			"let [a] = [];",
			"const [a] = [];",
			"var [a = 1] = [];",
			"let [a = 1] = [];",
			"const [a = 1] = [];",
			"var {a} = {};",
			"let {a} = {};",
			"const {a} = {};",
			"var {b: a} = {};",
			"let {b: a} = {};",
			"const {b: a} = {};",
			"var {b: a = 0} = {};",
			"let {b: a = 0} = {};",
			"const {b: a = 0} = {};",
			"for (var a in []);",
			"for (let a in []);",
			"for (var [a] in []);",
			"for (let [a] in []);",
			"for (var [a = 0] in []);",
			"for (let [a = 0] in []);",
			"for (var {a} in []);",
			"for (let {a} in []);",
			"for (var {a = 0} in []);",
			"for (let {a = 0} in []);",
			"new function(a = 0) {}",
			"new function([a = 0] = []) {}",
			"new function({b: a = 0} = {}) {}",
			"let a; a = 0;",
			"let a; [a] = [];",
			"let a; [a = 1] = [];",
			"let a; ({a} = {});",
			"let a; ({b: a} = {});",
			"let a; ({b: a = 0} = {});",
			"let a; for (a in []);",
			"let a; for ([a] in []);",
			"let a; for ([a = 0] in []);",
			"let a; for ({a} in []);",
			"let a; for ({a = 0} in []);"
		]) {
			it(`"${code}", every reference resolves to \`a\``, () => {
				const { scopes } = analyze(code);
				const scope = scopes[scopes.length - 1];

				expect(varNames(scope)).toContain("a");
				expect(refs(scope).length).toBeGreaterThanOrEqual(1);
				for (const reference of refs(scope)) {
					expect(reference.identifier.name).toBe("a");
					expect(reference.resolved).toBeDefined();
					expect(/** @type {EXPECTED_ANY} */ (reference.resolved).name).toBe(
						"a"
					);
				}
			});
		}

		// reads of `a`, wherever they sit, resolve back to the one binding
		for (const code of [
			"let a; let b = a;",
			"let a; let [b] = a;",
			"let a; let [b = a] = [];",
			"let a; for (var b in a);",
			"let a; for (var [b = a] in []);",
			"let a; for (let b in a);",
			"let a; for (let [b = a] in []);",
			"let a,b; b = a;",
			"let a,b; [b] = a;",
			"let a,b; [b = a] = [];",
			"let a,b; for (b in a);",
			"let a,b; for ([b = a] in []);",
			"let a; a.foo = 0;",
			"let a,b; b = a.foo;"
		]) {
			it(`"${code}", the references to \`a\` resolve to its binding`, () => {
				const { moduleScope } = analyze(code);
				const a = moduleScope.variables[0];

				expect(a.name).toBe("a");
				expect(a.references.length).toBeGreaterThanOrEqual(1);
				for (const reference of a.references) {
					expect(reference.identifier.name).toBe("a");
					expect(reference.resolved).toBe(a);
				}
			});
		}
	});

	// ported from tests/implicit-global-reference.test.js, whose assertions on
	// `scope.implicit` and per-scope `through` become assertions on the one
	// list of free references the analyser keeps
	describe("free references", () => {
		it("assignments in the module scope", () => {
			const analysis = analyze(`
				var x = 20;
				x = 300;
			`);

			expect(varNames(analysis.moduleScope)).toEqual(["x"]);
			expect(analysis.moduleScope.variables[0].references).toHaveLength(2);
			expect(freeNames(analysis)).toEqual([]);
		});

		it("assignments in the module scope without definition", () => {
			const analysis = analyze(`
				x = 300;
				x = 300;
			`);

			expect(analysis.moduleScope.variables).toHaveLength(0);
			expect(freeNames(analysis)).toEqual(["x", "x"]);
		});

		it("assignment leaks", () => {
			const analysis = analyze(`
				function outer() {
					x = 20;
				}
			`);

			expect(analysis.scopes.map(varNames)).toEqual([
				[],
				["outer"],
				["arguments"]
			]);
			expect(freeNames(analysis)).toEqual(["x"]);
		});

		it("assignment doesn't leak", () => {
			const analysis = analyze(`
				function outer() {
					function inner() {
						x = 20;
					}
					var x;
				}
			`);

			expect(analysis.scopes.map(varNames)).toEqual([
				[],
				["outer"],
				["arguments", "inner", "x"],
				["arguments"]
			]);
			expect(freeNames(analysis)).toEqual([]);
		});

		it("for-in-statement leaks", () => {
			const analysis = analyze(`
				function outer() {
					for (x in y) { }
				}`);

			expect(analysis.scopes.map(varNames)).toEqual([
				[],
				["outer"],
				["arguments"]
			]);
			expect(freeNames(analysis)).toEqual(["x", "y"]);
		});

		it("for-in-statement doesn't leak", () => {
			const analysis = analyze(`
				function outer() {
					function inner() {
						for (x in y) { }
					}
					var x;
				}
			`);

			expect(analysis.scopes.map(varNames)).toEqual([
				[],
				["outer"],
				["arguments", "inner", "x"],
				["arguments"]
			]);
			expect(freeNames(analysis)).toEqual(["y"]);
		});
	});

	// ported from tests/fallback.test.js, whose `fallback: "iteration"` option
	// is the analyser's only behaviour for a node type it does not know
	describe("unknown node types", () => {
		it("keeps walking a node type it does not know", () => {
			const ast = parse("var foo = bar(baz);");

			/** @type {EXPECTED_ANY} */ (ast.body[0]).declarations[0].init.type =
				"SpecialCallExpression";

			const analysis = analyzeAst(ast);

			expect(varNames(analysis.moduleScope)).toEqual(["foo"]);
			expect(refNames(analysis.moduleScope)).toEqual(["foo", "bar", "baz"]);
			expect(freeNames(analysis)).toEqual(["bar", "baz"]);
		});

		it("resolves references found under an unknown node type", () => {
			const ast = parse(`
				let a;
				function foo() {
					return bar(a);
				}
			`);

			/** @type {EXPECTED_ANY} */ (ast.body[1]).body.body[0].argument.type =
				"SpecialCallExpression";

			const analysis = analyzeAst(ast);
			const functionScope = analysis.scopes[2];

			expect(refNames(functionScope)).toEqual(["bar", "a"]);
			expect(refs(functionScope)[1].resolved).toBe(
				analysis.moduleScope.variables[0]
			);
			expect(freeNames(analysis)).toEqual(["bar"]);
		});
	});

	describe("what a binding collects by default", () => {
		/**
		 * @param {import("../lib/javascript/ScopeAnalyzer").Scope} scope a scope
		 * @returns {Record<string, number>} how many references each binding kept
		 */
		const collected = (scope) => {
			/** @type {Record<string, number>} */
			const result = {};
			for (const variable of scope.variables) {
				result[variable.name] = variable.references.length;
			}
			return result;
		};

		it("collects the references of a module-scope binding", () => {
			const { moduleScope } = analyzeScope(
				parse(`
					let a = 0;
					function f() { return a + a; }
				`)
			);

			expect(collected(moduleScope)).toEqual({ a: 3, f: 0 });
		});

		it("collects the references of a direct child of the module scope", () => {
			// the class name is bound twice, and `getAllReferences` reads the
			// inner binding through `moduleScope.childScopes`
			const { moduleScope } = analyzeScope(
				parse(`
					class C { m() { return C; } }
					C;
				`)
			);
			const classScope = moduleScope.childScopes[0];

			expect(collected(moduleScope)).toEqual({ C: 1 });
			expect(collected(classScope)).toEqual({ C: 1 });
		});

		const nested = `
			function f() {
				function g() {
					let b = 0;
					return b + b;
				}
				return g;
			}
		`;

		it("resolves a deeper reference without collecting it", () => {
			const analysis = analyzeScope(parse(nested));
			const inner = analysis.moduleScope.childScopes[0].childScopes[0];

			expect(collected(inner)).toEqual({ arguments: 0, b: 0 });
			expect(analysis.unresolvedReferences).toHaveLength(0);
		});

		it("collects every reference when asked to", () => {
			const analysis = analyzeScope(parse(nested), true);
			const inner = analysis.moduleScope.childScopes[0].childScopes[0];

			expect(collected(inner)).toEqual({ arguments: 0, b: 3 });
		});
	});

	describe("scopes a block only when it declares something", () => {
		it("gives a block with a lexical declaration a scope", () => {
			const { scopes } = analyze("{ let a; a; }");

			expect(scopeTypes(scopes)).toEqual(["global", "module", "block"]);
			expect(varNames(scopes[2])).toEqual(["a"]);
		});

		it("gives a block holding only `var` no scope of its own", () => {
			const { scopes, moduleScope } = analyze("{ var a; a; }");

			expect(scopeTypes(scopes)).toEqual(["global", "module"]);
			expect(varNames(moduleScope)).toEqual(["a"]);
			expect(refNames(moduleScope)).toEqual(["a"]);
		});

		it("gives a switch with a lexical declaration a scope", () => {
			const { scopes } = analyze("switch (x) { case 1: let a; a; }");

			expect(scopeTypes(scopes)).toEqual(["global", "module", "switch"]);
			expect(varNames(scopes[2])).toEqual(["a"]);
		});

		it("gives a switch that declares nothing no scope", () => {
			const { scopes } = analyze("switch (x) { case 1: y; }");

			expect(scopeTypes(scopes)).toEqual(["global", "module"]);
		});

		it("scopes a block whose statement type it does not know", () => {
			const ast = parse("{ x; }");
			const block = /** @type {EXPECTED_ANY} */ (ast.body[0]);

			block.body[0].type = "SpecialDeclaration";

			const { scopes } = analyzeAst(ast);

			// the unknown statement might declare, so the block keeps a scope
			expect(scopeTypes(scopes)).toEqual(["global", "module", "block"]);
		});
	});
});

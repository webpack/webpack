/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/*
 * webpack analysed scopes with eslint-scope until lib/javascript/ScopeAnalyzer.js
 * replaced it. This file keeps eslint-scope as a reference implementation: every
 * case is analysed by both over the *same* AST, and the two must agree on the
 * scope tree, on what each scope binds, and on which binding every identifier
 * resolves to. A change to the analyser that drifts from the reference fails
 * here rather than in a user's bundle.
 *
 * ScopeAnalyzer.unittest.js states the analyser's own contract with hand-written
 * expectations; this file states that the contract is still eslint-scope's.
 *
 * The reference needs a newer Node than webpack itself supports, so the suite
 * skips below that — the built-in analyser is covered on every version by
 * ScopeAnalyzer.unittest.js, which depends on nothing.
 */

const fs = require("fs");
const path = require("path");
const JavascriptParser = require("../lib/javascript/JavascriptParser");
const analyzeScope = require("../lib/javascript/ScopeAnalyzer");
const supportsEslintScope = require("./helpers/supportsEslintScope");

/** @import { Program } from "estree" */
/** @import { AnalyzeOptions, GlobalScope } from "eslint-scope" */

/**
 * The only thing this file reads of a node is its source offset, so the
 * narrowest shape either analyser emits is enough. It has to be this narrow:
 * eslint-scope types a reference's identifier as `Identifier | JSXIdentifier`,
 * and a JSX node is not an estree `Node`.
 * @typedef {{ type: string }} AnyNode
 */

/**
 * Each analyser builds its own classes, but every field this file reads exists
 * on both. These typedefs are that shared surface.
 * @typedef {object} AnyScope
 * @property {string} type what opened the scope
 * @property {AnyNode} block the node that opened it
 * @property {AnyScope[]} childScopes the scopes nested in it
 * @property {AnyVariable[]} variables the bindings it declares
 */

/**
 * @typedef {object} AnyVariable
 * @property {string} name the declared name
 * @property {AnyNode[]} identifiers declaring occurrences
 * @property {AnyReference[]} references occurrences that resolved here
 * @property {AnyScope} scope the declaring scope
 */

/**
 * @typedef {object} AnyReference
 * @property {AnyNode} identifier the identifier node
 * @property {AnyVariable | null | undefined} resolved the binding it resolved to, absent when free
 */

/**
 * The options webpack passed eslint-scope before the replacement, so the
 * reference is the analyser webpack actually shipped rather than eslint's
 * defaults. Three of them matter here:
 *
 * - `sourceType` is always `module`: the built-in analyser analyses generated
 *   module sources and so has no script mode, whatever a case parsed as.
 * - `optimistic` closes a dynamic scope statically, so a `with` body resolves
 *   against the enclosing scopes instead of dropping every name.
 * - `ignoreEval` stops a direct `eval()` call from making its enclosing scopes
 *   dynamic, which under eslint's defaults leaves the whole chain unresolved.
 *
 * `fallback` is this file's own, and covers nothing today: it keeps the two
 * agreeing on syntax eslint-scope's visitor keys have not caught up with,
 * which the built-in analyser walks rather than drops.
 * @type {AnalyzeOptions}
 */
const REFERENCE_OPTIONS = {
	ecmaVersion: 6,
	sourceType: "module",
	optimistic: true,
	ignoreEval: true,
	impliedStrict: true,
	fallback: "iteration"
};

/**
 * @param {AnyNode} node any node
 * @returns {number} its start offset
 */
const startOf = (node) => /** @type {EXPECTED_ANY} */ (node).start;

/**
 * Identifies a binding by where it was declared. Both analyses run over one
 * AST, so a node offset names the same node on either side.
 * @param {AnyVariable} variable a binding
 * @returns {string} a key equal for the same binding in both analyses
 */
const bindingKey = (variable) =>
	`${variable.scope.type}@${startOf(variable.scope.block)}:${variable.name}`;

/**
 * A scope that binds nothing changes no resolution — only the tree's shape and
 * a reference's `from`. The built-in analyser exploits that and skips one for a
 * block or a switch that declares nothing, where eslint-scope always opens one,
 * so both trees are pruned of them before they are compared.
 * @param {AnyScope} scope a scope
 * @returns {boolean} true when it can be dropped without changing resolution
 */
const bindsNothing = (scope) =>
	(scope.type === "block" || scope.type === "switch") &&
	scope.variables.length === 0;

/**
 * @param {AnyScope} scope scope to normalize
 * @returns {EXPECTED_ANY} a plain, comparable view of it
 */
const normalizeScope = (scope) => {
	/** @type {EXPECTED_ANY[]} */
	const children = [];
	for (const child of scope.childScopes) {
		const normalized = normalizeScope(child);
		if (bindsNothing(child)) children.push(...normalized.children);
		else children.push(normalized);
	}
	return {
		type: scope.type,
		block: `${scope.block.type}@${startOf(scope.block)}`,
		variables: scope.variables.map((variable) => ({
			name: variable.name,
			// `arguments` is implicit, so it declares no identifier
			identifiers: variable.identifiers.map(startOf).sort((a, b) => a - b),
			// the two walk a pattern in a different order, so compare as a set
			references: variable.references
				.map((reference) => startOf(reference.identifier))
				.sort((a, b) => a - b)
		})),
		children
	};
};

/**
 * Every identifier occurrence that was read, against the binding it resolved
 * to. This is the part of the analysis webpack acts on, and it is insensitive
 * to the tree's shape and to walk order.
 * @param {AnyScope} root the outermost scope
 * @param {AnyReference[]} free the references that resolved to no binding
 * @returns {Record<number, string[]>} offset of each identifier read, to what it resolved to
 */
const resolutions = (root, free) => {
	/** @type {Map<number, string[]>} */
	const map = new Map();
	/**
	 * @param {AnyReference} reference reference to record
	 * @returns {void}
	 */
	const add = (reference) => {
		const offset = startOf(reference.identifier);
		// a name in a nested default is read once per enclosing default, so the
		// same identifier can be recorded more than once
		const value = reference.resolved ? bindingKey(reference.resolved) : "free";
		const seen = map.get(offset);
		if (seen === undefined) map.set(offset, [value]);
		else seen.push(value);
	};
	/**
	 * @param {AnyScope} scope scope to walk
	 * @returns {void}
	 */
	const walk = (scope) => {
		for (const variable of scope.variables) {
			for (const reference of variable.references) add(reference);
		}
		for (const child of scope.childScopes) walk(child);
	};
	walk(root);
	for (const reference of free) add(reference);

	/** @type {Record<number, string[]>} */
	const out = {};
	for (const [offset, values] of [...map].sort((a, b) => a[0] - b[0])) {
		out[offset] = values.sort();
	}
	return out;
};

/**
 * @param {string} code source code
 * @param {"module" | "script" | "auto"} sourceType how to parse it
 * @returns {EXPECTED_ANY} the two analyses, normalized
 */
const analyzeBoth = (code, sourceType) => {
	// required here rather than at the top: on a Node the suite skips, loading
	// the reference is what would throw
	const eslintScope = require("eslint-scope");

	// eslint-scope reads `range` to tell a function's parameter list from its
	// body, so the parse has to serve it
	const ast = /** @type {Program} */ (
		JavascriptParser._parse(code, { sourceType, ranges: true }).ast
	);

	// webpack reads references back from the module scope alone; the reference
	// records them everywhere, so ask for the same
	const ours = analyzeScope(ast, true);
	const theirs = /** @type {GlobalScope} */ (
		eslintScope.analyze(ast, REFERENCE_OPTIONS).globalScope
	);

	return {
		ours: {
			tree: normalizeScope(/** @type {AnyScope} */ (ours.globalScope)),
			resolutions: resolutions(
				/** @type {AnyScope} */ (ours.globalScope),
				ours.unresolvedReferences
			)
		},
		theirs: {
			tree: normalizeScope(/** @type {AnyScope} */ (theirs)),
			resolutions: resolutions(/** @type {AnyScope} */ (theirs), theirs.through)
		}
	};
};

/**
 * @param {string} code source code
 * @param {"module" | "script"=} sourceType how to parse it
 * @returns {void}
 */
const expectAgreement = (code, sourceType = "module") => {
	const { ours, theirs } = analyzeBoth(code, sourceType);

	expect(ours.tree).toEqual(theirs.tree);
	expect(ours.resolutions).toEqual(theirs.resolutions);
};

/**
 * A case is source code, or source code plus the way it has to be parsed —
 * `with`, a sloppy-mode function declaration and a redeclared function are
 * script-only syntax, and are still analysed as a module by both sides.
 * @typedef {string | [string, "module" | "script"]} Case
 */

/** @type {Record<string, Record<string, Case>>} */
const CASES = {
	"scope kinds": {
		"a module body": "var a = 1; a;",
		"a block that declares something": "{ let i = 20; i; }",
		"a block that declares nothing": "{ ; } { debugger; } { l: m; }",
		"nested blocks shadowing one name": "let x; { let x; { let x; x; } x; } x;",
		"a switch with a lexical declaration in a case":
			"switch (a) { case b: let c = 1; c; break; default: d; }",
		"a catch clause": "try { a } catch (e) { e } finally { c }",
		"a catch clause without a parameter": "try { a } catch { b }",
		"a catch clause taking a pattern":
			"try { a } catch ({ m, s: [t] = u }) { m; t; }",
		"a lexical for loop head":
			"for (let i = 0; i < 10; i++) { setTimeout(() => i); }",
		"a var for loop head": "for (var i = 0; i < n; i++) i;",
		"a while and a do-while body":
			"while (a) { let b = a; } do { let c; } while (c);",
		"a with body": ["with (obj) { a; }", "script"],
		"a named function expression": "(function foo() { return foo; });",
		"a named function expression shadowing its own name":
			"(function foo() { var foo; return foo; });",
		"a class field initializer": "class C { f = g; static s = h; }",
		"a class static block": "class C { static { x; } }",
		"a class static block reading a private method":
			"class C { static #m() {} static { C.#m(); } }",
		"an arrow function body": "var arrow = a => a;",
		"a labeled block": "label: { let a; break label; }"
	},

	"bindings and hoisting": {
		"a var hoists out of a block that binds something": "{ let a; var b; } b;",
		"a var hoists out of an if branch":
			"function f() { if (x) { let a; var b = 1; } return b; }",
		"a var hoists out of a switch case":
			"switch (a) { case 1: { let c; var d; } } d;",
		"a var hoists out of try and catch":
			"try { let a; var b; } catch { let c; var d; } b; d;",
		"a var hoists out of a for-of body":
			"for (const i of x) { let k; var j; } j;",
		"a var hoists out of both branches of an if":
			"if (a) { var b; } else { var c; } b; c;",
		"a class declaration in a block": "{ class C {} var v; } v; C;",
		"a function declaration is block scoped":
			"{ function test() {} test(); } test();",
		"a function declaration in a sloppy-mode if": [
			"if (a) function f() {}",
			"script"
		],
		"a var redeclared in a nested block": "var a; { var a; } a;",
		"a var and a function declaration under one name": [
			"var a; function a() {} a;",
			"script"
		],
		"a function declaration hoisted over a var in its body":
			"(function () { var a; function a2() {} return a2; })();",
		"a let read before its declaration": "{ i; let i = 20; i; }",
		"a let initialized from its own name": "let a = a;",
		"an implicit arguments binding":
			"function f() { return arguments; } const g = () => arguments;",
		"an arguments binding read from a nested arrow":
			"function f() { return () => arguments; }",
		"a nested var and let of the same name":
			"function f() { { let a; var a2; { let b; var b2; } } return a2 + b2; }"
	},

	"parameters and defaults": {
		"a default reading an outer binding": "let a; function foo(b = a) {}",
		"a default reading a later parameter": "let a; function foo(b = a, a) {}",
		"a default that the body shadows": "let a; function foo(b = a) { let a; }",
		"a default whose nested function the body shadows":
			"let a; function foo(b = function () { a }) { let a; }",
		"a parameter the body redeclares with var":
			"function f(x) { var x = 1; return x; }",
		"a default reading a parameter declared after it":
			"function f(a = b, b = 1) { let c; return a; }",
		"a default reading a function the body declares":
			"function f(x = y) { function y() {} return x; }",
		"a default in an arrow that the body shadows":
			"const g = (a = b) => { let b; return a; };",
		"a default closing over an earlier parameter":
			"function f(a, b = () => a) { let a2; return b; }",
		"a default in a method that the body shadows":
			"class C { m(a = x) { let x; } }",
		"a default in a nested function reading the outer body":
			"function outer() { function inner(p = q) { var q; } var q; }",
		"a destructured parameter with defaults and a rest element":
			"function f(a, b = a, [c, d = c] = a, ...rest) { var a2; return a + c; }",
		"a destructured parameter defaulting to an object":
			"function f({ a = 1, b = a } = {}, c = b) {}",
		"a deeply nested destructured parameter":
			"function f([{ a: [b = c] = d }] = e) { return b; }",
		"an arrow with several parameters": "var arrow = (a, b, c, d) => {}"
	},

	"destructuring patterns": {
		"an array pattern in var": "(function () { var [a, b, c] = array; }());",
		"a rest element in var":
			"(function () { var [a, b, ...rest] = array; }());",
		"a nested rest element in var":
			"(function () { var [a, b, ...[c, d, ...rest]] = array; }());",
		"an object pattern in var":
			"(function () { var { shorthand, key: value, hello: { world } } = object; }());",
		"a complex pattern in var":
			"(function () { var { shorthand, key: [a, b, c], hello: { world } } = object; }());",
		"a default in an array pattern in var":
			"(function () { var [a, b, c, d = 20] = array; }());",
		"a default reading a free name in var":
			"(function () { var [a, b, c, d = e] = array; }());",
		"nested defaults in var":
			"(function () { var [a, b, [c, d = e] = f] = array; }());",
		"a nested object pattern with defaults":
			"var { a: { b: [c = d] = e } = f } = g;",
		"a computed key in an object pattern": "var { [k]: v } = o;",
		"an array pattern in an assignment":
			"(function () { [a, b, c] = array; }());",
		"a member expression in a destructuring assignment":
			"(function () { var obj; [obj.a, obj.b, obj.c] = array; }());",
		"an object pattern in an assignment":
			"(function () { ({ shorthand, key: value, hello: { world } } = object); }());",
		"a rest element in an assignment":
			"(function () { [a, b, ...rest] = array; }());",
		"a rest element onto a member expression":
			"(function () { [a, b, ...obj.rest] = array; }());",
		"a hole and a rest element in an assignment": "[a, , b, ...c] = arr;",
		"a rest property in an assignment": "({ a, b: c, ...rest } = obj);",
		"a shorthand default in an assignment":
			"var a; ({ a } = b); ({ a = c } = d);",
		"a literal computed key in an assignment": "({ ['a']: b } = c);",
		"a pattern in a var for-in head":
			"(function () { for (var [a, b, c] in array); }());",
		"a pattern in a let for-of head": "for (let [a, b = c] of d);",
		"a pattern with defaults in a var for-in head":
			"(function () { for (var [a, b, c = d] in array); }());",
		"a pattern with nested defaults in a let for-in head":
			"(function () { for (let [a, [b, c = d] = e] in array); }());",
		"a pattern declared apart from the for-in head":
			"(function () { var a, b, c; for ([a, b, c = d] in array); }());",
		"a member expression in a for-of head": "for ([a.b, c] of d);",
		"a bare identifier in a for-of head": "for (a of b);",
		"a rest property and a rest element in declarations":
			"const { a, ...rest } = obj; const [b, ...others] = arr;"
	},

	classes: {
		"a class declaration and its heritage":
			"class Derived extends Base { constructor() {} } new Derived();",
		"a named class expression":
			"(class Derived extends Base { constructor() {} });",
		"an anonymous class expression":
			"(class extends Base { constructor() {} });",
		"a computed method key reading an outer binding":
			"(function () { var k = 42; (class { [k]() {} [k + 40]() {} }); }());",
		"a class expression whose heritage names itself":
			"const A = class A extends A {};",
		"a class expression assigning its own name in its heritage":
			"let foo; (class C extends (foo = C, class {}) {});",
		"a class declaration assigning its own name in its heritage":
			"let foo; class C extends (foo = C, class {}) {} new C();",
		"a function expression in a class heritage":
			"class C extends function () {} {}",
		"a class in a class heritage":
			"class C extends (class D { static { E; } }) {}",
		"a computed field and a computed static method":
			"class C { [k] = v; static [k2]() {} get a() {} set a(v2) {} }",
		"a private field read from a method":
			"class C { #p = 1; m() { return this.#p } }",
		"an accessor pair with computed keys":
			"const o = { get [k]() {}, set [k](v) {} };"
	},

	"imports and exports": {
		"every import form":
			"import a, { b as c } from 'm'; import * as ns from 'n'; a; c; ns;",
		"an import with attributes": "import x from 'm' with { type: 'json' }; x;",
		"a dynamic import with attributes":
			"const p = import('m', { with: { type: 'json' } });",
		"a dynamic import in an expression": "import('m').then(x => x);",
		"an exported var declaration": "export var v;",
		"a default exported function declaration":
			"export default function f() {};",
		"a default exported anonymous function": "export default function () {};",
		"a default exported anonymous class":
			"export default class extends Base {};",
		"a default exported expression": "export default 1 + a;",
		"an export specifier list": "const x = 1; export { x };",
		"a renaming export specifier": "const v = 1; export { v as x };",
		"a string export name": "var a; export { a as 'str' };",
		"a re-export from another source": "export { x } from 'mod';",
		"a star re-export": "export * from 'o';",
		"a namespace re-export": "export * as p from 'q';",
		"every exported declaration form":
			"export function f() {} export class C {} export let l; export var v2; export const c2 = 1;"
	},

	"references and expressions": {
		"a compound assignment and an update expression":
			"x = 1; x += 2; x++; --x;",
		"a compound assignment onto a member expression": "a.b += c; a.b++;",
		"a logical assignment": "a ||= b; c &&= d; e ??= f;",
		"a computed and a non-computed member read": "a.b; a[c];",
		"an optional chain": "a?.b?.[c]?.(d);",
		"a unary and a sequence expression":
			"delete a.b; typeof c; void d; (a, b, c);",
		"an object literal with every property form":
			"obj = { a, b: c, [d]: e, f() {}, get g() {}, set h(i) {}, ...j };",
		"an array literal with a hole and a spread": "arr = [a, , b, ...c];",
		// eslint-disable-next-line no-template-curly-in-string -- the fixture is a template
		"a template literal and a tagged template": "`${a}${b.c}`; tag`${d}`;",
		"a label on a loop and its break":
			"q: for (;;) { break q; } r: while (1) { continue r; }",
		"nested labels":
			"outer: for (const a of b) { inner: for (const c of d) { continue outer; break inner; } }",
		"a labeled statement whose body reads a binding":
			"var foo = 5; label: while (true) { console.log(foo); break; }",
		"a direct eval call": "const a = 1; function f() { eval('a'); return a; }",
		"new.target and import.meta":
			"function f() { new.target; } import.meta.url;",
		"a generator and a delegating yield":
			"function* g() { yield a; yield* b; }",
		"a for-await loop": "async function h() { for await (const x of y) x; }",
		"an async generator method":
			"const o = { async *m() { await a; yield b; } };",
		"nested arrows capturing this": "function f() { return () => () => this; }",
		"a using declaration": "using a = b;",
		"an await using declaration":
			"async function f() { { await using c = d; } }",
		"literals that bind nothing": "var re = /a/g; 1n; 0.1;",
		"a throw statement": "throw a;",
		"every function form in one declaration":
			"var a = function () {}, b = class {}, c = () => {};"
	}
};

const describeIfSupported = supportsEslintScope() ? describe : describe.skip;

describeIfSupported("ScopeAnalyzer matches eslint-scope", () => {
	for (const [group, cases] of Object.entries(CASES)) {
		describe(group, () => {
			for (const [name, entry] of Object.entries(cases)) {
				it(name, () => {
					if (Array.isArray(entry)) expectAgreement(entry[0], entry[1]);
					else expectAgreement(entry);
				});
			}
		});
	}

	describe("over webpack's own sources", () => {
		/**
		 * @param {string} dir directory to walk
		 * @param {string[]} into collected file paths
		 * @returns {string[]} the collected file paths
		 */
		const collect = (dir, into) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) collect(full, into);
				else if (entry.name.endsWith(".js")) into.push(full);
			}
			return into;
		};

		const root = path.resolve(__dirname, "..");

		for (const dir of ["lib", "hot", "tooling"]) {
			// one case per directory: a file each would be thousands of them, and
			// the offending file's path is in the failure either way
			it(`${dir}/`, () => {
				const files = collect(path.join(root, dir), []);

				expect(files.length).toBeGreaterThan(0);

				for (const file of files) {
					const code = fs.readFileSync(file, "utf8");
					const { ours, theirs } = analyzeBoth(code, "auto");
					const label = path.relative(root, file);

					expect({ file: label, ...ours }).toEqual({ file: label, ...theirs });
				}
			});
		}
	});
});

"use strict";

// cspell:ignore fnames

const { load } = require("../../lib/javascript/syntax").printer;

// Sources reaching each corner of the printer: parentheses it keeps or drops,
// comments around them, directives, literals, modules and classes.
const SOURCES = [
	"/*!a*/\nfunction f(){return /*x*/ 1e999+(a,b)}",
	'var a = {b:1, "c d": [1,,2,], [e]: f, get g(){return 1}, h(){}, ...i, 1e3: 2, 0x10: 3};',
	"class A extends B { #x = 1; static m(){ return #x in this } static { a } get [k](){} 'q'(){} static async *g(){} }",
	'import a, {b as c, "d" as e} from "f" with {type: "json"}; export * from "g"; export * as h from "i"; export {a as "z"}; export * as "*" from "j"; import * as ns from "k"; import "l";',
	"export default function(){}",
	"export default (function f(){});",
	"export default (class C {}).name",
	"let x = `a${b}c${`d${e}`}`; tag`x\\u{41}${y}\\n`; new (a.b().c)(); new (a().b); (function(){})(); (()=>{})(); !function(){}();",
	"for (var i = (a in b); i;) {} for (const k of (a, b)) ; for (x = (1 in o);;) {}",
	"a = b ? c : d; (a, b) ? c : d; a ?? (b || c); (a ?? b) || c; a ** -b; (-a) ** b; async () => { await (a, b); (await x) ** 2 }",
	"function* g(){ yield; yield a; yield* b; x = yield c; (yield d) + 1 }",
	"label: for(;;) { continue label; break label } lbl: ; do x(); while (y); with (o) p;",
	"switch (a) { case 1: b(); default: c() } switch (x) {} try { a } catch { b } finally { c }",
	"if (a) { if (b) c; } else d; if (a) for (;;) if (b) c; else d;",
	"var {a, b: {c = 1}, ...d} = e; ({a, b: c} = d); [(a), [b], ...c] = d; function f({ 'q': r, [s]: t = 1 }, [u = 2], ...v) {}",
	"x = { a, b: b, 'd': d, async e() {}, *f() {}, get h() {}, set h(v) {}, __proto__: p, ['__proto__']: q, __proto__ }",
	"a?.b; a?.[b]; a?.(); (a?.b).c; function t() { new.target } import('x'); import('y', {with: {}});",
	"'use strict'; 'use asm'; function f(){ 'use asm'; return 0x10 + 1.50 } ('not a directive'); 'x'",
	"var re = /a\\/b[/]c/gimsuy, x = /<\\/script>/, y = a in /x/; z = 1..toString() + 1.5.toFixed() + 0x10.x + 017.x;",
	"a = 1n + 0x1Fn + 1_000n; b = 1_000_000; c = .5; e = 0.0001; f = 1e-7;",
	"x = \"a'b\" + 'c\"d' + 'e\\nf' + '\\u2028' + '\\0' + '</script>' + '<!--' + '-->';",
	"(let)[0] = 1; for ((let).x of y); for ((async) of x);",
	"(a, b); x = (1, 2); f((a, b)); [(a, b)]; ({a: (b, c)}); a[(b, c)]; (a, b).c; void (a, b)",
	"c = () => ({}); d = () => ({}).x; e = async x => x; g = (...a) => a; h = ([a]) => a; i = () => { return }",
	"x = typeof typeof a; y = - -a; v = a - -b; t = a-- > b; s = !--a; r = a < !--b",
	"/** @license abc */ var a = 1; // trailing\n/*! keep */ function f(/* p */ a /* q */) { return /* r */ (\n a) } /* end */",
	"function f() { return ( // c\n a + b ) } function g() { throw /*x*/ new Error() } h(/*! a */ x, /* b */ y)",
	"#!/usr/bin/env node\n'use strict'; console.log(1)",
	"({}).x; ({} = a); ({}) ? 1 : 2; if (a) function f(){} ; if (c) { let x = 1; }",
	"o = { if: 1, class: 2, 'a-b': 3, 1: 4, '01': 5, ' ': 7 }; o.if; o['a-b']; o['1'];",
	"x = /*@__PURE__*/ f(); y = (/* a */ (b, c) /* d */); z = (/* e */ g) /* f */ (h)"
];

// What each source is printed with: the stream's options and a module.
const OPTION_SETS = {
	"no comments": { format: { comments: false } },
	"the default comments": {},
	"every comment": { format: { comments: "all" } },
	"a module": { module: true, format: { comments: "all" } },
	"ECMAScript 2020": { ecma: 2020, format: { comments: "all" } },
	"quoting options": {
		format: {
			quote_style: 3,
			keep_quoted_props: true,
			keep_numbers: true,
			ascii_only: true
		}
	},
	"a source map": { sourceMap: { asObject: true }, format: { comments: "all" } },
	"a source map holding its source": {
		module: true,
		sourceMap: { includeSources: true, url: "inline", filename: "out.js" },
		format: { preamble: "/* p */", quote_style: 3, keep_quoted_props: true }
	},
	"wrapping options": {
		format: {
			wrap_iife: true,
			wrap_func_args: true,
			webkit: true,
			semicolons: false,
			preserve_annotations: true,
			ie8: true,
			safari10: true,
			preamble: "/* p */"
		}
	}
};

/**
 * Minifies a source with `printTree` counted.
 * @param {import("../../lib/javascript/syntax-printer").MinifySources} input the source, or the sources by name
 * @param {import("../../lib/javascript/syntax-printer").MinifyOptions} options the options
 * @param {boolean} fromTree whether the tree printer may print it
 * @returns {Promise<{ code: string | undefined, map: import("../../lib/javascript/syntax-printer").MinifyOutput["map"], printedFromTree: number }>} the code, its source map, and how often the tree printer printed
 */
const minifyCounted = async (input, options, fromTree) => {
	const { minify, modules } = await load();
	const { printTree, treePrinting } = modules;
	let printedFromTree = 0;
	modules.printTree = (/** @type {EXPECTED_ANY[]} */ ...args) => {
		printedFromTree++;
		return printTree(...args);
	};
	treePrinting.enabled = fromTree;
	try {
		const { code, map } = await minify(input, options);
		return { code, map, printedFromTree };
	} finally {
		modules.printTree = printTree;
		treePrinting.enabled = true;
	}
};

describe("JavaScript minifier printing a SyntaxTree", () => {
	for (const [name, set] of Object.entries(OPTION_SETS)) {
		it(`should print what terser's tree prints, with ${name}`, async () => {
			for (const source of SOURCES) {
				const options = () => ({
					...JSON.parse(JSON.stringify(set)),
					compress: false,
					mangle: false
				});
				const reference = await minifyCounted(source, options(), false).catch(
					(/** @type {Error} */ error) => error
				);
				if (reference instanceof Error) {
					// A module refuses what a script reads, both ways alike.
					await expect(minifyCounted(source, options(), true)).rejects.toThrow(
						reference.message
					);
					continue;
				}
				const printed = await minifyCounted(source, options(), true);
				expect(reference.printedFromTree).toBe(0);
				expect(printed.printedFromTree).toBe(1);
				expect(printed.code).toBe(reference.code);
				expect(printed.map).toEqual(reference.map);
			}
		});
	}

	it("should read a single named source under its name", async () => {
		const options = { compress: false, mangle: false };
		const printed = await minifyCounted({ "a.js": "a( 1 )" }, options, true);
		expect(printed).toEqual({ code: "a(1);", printedFromTree: 1 });
	});

	it("should throw the parse error terser's tree throws", async () => {
		const options = { compress: false, mangle: false };
		await expect(minifyCounted("a(", options, true)).rejects.toThrow(
			/Unexpected token/
		);
		await expect(minifyCounted("a(", options, false)).rejects.toThrow(
			/Unexpected token/
		);
	});

	it.each([
		["compressed", { compress: {}, mangle: false }],
		[
			"mangling its properties",
			{ compress: false, mangle: { properties: true } }
		],
		["mangled with a name cache", { compress: false, nameCache: {} }],
		["mangled for IE8", { compress: false, mangle: { ie8: true } }],
		["mangled for Safari 10", { compress: false, mangle: { safari10: true } }],
		[
			"keeping names a global regular expression matches",
			{ compress: false, mangle: { keep_fnames: /a/g } }
		],
		["wrapped", { compress: false, mangle: false, wrap: "w" }],
		["enclosed", { compress: false, mangle: false, enclose: true }],
		["handed back", { compress: false, mangle: false, format: { ast: true } }],
		[
			"handed back as ESTree",
			{ compress: false, mangle: false, format: { spidermonkey: true } }
		],
		[
			"filtered by a callback",
			{ compress: false, mangle: false, format: { comments: () => true } }
		]
	])("should print terser's tree of a source %s", async (_name, options) => {
		const printed = await minifyCounted("a( 1 )", options, true);
		expect(printed.printedFromTree).toBe(0);
	});

	it("should print terser's tree of several sources", async () => {
		const options = { compress: false, mangle: false };
		const printed = await minifyCounted({ "a.js": "a()", "b.js": "b()" }, options, true);
		expect(printed).toEqual({ code: "a();b();", printedFromTree: 0 });
	});

	it("should print terser's tree with the correct or improve phase off", async () => {
		const { corrections, improvements } = await load();
		const options = { compress: false, mangle: false };
		for (const phase of [corrections, improvements]) {
			/** @type {{ enabled: boolean }} */ (phase).enabled = false;
			try {
				const printed = await minifyCounted("a( 1 )", options, true);
				expect(printed.printedFromTree).toBe(0);
			} finally {
				/** @type {{ enabled: boolean }} */ (phase).enabled = true;
			}
		}
	});
});

// Sources reaching each corner of the mangler's scopes: parameters, hoisting
// and Annex B, `eval` and `with`, labels, catch parameters and private names.
const MANGLE_SOURCES = [
	"function f(a, b = a, {c, d: [e = b] = []}, ...g) { var h = a + c; let i = () => h * e; return function j(k) { return i(k) + g.length + arguments.length } }",
	"var x = 1; { let x = 2; { const y = x; function z() { return y } } } try { a() } catch (x) { var x = 3; let w = x } try {} catch ({ message: m, ...rest }) { m + rest } try {} catch { b }",
	"function e(x) { eval(x); var b = 1; function c() { return b } } function n() { new eval(1); f(eval) } function w(o) { with (o) { var p = q } return p }",
	"outer: for (var i in o) { inner: for (const [k, v] of i) { if (k) continue outer; break inner } } l1: { l2: { break l1 } }",
	"class A { #a = 1; static #b; #m() { return this.#a } static s() { return #b in A } get [k]() { return this?.#a } static { var x = 1; } } new class B extends A {}",
	"class C { #x; #y; e() { switch (this.#y) { case this.#x: eval('this.#x') } } }",
	"class K { #a; m() { eval('') } } class L { #z; n() { return this.#z } }",
	"switch (a) { case b: let c = 1; function d() { return c } default: { function d2() {} } } for (let i = 0, j; i < j; i++) { (() => i)() } for (var k of l) k; while (m) { let n = m-- } do { var o } while (0)",
	"(function () { 'use strict'; { function f() {} } })(); { function h() {} } async function* gen() { yield await gen; { async function a() {} } }",
	"{ let f1; { function f1() {} } } switch (a) { case 1: let f2; { function f2() {} } } for (let f3;;) { function f3() {} } for (const f4 in o) { function f4() {} } try {} catch ({ f5 }) { { function f5() {} } } try {} catch (e) { let f6; { function f6() {} } }",
	"for (;;) { { function g1() {} } } for (x in o) { { function g2() {} } } try {} catch (e) { { function g3() {} } }",
	"{ class f7 {} { function f7() {} } } let f8; { function f8() {} } function p(a, { b, ...c }, [, d = 1], ...f9) { { function f9() {} } } function q() { var f10; let f11; { function f11() {} } }",
	"var f = function () {}, g = () => 1, h = function named() {}, [i] = [function () {}], { j } = {}; { using r = null } label: function k() {}",
	"function c() { var Apple = class {}, berry = class { m() {} }, Cat = class Named {}, [Dog] = [class {}]; { using Elk = class {} } return [Apple, berry, Cat, Dog] }",
	"x = `${a}${b => b}`; tag`${c}`; new D(...e); f?.(g)?.[h]; import(i, { with: j }); k = { l, m: n = o, [p]: q, ...r }; ({ s = 1 } = t); [u, , ...v] = w; y = 1e999; ({ z }) => ({ z })",
	"function f() { import z from 'w' }"
];

// Modules: imports and exports, which the mangler keeps or renames by clause.
const MANGLE_MODULES = [
	"import a, { b as c, d, 'e f' as g } from 'x'; import * as ns from 'y'; export { c as h, d, a as 'i j', ns }; export * from 'z'; export * as k from 'w'; export { l as m } from 'v'; export { 'n' as o } from 'u'; console.log(g)",
	"export default function () { { function f() {} } } export const p = 1, { q, r: [s] } = t; export function u() {} export class V {} let w = 1; export { w as x };",
	"export default class W { static #x = 1; m() { return W.#x } } var y; export { y as z }",
	"export default (function named() {}); var z = 1; export { z }",
	"export default class {}"
];

/**
 * @returns {{ get: (index: number) => string }} an identifier source handing out names in a fixed order, counting nothing
 */
const plainIdentifiers = () => ({
	get: (index) =>
		"abcdefghijklmnopqrstuvwxyz"[index % 26].repeat(1 + Math.floor(index / 26))
});

/**
 * @returns {{ reset: () => void, consider: (text: string, delta: number) => void, sort: () => void, get: (index: number) => string }} an identifier source ordering its letters by how often they are counted
 */
const sortingIdentifiers = () => {
	/** @type {Map<string, number>} */
	let counts = new Map();
	let letters = [..."abcdefghijklmnopqrstuvwxyz"];
	return {
		reset() {
			counts = new Map();
		},
		consider(text, delta) {
			for (const letter of text) {
				counts.set(letter, (counts.get(letter) || 0) + delta);
			}
		},
		sort() {
			letters = [..."abcdefghijklmnopqrstuvwxyz"].sort(
				(a, b) =>
					(counts.get(b) || 0) - (counts.get(a) || 0) || (a < b ? -1 : 1)
			);
		},
		get: (index) => letters[index % 26].repeat(1 + Math.floor(index / 26))
	};
};

// What each source is mangled with, each set made afresh for each minify.
/** @type {Record<string, () => EXPECTED_ANY>} */
const MANGLE_SETS = {
	"the default names": () => ({ mangle: true }),
	"its toplevel named": () => ({ mangle: { toplevel: true } }),
	"names kept": () => ({
		mangle: { keep_fnames: true, keep_classnames: true }
	}),
	"names kept by a regular expression": () => ({
		mangle: { keep_fnames: /^[a-m]/, keep_classnames: /^[A-M]/, toplevel: true }
	}),
	"names reserved and `eval` mangled": () => ({
		toplevel: true,
		mangle: { reserved: ["e", "t"], eval: true }
	}),
	"no comments and a source map": () => ({
		mangle: { toplevel: true },
		format: { comments: false },
		sourceMap: { asObject: true }
	}),
	"every comment and a source map": () => ({
		mangle: true,
		format: { comments: "all" },
		sourceMap: { asObject: true }
	}),
	"ECMAScript 2020 in ASCII": () => ({
		ecma: 2020,
		mangle: true,
		format: { ascii_only: true }
	}),
	"names counted by a source of its own": () => ({
		mangle: { nth_identifier: sortingIdentifiers(), toplevel: true }
	}),
	"names counting nothing": () => ({
		mangle: { nth_identifier: plainIdentifiers() }
	})
};

describe("JavaScript minifier mangling a SyntaxTree", () => {
	for (const [name, set] of Object.entries(MANGLE_SETS)) {
		it(`should mangle as terser's tree mangles, with ${name}`, async () => {
			const cases = [
				...[...SOURCES, ...MANGLE_SOURCES].map((source) => ({
					source,
					module: false
				})),
				...[...MANGLE_SOURCES, ...MANGLE_MODULES].map((source) => ({
					source,
					module: true
				}))
			];
			for (const { source, module } of cases) {
				const options = () => ({ ...set(), module, compress: false });
				const reference = await minifyCounted(source, options(), false).catch(
					(/** @type {Error} */ error) => error
				);
				if (reference instanceof Error) {
					await expect(minifyCounted(source, options(), true)).rejects.toThrow(
						reference.message
					);
					continue;
				}
				const printed = await minifyCounted(source, options(), true);
				expect(printed.printedFromTree).toBe(1);
				expect(printed.code).toBe(reference.code);
				expect(printed.map).toEqual(reference.map);
			}
		});
	}

	it("should count the letters of a source too long to hold whole", async () => {
		const source = `/*! kept */\n${Array.from(
			{ length: 20000 },
			(_, i) => `function f${i}(a${i}) { return a${i} + ${i} }`
		).join("\n")}`;
		const options = { compress: false, mangle: true };
		const reference = await minifyCounted(source, { ...options }, false);
		const printed = await minifyCounted(source, { ...options }, true);
		expect(printed.printedFromTree).toBe(1);
		expect(printed.code).toBe(reference.code);
	});
});

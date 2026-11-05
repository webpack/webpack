"use strict";

// cspell:ignore binop, fnames, propmangle, fargs, domprops, argnames, nondeferred, loopcontrol, Defun, defun, NOINLINE, Funarg, unmangleable, Unmangleable, thedef, funs
// cspell:ignore fnames
// cspell:ignore argnames, bcatch, bfinally, argname, truenull
// cspell:ignore AAAWA MAAH EAAI EAAIA EAAGC ACAA IAAYC EAAWC IAAIC CAAI IAAK EAAE
// cspell:ignore endline, endcol, endpos, nlb, thedef, ymgsid, dgimsy, elta

const vm = require("vm");
const acorn = require("acorn");
const { createUnicode } = require("../../../lib/javascript/syntax").printer;

/**
 * The one-pass minify: one JavaScript `SourceProcessor` run.
 * @param {string} source the source
 * @param {import("../../../lib/javascript/syntax-parser").JavascriptProcessOptions} options its options, `compress` or `mangle` among them
 * @returns {{ code: string }} the minified code
 */
const minifyOnePass = (source, options) => {
	const { SourceProcessor } = require("../../../lib/javascript/syntax");
	return /** @type {{ code: string }} */ (
		new SourceProcessor().process(source, { mode: "minify", ...options })
	);
};

/**
 * @param {string} code a program
 * @returns {string} what it prints, or the error it throws
 */
const runProgram = (code) => {
	/** @type {string[]} */
	const lines = [];
	try {
		vm.runInNewContext(code, {
			console: {
				log: (/** @type {unknown[]} */ ...values) =>
					lines.push(values.map((value) => String(value)).join(" "))
			}
		});
	} catch (err) {
		lines.push(`throws ${/** @type {Error} */ (err).name}`);
	}
	return lines.join("\n");
};

describe("syntax-printer", () => {
	it("should read characters as terser's unicode helpers do", async () => {
		const terserUnicode = await import(
			require.resolve("terser").replace(/dist[\\/]bundle\.min\.js$/, "lib/unicode.js")
		);
		const ours = createUnicode();
		/** @type {string[]} */
		const disagreements = [];
		for (let code = 0; code <= 0x10ffff; code++) {
			const character = String.fromCodePoint(code);
			for (const [mine, theirs] of [
				[ours.isIdentifierStart, terserUnicode.is_identifier_start],
				[ours.isIdentifierChar, terserUnicode.is_identifier_char],
				[ours.isIdentifierStartBroad, terserUnicode.is_identifier_start_broad],
				[ours.isIdentifierCharBroad, terserUnicode.is_identifier_char_broad]
			]) {
				if (mine(character) !== theirs(character)) {
					disagreements.push(`${theirs.name} U+${code.toString(16)}`);
				}
			}
		}
		expect(disagreements).toEqual([]);
		for (const text of ["a\u{1F600}b", "\uD83D", "\uDE00x", "x\uD83D\uDE00"]) {
			for (let i = 0; i < text.length; i++) {
				expect(ours.getFullChar(text, i)).toBe(
					terserUnicode.get_full_char(text, i)
				);
				expect(ours.getFullCharCode(text, i)).toBe(
					terserUnicode.get_full_char_code(text, i)
				);
			}
		}
		for (const name of ["a", "$_9", "9a", "a-b", "é", ""]) {
			expect(ours.isBasicIdentifier(name)).toBe(
				terserUnicode.is_basic_identifier_string(name)
			);
		}
		// What the printer asks of a name: any engine's, or Unicode 8's alone.
		expect(
			["a", "$", "\u200c", "é", "-", "\u{1E900}", "😀"].map(
				ours.isIdentifierCharacter
			)
		).toEqual([true, true, true, true, false, true, false]);
		expect(
			[
				["a", false],
				["", false],
				["9a", false],
				["a\uD800", false],
				["a\uD800", true],
				["\u{1E900}x", true],
				["é\u{1D7CE}", true],
				["\u{10000}\u{1E900}", true],
				["a-b", true]
			].map(([name, allowSurrogates]) =>
				ours.isIdentifierString(
					/** @type {string} */ (name),
					/** @type {boolean} */ (allowSurrogates)
				)
			)
		).toEqual([true, false, false, false, false, false, true, false, false]);
	});
});

const { analyzeMinifierTree } = require("../../../lib/javascript/ScopeAnalyzer");
const {
	Field,
	NodeType,
	SyntaxTree,
	WebpackParser
} = require("../../../lib/javascript/syntax-parser");

// Sources reaching what the printer writes of names, comments, directives
// and literals.
const SOURCES = [
	// Names beyond ASCII, one a surrogate pair, spaced from the words beside them.
	"var ä = 1, 𐊧 = 2; f(typeof ä, ä in 𐊧, void 𐊧, new ä(), ä instanceof ä);",
	// Comments inside the `(` a `new` reads its callee past, nested, not before
	// the function opening it, and before a directive past an empty statement.
	"new(/**/function(){function s(){}}())",
	"new(/*a*/(/*b*/function(){}()))",
	"new(function(){}, /*c*/ a);",
	"function f(){ ; /*a*/ 'x' }",
	"function f(){ ; /**/ 'x' }",
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
	"x = /*@__PURE__*/ f(); y = (/* a */ (b, c) /* d */); z = (/* e */ g) /* f */ (h)",
	// What a print of the print kept as written: each fixed in both printers.
	'import("a", (b, c)); new (import("a")); new A(import("a"));',
	"'use\\x20strict'; \"a\\\\b\"; 'x\\x20</script>-->'; \"y\\\\<!--\"; f()",
	";// START\nf();\n;// END\n\n;/*! kept */\ng();",
	"f(\n/*! a\n b */\n/* dropped */ (m) => 1);",
	// Comments where a node's text, or the one holding it, starts.
	"x = /*! a */ b + c; y = /*! b */ (c, d).e; z = (/*! c */ f)`t`; w = (0, j)(F /*! d */.Z)",
	"async function f(){ return /*! a */ (await /*! b */ x).y } function* g(){ yield /*! c */ a ? b : c; throw /*! d */ a++ + b }",
	"function h(){ return /*! a */ a || b; return /*! b */ a = 1; return /*! c */ a.b.c(); return /*! d */ (a, b); return /*! e */ a[0] }",
	"function e() { /*! a */ } x = { /*! b */ }; switch (a) { /*! c */ } if (a) { /*! d */ } class K { /*! e */ }",
	"a(); /*! a */ ; b(); { /*! b */ ; } { a() // x\n} if (a) b() // y\nelse c()",
	"a() // x\n/* y */ b(); \u{10400}x.y; \ud801\udc00.z",
	"(a /*! a */).b; (1 /*! b */).toFixed(); (let /*! c */)[0] = 1",
	"for (var i = /*! a */ (a in b);;) break; x = !/*! b */--y",
	"export default /*! a */ (function f(){}).call(); export default /*! b */ (/*! c */ function () {})();",
	"x = (/*! a */ function(){})``; (/*! b */ function(){} + 1); /*! c */(/*! d */(/*! e */function(){} || o).toString())",
	"x && /*! a */(/*! b */(/*! c */b = a) || (b -= a, b ^= a)); (0, j)(/*! d */ (/*! e */ f))",
	"/*! a */ ('\\1'); function f() { /*! b */ ; ('\\1') } //! c;\n('\\1')",
	"/*! a */ ('\\1')",
	"//! a;\n/* b */ ('\\1')"
];

// Sources reaching what the SourceProcessor's printer reads off a node's
// place, which its own text cannot tell it.
const PRINTED_SOURCES = [
	// Parentheses a place asks for, by what holds the node.
	"(a, b) + c; -(a + b); (a + b).c; (a + b)(); a ?? (b && c); (a || b) ?? c; a - (b - c); (a ** b) ** c; a ** b ** c; a * (b + c); (a = b) + c;",
	"(a = b).c; -(a = b); (a = b) ? c : d; ({ a } = b); f(a, [b] = c); f([b] = c); a + (b = c); (a ? b : c).d; (a ? b : c) ? d : e; a = b ? c : d;",
	"(-a).b; (-a)(); (-a) ** b; (++a) ** b; (a++) ** b; typeof (a ** b); - -a; + +a; - --a; + ++a; a - -b; a + +b; a < !--b; x = !--a; a-- > b; a-- >> b; a-- >= b;",
	"(a?.b).c; (a?.b)(); a?.b.c; a?.(); a?.b(); new (a.b()); new (a().b); new a.b(); new (a()); (new A).b; (new A)(); (new A)`x`; new A`x`; new (a`x`);",
	"1..x; 0.5.x; 0..x; 1e3.x; 0x10.x; 0b1.x; 0o7.x; 07.x; 1e999; -1e999; x = 1e999.y; ({ [1e999]: 1, a: 1e999 });",
	"1 in a; 1.5 in a; .5 in a; /x/ in a; /x/ instanceof a; a in b; a instanceof b; 1 instanceof a;",
	"!/a/ in obj; a + /x/ in b; typeof /x/ instanceof y; x = !1. in a; x = -1. in a; (a, /x/) in b; a ? b : /c/ in d; (/x/) in b; f(/x/) in b; x = 1. + 2. in a;",
	"a < /script/.test(b); a < /x/; f(/a/, /script/);",
	"(a ? b : c)`x`; (a, b)`x`; (-a)`x`; (() => 1)`x`; (function () {})`x`; ({}).a`x`; ({}.a)`x`; a.b`x`; a[b]`x`; (a + b)`x`; (a = b)`x`; (new A())`x`; a()`x`;",
	"({}).a; ({}.a); (function () {}).call(); (function () {})`x`; (class {}).a; ({}) + 1; ({}).a++; ({})?.a; ({}) ? 1 : 2; ({}), 1; (function () {}) + 1; (function () {}()).a = 1; ({}).a = 1;",
	"() => ({}).a; () => ({}, 1); () => ({})(); () => ({})`x`; () => ({})?.a; () => ({}) ? 1 : 2; () => ({}).a++; () => ({}) + 1; () => ({}); () => {}; () => { a }; () => { return a }; () => { return }; (a) => { b; return a };",
	"(() => a).b; (() => a)(); (() => a) || b; a || (() => b); -(() => a); !(() => a); (() => a) ? b : c; a + (() => b); f(() => a); a = () => b; a ? () => b : () => c;",
	"(a, b) ? c : d; f((a, b)); [(a, b)]; ({ a: (a, b) }); a[(b, c)]; (a, b).c; void (a, b); x = (1, 2); var v = (1, 2); for (a, b; c, d; e, f); for (x of (a, b)); for (x in a, b); (a, b);",
	"var a = (b in c); for (var a = (b in c); ;); for ((a in b); ;); for (a = (b in c) ? 1 : 2; ;); for (var a = () => (b in c); ;); for (var a = function () { return b in c }; ;); for (var x = [b in c]; ;);",
	"if (a) b; else c; if (a) { if (b) c } else d; if (a) for (;;) if (b) c; else d; if (a) while (b) if (c) d; else e; else f; if (a) label: if (b) c; else d; if (a) do b; while (c); else d; if (a) b; else if (c) d; else e; if (a) if (b) c; else d; if (a) ; else ;",
	"for (;;) ; while (a) ; for (x in y) ; for (x of y) ; a: ; b: { break b } c: for (;;) continue c; switch (a) {} switch (a) { case 1: case 2: b(); break; default: }",
	"try { a } catch { b } try { a } catch (e) { b } finally { c } try { a } finally { b } try {} catch ({ a, 'b': c }) {} debugger; throw a; function f() { return; }",
	"for (var a in b); for (let [a] of b); for (const { a } of b); for (var i = 0, j = 1; i < j; i++, j--); for (let i = 0;;); for (x.y in z); for ([a, b] of c);",
	"var { 'a': b } = c; ({ 'a': b } = c); function f({ 'a': b }) {} var [{ 'a': b }] = c; var { x: { 'a': b } } = c; var { 'a': b = 1 } = c; function g([{ 'a': b }] = []) {} for (var { 'a': b } of c); (function ({ 'a': b }) {}); ({ 'a': b }) => b; var { ...rest } = c; f = (a = { 'b': c }) => a;",
	"({ a = 1 } = b); var { a = 1 } = b; ({ a: b = 1 } = c); ({ 'a': a = 1 } = c); ({ a: a = 1 } = b); ({ a: a } = b); ({ a: c } = b); var { a: a } = b;",
	"x = { a: a, if: if_, b: if_, Infinity: 1e999, c: 1e999, async: async, get: get, set: set, static: s }; x = { get() {}, set(v) {}, async() {}, *gen() {}, async *ag() {}, get [k]() {}, set [k](v) {}, async [k]() {}, 'q'() {}, 1() {}, [k]: 1 };",
	"x = { __proto__ }; x = { __proto__: __proto__ }; x = { '__proto__': a }; x = { __proto__: a }; x = { ['__proto__']: a }; ({ __proto__ } = a); ({ __proto__: b } = a); x = { __proto__() {} }; x = { get __proto__() {} };",
	"class A extends (a, b) {} class B extends (a ? b : c) {} class C extends B.c {} class D extends class {} {} class E extends function () {} {} class F {} class G extends (a = b) {} class H extends a() {} class I extends (-a) {}",
	"class A extends B { [function () {}]() {} static [function () {}]() {} #m() {} static #x = 1; get #y() {} set #y(v) {} static async *[k]() {} a = 1; static b; [k] = 1; 'x' = 1; #p = 1; static { a } static() {} get() {} set() {} async() {} m() { super.x(); this.#x; this?.#x; #x in this } constructor() { super() } }",
	"x = class {}; x = class A extends B {}; x = (class {}).name; export default class A {}",
	"export default class {}",
	"function* g() { yield; yield a; yield* b; x = yield c; (yield d) + 1; (yield a).b; (yield a)(); (yield a) ? b : c; -(yield a); yield (a, b); yield yield a; a = yield; f(yield a); `${yield}`; (yield)`x`; }",
	"async function f() { await a; await (a ? b : c); await (a, b); await a.b; await f(); await -a; await 1; await await a; await {}; await (() => 1); await new A(); await this; await (a + b); await `x`; (await a).b; (await a)(); (await a) ** b; -await a; (await a)`x`; await a?.b; await (a = b); await import('x'); }",
	"async () => { for await (const a of b); }; async x => x; async (a, b) => a; (async) => 1; async; async(); async(a); x = async function () {}; x = async function* () {};",
	"import a, * as b from 'c'; import {} from 'a'; import { d as d } from 'b'; import { 'e' as e } from 'b'; import { 'a b' as f } from 'd'; export {}; export { a as default }; export { 'a b' as g } from 'd'; export * as 'a b' from 'c'; export { a as 'a' }; export { b as 'h' }; export * from 'x' with { type: 'json' }; export { y } from 'z' with { type: 'json' }; import j from 'k' with { __proto__: 'x' };",
	"export default (a, b); export const x = (a, b), y = 1; export function f() {} export class C {} export let z;",
	"export default a = b;",
	"export default 1 + 2;",
	"export default (function () {})();",
	"export default ({}).a;",
	"export default (class {}).a;",
	"export default function* g() {}",
	"export default async function h() {}",
	"export default async () => {};",
	"export default (function () {}).call(this);",
	"export default (function () {});",
	"export default (class {});",
	"export default ({ a: 1 });",
	"label: function f() {} if (a) function g() {} a: b: c: ;",
	"var re = /[/]\\//g, s = /x/dgimsuy, v = /[a]/v; t = `a${b}c` + `\\${x}` + `\\u{41}` + String.raw`\\n${x}\\t`; u = `line\nbreak`; tag`\\unicode`;",
	"x = null; y = true; z = false; w = 1_000n; v = 0b1n; q = \"a'b\" + 'a\"b' + '\\'\"' + '\\u2028\\u2029\\ufeff\\0\\x001' + '\\b\\f\\v\\t\\r\\n' + '\\\\';",
	"a.if; a['if']; a.𐊧; a?.𐊧; a.ゟ; a['b']; a[0]; a?.[0]; this.x; function n() { new.target } import.meta; a.b.c.d;",
	"x = [,]; y = [a, , ]; z = [, a]; w = [a, b,]; v = [...a, ...b]; f(...a); ({ ...a, b }); [] ; ({});",
	"'use strict'; ('x'); y;",
	"('x'); 'use strict'; y;",
	"function f() { ('x') } function g() { 'use strict'; ('y'); 'z' } x = { m() { 'use strict'; ('a') } }; class K { m() { ('b') } }; () => { 'not a directive' };",
	"'use asm'; x = 1.50 + 0x10 + `a\nb`; function f() { 'use asm'; return 1.50 } function g() { return 1.50 }",
	"function f() { 'use asm'; return 1.50 } y = 1.50;",
	"function f() { var x = 1.50; 'use asm'; }",
	"#!/usr/bin/env node\r\n'use strict';",
	"#!/usr/bin/env node",
	"(let)[0] = 1; for ((let).x of y); for ((async) of x); for (let.x in y); (let[0]); let = 1; for ((let)[0] in y); for ((let)[0];;); let.a; (let)?.[0]; async.x; for ((async).x of y);",
	"with (o) { a } with (o) b; with (o) if (a) b; else c;",
	"class P { #x; m(o) { #x in (a = b); #x in (a ? b : c); #x in (a, b); #x in (() => 1); (#x in o) + 1; !(#x in o); (#x in o).y; (#x in o)(); a < (#x in o); (#x in o) < a; (#x in o) || a; a in (#x in o); (#x in o) in a; (#x in o) ** 2; #x in (#x in o); #x in a + b; #x in (a in b); #x in (a || b); (#x in o) ? 1 : 2; (#x in o)`t`; } *g() { #x in (yield); } }",
	"import async from 'x'; import { let as l } from 'y'; new (a[function () { b() }]); new (a[() => b()]); new (a[b()]); x = function () {}.y; do ; while (a); { ('x') } switch (a) { case 1: ('y') } 1. in a; .5 in a;",
	"import a from 'b' with { type: 'json', other: 'x' }; export { c } from 'd' with { type: 'json', other: 'y' };",
	"x = { 'a': a, 'b': b = 1, c: c, 'd e': d };",
	"do { a } while (b); switch (a) { case 1: ; } (a ?? b) || c; a && (b ?? c); (a ?? b) && c;"
];
// Sources the printer reads `use asm` off for a number where no scope says it.
PRINTED_SOURCES.push(
	"'use asm'; f = () => 1.50; class A { x = 1.50; static { y = 1.50 } } g = function () { return 1.50 };"
);
// A source spelling its line breaks densely, which ECMAScript 2015 prints
// in templates: a string, a template and a template's tag apart.
PRINTED_SOURCES.push(
	`("r\\ns"); ${'x = "a\\nb";'.repeat(1000)} y = "c\\nd"; z = \`e\\nf\`; t\`g\\nh\`; w = "\\t\\t\\n${"i".repeat(120)}"; import("j\\nk"); u.v = 1; import k from "l\\nm" with { type: "n\\no" }; ({ "p\\nq": 1 }); ("r\\ns"); x = \`\${"t\\nu"}\`;`
);

describe("JavaScript minifier printing a SyntaxTree", () => {
	it("should mangle and print in one walk where it compresses in one pass", () => {
		const printed = minifyOnePass(
			"function foo(longName, other) { var local = longName + other; return local * 2; } foo(1, 2); class A { #field = 1; read() { return this.#field } static #hidden() {} } print(new A().read());",
			{ compress: {}, mangle: {}, toplevel: true }
		);
		expect(printed.code).toBe(
			"function e(e,o){return(e+o)*2}e(1,2);class o{#e=1;read(){return this.#e}}print((new o).read());"
		);
	});

	it("should compress in the one pass where nothing outside a node decides it", () => {
		/** @type {[string, import("../../../lib/javascript/syntax-printer").MinifyOptions, string][]} */
		const cases = [
			[
				"if (a) { b() } while (a) { a-- } for (;;) { g() } l: { c() } with (o) { d() } do { e() } while (a); for (k in o) { f(k) } for (k of o) { f(k) }",
				{},
				"if(a)b();while(a)a--;for(;;)g();c();with(o)d();do{e()}while(a);for(k in o)f(k);for(k of o)f(k);"
			],
			// An `else` after a block keeps it where the block ends in an `if` of its own.
			[
				"if (a) { if (b) c(); } else d(); if (a) { for (;;) if (b) c(); } else d(); if (a) { if (b) c(); else e(); } else d(); if (a) { l: if (b) for (;;) break l; } else d();",
				{},
				"if(a){if(b)c()}else d();if(a){for(;;)if(b)c()}else d();a?b?c():e():d();if(a){e:if(b)for(;;)break e}else d();"
			],
			// A block unwrapped to the `if` it holds still ends in that `if`.
			[
				"if (s) { if (a) { f() } else { if (b) { g() } } } else { h() }",
				{ mangle: false },
				"if(s){if(a)f();else if(b)g()}else h();"
			],
			// An empty loop body keeps the `;` no line break stands in for.
			[
				"x(); do ; while (a)",
				{ format: { semicolons: false } },
				"x()\ndo{}while(a)\n"
			],
			// An import attribute's value stays a string where strings print as templates.
			[
				"import a from 'b' with { type: 'json' }; a(); x = 'json'",
				{ sourceType: "module", ecma: 2020 },
				'import o from"b"with{type:"json"};o(),x=`json`;'
			],
			// A `let` takes the value set after it only where that value runs no code.
			[
				"let a; a = [1, , {b: 2, c: function(){}}, () => 3]; let b; b = [x]; let c; c = {[k]: 1}; let d; d = {...e}; let e2; e2 = {b: x}; f(a,b,c,d,e2)",
				{},
				"let a=[1,,{b:2,c:function(){}},()=>3],b;b=[x];let c;c={[k]:1};let d;d={...e};let e2;e2={b:x},f(a,b,c,d,e2);"
			],
			// A known test's branch prints in its place, braced where it is several.
			[
				"if (x) { if (true) { b(); c() } } else d(); if (x) { if (false) { b() } else { c(); e() } } else d(); while (x) { if (1) { b(); c() } }",
				{},
				"if(x){b(),c()}else d();if(x){c(),e()}else d();while(x){b(),c()}"
			],
			[
				"if (a) { let x = h(); f(x, x) } if (a) { const y = h(); f(y, y) } if (a) { var z = 1 } if (a) { class C {} f(C) } if (a) { function g() {} } if (a) {} if (a) { b(); c() }",
				{},
				"if(a){let i=h();f(i,i)}if(a){let n=h();f(n,n)}if(a)var z=1;if(a){class s{}f(s)}if(a){function g(){}}a;if(a)b(),c();"
			],
			[
				"if (a) /* before */ { b() } if (a) { b() /* after */ }",
				{ format: { comments: /before|after/ } },
				"if(a)/* before */{b()}if(a){b()/* after */}"
			],
			[
				"var a = 1; var b = 2, c; var [d] = e; let x = 1; let y = 2; const z = 3; var w; /* note */ var q; f(a, b, c, d, x, y, z, w, q)",
				{ format: { comments: /note/ } },
				"var a=1,b=2,c,[d]=e;let x=1,y=2;const z=3;var w;/* note */var q;f(a,b,c,d,x,y,z,w,q);"
			],
			[
				"f(true, false); x = true.toString(); y = true ** b; z = b ** true; w = { a: false }; t = typeof true; new true; true`x`; v = a(true)(false)",
				{},
				"f(!0,!1),x=true.toString(),y=true**b,z=b**!0,w={a:!1},t=typeof!0,new(!0),true`x`,v=a(!0)(!1);"
			],
			// `undefined` is `void 0` where it reads the global, not where it is bound or written.
			[
				"function f(a){ return a === undefined ? undefined.x : typeof undefined } function g(undefined) { return undefined } y = { undefined: 1 }; z = o.undefined; w = [undefined]",
				{},
				"function f(n){return n===void 0?(void 0).x:\"undefined\"}function g(n){return n}y={undefined:1},z=o.undefined,w=[void 0];"
			],
			// Where anything writes it, it stays a name everywhere.
			[
				"x = undefined; undefined = 1; for (undefined in o); undefined++",
				{},
				"x=undefined,undefined=1;for(undefined in o);undefined++;"
			],
			// Strings compare loosely, a name in brackets prints after a `.`, and
			// a `return` of `undefined` from nothing happening is bare.
			[
				'typeof a === "string" && typeof b !== typeof c && a === "s" && "s" === typeof a && "a" !== "b" && typeof a === /*! c */ "s"; o["key"]; o?.["if"]; o["a-b"]; x = 1["k"]; o[/*! c */ "k"]; o[1]; function f(){ return void 0 } function g(){ return undefined } function h(){ return void x() } function k(){ return /*! c */ void 0 }',
				{},
				'"string"==typeof a&&typeof b!=typeof c&&a==="s"&&"s"==typeof a&&typeof a==/*! c */"s",o.key,o?.if,o["a-b"],x=1..k,o[/*! c */"k"],o[1];function f(){}function g(){}function h(){x()}function k(){/*! c */return void 0}'
			],
			// A `const` nothing writes is a `let`, private to the module or where
			// `toplevel` says so, and a loop forever is `for(;;)`.
			[
				'const a = g(), b = 1; const { x, y: [z = 1, ...r] } = a; const c = 1; c = 2; const d = 1; d++; const e = 1; [e] = []; const k = 1; ({ k } = {}); const m = 1; for (m of a); export const ex = 1; for (const i of a) g(i, x, z, r, b, c, d, e, k, m); while (true) g(); while (/*! t */ true) g(); while (a) g()',
				{ module: true },
				'const o=g(),{x:c,y:[t=1,...e]}=o,n=1;n=2;const s=1;s++;const r=1;[r]=[];const a=1;({k:a}={});const i=1;for(i of o);export const ex=1;for(let f of o)g(f,c,t,e,1,n,s,r,a,i);for(;;)g();while(/*! t */1)g();while(o)g();'
			],
			[
				"const a = 1; function f() { const b = g(); h(b); return b } f(a)",
				{},
				"const a=1;function f(){let n=g();return h(n),n}f(a);"
			],
			// Unmangled, the scopes are still read: what nothing reads goes, names as written.
			[
				"function f(){ const b = 2; var u = 1; return void 0 } f(undefined)",
				{ mangle: false },
				"function f(){}f();"
			],
			// What only dropped code reads goes too; a constant prints as its value
			// where that is shorter and the read prints as a name would; a comment
			// that does not print holds nothing back; a built-in needs no `new`.
			[
				'/** doc */ var A = "[object Array]"; /** doc */ var B = 200, C = 1, D = "d"; function f(o){ var a = 1; function g(){ return a } var b = g; const K = 2; if (o) { var u = 1; h(K, K) } return [o.t == A, A, B, B.x, C, {C}, D, new Error("e"), new Map()] } function k(){ g(V); var V = 2; } f(k)',
				{ compress: { toplevel: true } },
				'var A="[object Array]",B=200;function f(r){if(r)h(2,2);return[r.t==A,A,B,B.x,1,{C:1},"d",Error("e"),new Map]}function k(){g(r);var r=2}f(k);'
			],
			// A read where the value would print otherwise keeps the name, and so
			// does a value no literal of a name's length prints the same.
			[
				'function f(){ var A = "a", B = "b", D = "d", E = "e", R = /r/, N = -1, G = 1n; (A); B; delete D; g((E)); return [R, N, G, A, B, D, E] } f()',
				{ compress: { toplevel: false, side_effects: false } },
				'function f(){var e="a",n="b",r="d",f="e",t=/r/,A=-1,B=1n;e,n,delete r,g(f);return[t,A,B,e,n,r,f]}f();'
			],
			// Constants fold; a name nothing reads goes from a function or class
			// expression; `null` and `undefined` test as one; a `let` needs no
			// `undefined`; and a function's last `return` of nothing goes.
			[
				'function f(a, b){ var MAX = 4294967295, IDX = MAX - 1, S = "a" + "b", T = S + "c", B = !0, U = typeof x + "y"; let x = void 0; var w = undefined; w = 1; var v = function n(){}, c = class C {}, d = function e(){ return e }; g(a === null || a === void 0, b !== void 0 && b !== null, a == undefined, IDX, T, T.length, B, B.x, x, w, v, c, d, U, typeof a === "s"); return }',
				{},
				'function f(n,e){var a=typeof d+"y";let d;var t=void 0;t=1;var u=class{};g(n==null,e!=null,n==null,4294967294,"abc","abc".length,!0,true.x,d,t,function(){},u,function n(){return n},a,"s"==typeof n)}'
			],
			// A name set to another nothing writes reads that one; a function
			// read once prints where it is read, where that runs after it once.
			[
				"function f(m, c, e){ const s = e; let t = s; g(s.kind, t, {s}); var o = (n) => n + t; m.exports = o; if (c) { var p = () => 1 } g(p); switch (c) { case 1: var q = () => 2; case 2: g(q) } const r = () => 3; for (;;) g(r); const u = function(){}; { g(u) } }",
				{},
				"function f(c,s,t){g(t.kind,t,{s:t}),c.exports=c=>c+t;if(s)var n=()=>1;g(n);switch(s){case 1:var o=()=>2;case 2:g(o)}let r=()=>3;for(;;)g(r);g(function(){})}"
			],
			// A `var` is a constant where nothing called before it can read it,
			// nor a read in its own function before it.
			[
				"function f(){ function m(){ return [A, B.x, C] } g(); var A = 1, B = 2, C = 3; y = C; return m } function h(){ var r = D; var D = 4; function k(){ return D } return [r, k] } function j(){ x = 1; var E = 5, F = 6; function q(){ return [E, (F).x, F] } return q }",
				{},
				"function f(){g();var n=2;return y=3,function(){return[1,n.x,3]}}function h(){var n=r,r=4;return[n,function(){return r}]}function j(){x=1;var n=6;return function(){return[5,n.x,n]}}"
			],
			// A function declared and called once prints where it is called,
			// but not into a loop, nor where the call comes before it.
			[
				"function f(a){ function h(x){ return x + a } function k(){ return 1 } function r(n){ return n ? r(n - 1) : 0 } var z = h(2); for (;;) k(); g(z, r); function late(){} late(); return [early()]; function early(){ return 2 } }",
				{},
				"function f(n){function r(){return 1}function t(n){return n?t(n-1):0}var u=2+n;for(;;)r();g(u,t);return[2]}"
			],
			// A name nothing reads goes, its value still running; a `var` set
			// after a call is a constant where only its own function reads it.
			[
				"function f(){ var a = g(), b = 1, c = h(), d = k(); var e = function(){}.call(), o = {x: 1}.x, q = m(); return b + d } function u(){ let x = g(); var y = h(); var z = 1, w = 2; function k(){ return w } return [z, k] }",
				{},
				"function f(){g();h();var n=k();(function(){}).call();m();return 1+n}function u(){g();h();return[1,function(){return 2}]}"
			],
			// A `var` set after a call is a constant where a function made after
			// it reads it, and a function called once from another moves there.
			[
				'function u(){ g(); var z = "z1", w = "w2", v = "v3"; function k(){ return w } h(function(){ return z }, function(){ function inner(){ return v } return inner }); return k } function f(o){ function a(e){ return e + o } const b = function(){ return this }, c = () => this; return [function(x){ return a(x) }, function(){ return b() }, function(){ return c() }] }',
				{},
				'function u(){return g(),h(function(){return"z1"},function(){return function(){return"v3"}}),function(){return"w2"}}function f(n){let r=()=>this;return[function(r){return r+n},function(){return function(){return this}()},function(){return r()}]}'
			],
			// What a statement sets folds into the next where that reads it first,
			// but not past a compound assignment's read nor a name it may write.
			[
				'function f(e, t, s){ var i; i = e.indexOf("x", t); if (i === -1 || i > s) return 1; let n = g(e); r(n); let o = {a: 1}; o.a; i = 2; while (i) i--; var p = h(); q += p; var u = h(); w(u); w = 1; let m = h(); return [m, 2] } function r(){} var q, w',
				{},
				'function f(i,e,n){var t=i.indexOf("x",e);if(t===-1||t>n)return 1;r(g(i)),t=2;while(t)t--;var a=h();q+=a;var u=h();w(u),w=1;return[h(),2]}function r(){}var q,w;'
			],
			// What folds to a constant prints its value where that is shorter,
			// and a template's parts that fold are its text; a tag's are not.
			[
				'function f(o){ const S = "\\\\/", T = 64; return [`[^${S}]`, `${o}{1,2}(?:[${S}]|$)`, 1024 * T, 64 * 1024, o["_" + "x"], a - (2 - 7), "_" + "check", 1 + 2, String.raw`${S}`, S, S] }',
				{},
				'function f(S){let n="\\\\/";return["[^\\\\/]",`${S}{1,2}(?:[\\\\/]|$)`,65536,65536,S._x,a- -5,"_check",3,String.raw`${n}`,n,n]}'
			],
			// A `typeof` tests against "u"; a `do` body that is no block stays
			// one; a `new` with arguments folds bare, one without in parentheses.
			[
				'g(typeof a !== "undefined", "undefined" == typeof b, typeof d != "object"); do e(); while (a); function f(e){ let o = new Set(e); return o } function k(){ let o = new X; return o() }',
				{},
				'g(typeof a<"u",typeof b>"u","object"!=typeof d);do{e()}while(a);function f(e){return new Set(e)}function k(){return(new X)()}'
			],
			// A function reading `arguments` may write a parameter through it.
			[
				"function h(e){ const s = e; arguments[0] = 2; return s } h(1)",
				{},
				"function h(n){let e=n;return arguments[0]=2,e}h(1);"
			],
			// A preamble prints once, before the code.
			[
				"function f(){ var a = undefined; return 1 } f()",
				{ format: { preamble: "/* p */" } },
				"/* p */\nfunction f(){return 1}f();"
			],
			// A `with` may bind `undefined`, so every one stays a name.
			[
				"f(undefined); with (o) f(undefined)",
				{},
				"f(undefined);with(o)f(undefined);"
			],
			// What nothing reads goes where its value makes nothing happen.
			[
				"function f(a){ var x = 1, y = g(), z = { a: 1, b: [2, -3, !0, void 0, typeof 1, `t`] }, k = { [q]: 1 }, s = { ...o }, t = `${a}`, p = [g()]; var w = [1, () => 2, function () {}]; function h() {} function used() {} used(); for (var i = 0;;) break; var v = 1, u = 2; return a } var top = 1; function topFunction() {}",
				{},
				"function f(n){g();({[q]:1});({...o});`${n}`;[g()];for(var t=0;;)break;return n}var top=1;function topFunction(){}"
			],
			[
				"function f(a){ var a = 1; return arguments[0] } function g(){ var b = 1; var b = 2 } function e(){ var x = 1; eval('x') } function w(){ /* keep */ var c = 1 } function l(){ { function inner() {} } var m = -b, n = typeof b }",
				{ format: { comments: /keep/ } },
				'function f(n){var n=1;return arguments[0]}function g(){}function e(){var x=1;eval("x")}function w(){}function l(){-b}'
			],
			[
				"var top = 1; let t2 = 2; export function e() {} function unusedTop() {} var ex = 1; export { ex }",
				{ module: true },
				"export function e(){}var ex=1;export{ex};"
			],
			// A `using` declaration disposes of each of its names alone.
			[
				"{ using a = b(); using c = d(); f(a, c) }",
				{},
				"{using a=b();using c=d();f(a,c)}"
			],
			// A value folded into a declarator that goes still runs.
			[
				"function g() { var a = f(); var b = a } function h() { var x; x = f(); var b = x }",
				{},
				"function g(){f()}function h(){f()}"
			],
			// Without the mangler nothing is known constant.
			[
				"const k = 1; print(a + 1, `${k}`, o[c])",
				{ mangle: false },
				"const k=1;print(a+1,`${k}`,o[c]);"
			],
			["function f(){ return void a }", { mangle: false }, "function f(){a}"],
			// A `var` whose dropped declarator prints apart keeps its braces.
			[
				"function h(c) { if (c) { var a = f(), b = 2 } return b }",
				{},
				"function h(c){if(c){f();var n=2}return n}"
			],
			// An alias cycle has no name at its end to read.
			[
				"function q() { const a = b; const b = a; return a }",
				{},
				"function q(){let n=t,t=n;return n}"
			],
			// Constants fold through every operator terser evaluates.
			[
				"function f(o){ const a = 3, b = 2; return [a<<b, a>>b, a>>>b, a&b, a|b, a^b, a==b, a!=b, a!==b, a<b, a>b, a<=b, a>=b, a in o, ~a, +a, typeof a, void a, a - b, a / b, a % b, a ** b, a * b] }",
				{},
				"function f(a){return[12,0,0,2,3,1,!1,!0,!0,!1,!0,!1,!0,3 in a,-4,3,\"number\",void 3,1,3/2,1,9,6]}"
			],
			[
				"function f(){ const a = 1, z = 0, n = null; return [a && 2, a || 2, a ?? 2, z && a, z || 3, n ?? 4, a ? 5 : 6, z ? 7 : 8] }",
				{},
				"function f(){return[2,1,1,0,3,4,5,8]}"
			],
			[
				"function f(){ const t = true, u = false, n = null; return [t, t, t, u, u, u, !t, n, n, n, n] }",
				{},
				"function f(){let n=null;return[!0,!0,!0,!1,!1,!1,!1,n,n,n,n]}"
			],
			[
				"function f(){ const t = true; if (!t) g(); return t ? 1 : 2 }",
				{},
				"function f(){return 1}"
			],
			// A constant's value folds where only its value is known.
			[
				"function f(){ const a = ~3, b = +'1', c = typeof 1, d = typeof null, e = -1, h = !0, i = 1 && 2, j = 0 || 3, k = null ?? 5, l = 1 ? 6 : 7, m = 1 === 1, n = 1 instanceof 2, p = 0 ? 8 : 9; g(a, b, c, d, e, h, i, j, k, l, m, n, p) }",
				{},
				"function f(){g(-4,1,\"number\",\"object\",-1,!0,2,3,5,6,!0,1 instanceof 2,9)}"
			],
			// What nothing reads goes where its value makes nothing happen.
			[
				"function f(){ var x = 1, y = 2; var u = x || y, v = x ? y : 1, w = !x, q = (x, y); }",
				{},
				"function f(){}"
			],
			[
				"function f(){ var a = g(); var b = a } function h(){ var a = g(); var b = a; return b } function i(){ var m = function(){}; var n = m } function j(){ const k = 1; var p = k }",
				{},
				"function f(){g()}function h(){return g()}function i(){}function j(){}"
			],
			// A value kept as a statement keeps it from reading as a declaration.
			[
				"function f(o){ var a = {}.x + g(); var b = (class{}).y || g(); var c = (function(){})() ? g() : 1; var d = (function(){}(), g()); var e = function(){}`t${g()}`; var h = {}.p++; var i = ++o.p; var j = new X(g()); var k = (o.q = g()); }",
				{},
				"function f(a){({}).x+g();(class{}).y||g();(function(){})()?g():1;([],g());(function(){})`t${g()}`;({}).p++;++a.p;new X(g());a.q=g()}"
			],
			// A function moved to its read prints in parentheses where it would not read as a value.
			[
				"function f(){ var g = function(){}; (g || h)(); var k = function(){}; k ? 1 : 2; var m = function(){}; m`t`; var p = class{}; (p, 1); var q = {}; q.r++; }",
				{},
				"function f(){(function(){}||h)();(function(){})`t`;({}).r++}"
			],
			[
				"function f(){ var m = function(){}; h({ k: m }); var n = function(){}; h(n + 1); var p = function(){}; h({ [p]: 1 }) }",
				{},
				"function f(){h({k:function(){}}),h(function(){}+1),h({[function(){}]:1})}"
			],
			// The global `undefined` is `void 0` only where it is read as a value.
			[
				"function f(){ return [undefined, function(a = undefined){ return a }, { k: undefined }, { undefined }] } var v = undefined; ({ k: v } = o)",
				{},
				"function f(){return[void 0,function(n=void 0){return n},{k:void 0},{undefined:void 0}]}var v=void 0;({k:v}=o);"
			],
			// A statement folds into the next one's first read, where nothing runs before it.
			[
				"function f(H){ var x; x = g(); switch (x) {} x = g(); x ? 1 : 2; x = g(); h(...x); x = g(); delete x.y; x = g(); (x, 1); x = g(); ({ k: x }); x = g(); ({ [k]: x }); x = g(); ({ x }); x = g(); new H(x); x = g(); new H(...x); x = g(); new U(x); x = g(); [...x]; x = g(); `${x}`; x = g(); -x; return x }",
				{},
				"function f(x){var e=g();(e=g()),e=g(),h(...e),e=g(),delete e.y,e=g(),e=g(),e=g();({[k]:e});return e=g(),new x(e=g()),e=g(),new x(...e),new U(e=g()),e=g(),[...e],`${e=g()}`,-(e=g()),e}"
			],
			[
				"function f(H){ var x; x = g(); H(...x) }",
				{},
				"function f(x){var f=g();x(...f)}"
			],
			// A `const` prints as `let` only where nothing writes a name its patterns bind.
			[
				"function f(){ var { a, b: [c] } = o; var [d, , e] = o; return a + c + d + e }",
				{},
				"function f(){var{a:a,b:[r]}=o,[c,,e]=o;return a+r+c+e}"
			],
			[
				"function f(o){ let { a } = o, [b, , c] = o; a = 1; return a + b + c }",
				{},
				"function f(o){let{a:a}=o,[c,,n]=o;return(a=1)+c+n}"
			],
			[
				"function f(o){ const [, a] = o, { b } = o; const [c] = o; c = 1; return a + b + c }",
				{},
				"function f(o){const[,c]=o,{b:n}=o,[t]=o;return t=1,c+n+t}"
			],
			// An alias reads its target, a catch parameter of its name aside.
			[
				"function f(){ const t = g(); const a = t; try { h(a) } catch (e) { h(e) } }",
				{},
				"function f(){let t=g();try{h(t)}catch(t){h(t)}}"
			],
			// A comment kept keeps the statement it is on.
			[
				"function f(){ var a = 1; /* keep */ g(a); /* drop */ h(); } // tail",
				{ format: { comments: /keep/ } },
				"function f(){/* keep */g(1);h()}"
			],
			[
				"function f(){ var a = 1; g(a) /* keep */ }",
				{ format: { comments: /keep/ } },
				"function f(){g(1)/* keep */}"
			],
			// Names read in a static block or a field initializer.
			[
				"var a = 1; class C { static { h(a) } x = a } h(); var b = 2; function q(){ return b } h()",
				{ toplevel: true },
				"var a=1;class C{static{h(a)}x=a}h();var b=2;function q(){return b}h();"
			],
			// A `using` declaration's value runs, read or not.
			[
				"{ using a = b(); }",
				{},
				"{using a=b()}"
			],
			[
				"{ const a = g(); using b = a; h(b) }",
				{},
				"{let a=g();using b=a;h(b)}"
			],
			// A callee a read of which may throw is read before what a statement set runs.
			[
				"function f(){ var x; x = s(); g(x); let g = () => {}; } function h(){ var x; x = s(); new C(x); class C {} } function i(){ var x; x = s(); k(x); var k = () => {} }",
				{},
				"function f(){var x=s();n(x);let n=()=>{}}function h(){var x=s();new n(x);class n{}}function i(){x(s());var x=()=>{}}"
			],
			// A directive stays, and so does a global set before a call that may read it.
			[
				"function f(){ 'use strict'; g() } function h(){ x = g(); k(x) }",
				{},
				"function f(){\"use strict\";g()}function h(){x=g(),k(x)}"
			],
			// A kept comment on a function keeps it where it is declared.
			[
				"function f(){ var m = /*! lic */ function(){}; h(m) } function i(){ function k(){} h(k) } function j(){ var n = function(){}; for (;;) h(n) }",
				{},
				"function f(){var n=/*! lic */function(){};h(n)}function i(){h(function(){})}function j(){var n=function(){};for(;;)h(n)}"
			],
			[
				"function f(){ var m = function(){} /* keep */; h(m) }",
				{ format: { comments: /keep/ } },
				"function f(){var n=function(){}/* keep */;h(n)}"
			],
			[
				"function f(){ var m = /* keep */ function(){}; h(m) } function i(){ /* keep */ var n = 1; g(n) }",
				{ format: { comments: /keep/ } },
				"function f(){var n=/* keep */function(){};h(n)}function i(){g(1)}"
			],
			// A function moved to its one read.
			[
				"function f(){ var g = function(){ return 1 }; h(g) + 1 } function i(){ var k = () => {}; h(k) }",
				{},
				"function f(){h(function(){return 1})+1}function i(){h(()=>{})}"
			],
			[
				"function f(){ var g = () => a; h(g) } function i(){ var k = async () => 1; h(k) }",
				{},
				"function f(){h(()=>a)}function i(){h(async()=>1)}"
			],
			// What a `#__PURE__` annotation marks drops, where `side_effects` reads it.
			[
				"function f(){ var a = /*#__PURE__*/ g(), b = /*@__PURE__*/ new C(1), c = /*#__PURE__*/ g(h()), d = g(); }",
				{},
				"function f(){g(h());g()}"
			],
			[
				"function f(){ var a = /*#__PURE__*/ g(); }",
				{ compress: {toplevel: false,side_effects: false} },
				"function f(){g()}"
			],
			// A known global, or its member, reads without an effect, short of a `try` probing for it or a `with`.
			[
				"function h(){ var m = Math, w = window, j = JSON.parse, u = undeclaredThing, k = JSON[x], q = JSON?.p; } function t(){ try { var m = Math; } catch (e) {} }",
				{},
				"function h(){undeclaredThing;JSON[x]}function t(){try{Math}catch(a){}}"
			],
			[
				"function w(o){ var q; with (o) { var m = Math, r = q; } }",
				{},
				"function w(a){var q;with(a)var m=Math,r=q}"
			],
			// Reading a member of what may be `null`, or have a getter, may throw or run it.
			[
				"function f(o, a){ var b = ({ ...o }).x, c = (o && {}).x, d = (o?.p).x, e = (function(){}).prototype.x, h = (o += 1).x, i = (o = {}).y, j = [1][a()], k = [1][0], l = delete o.x, m = (a ? o : {}).x, n = (() => 1).prototype.x, p = (class {}).prototype.x, q = ({} || o).x, r = (1 && {}).x; }",
				{},
				"function f(o,x){({...o}).x;(o&&{}).x;(o?.p).x;(o+=1).x;(o={}).y;[1][x()];delete o.x;(x?o:{}).x;(()=>1).prototype.x;({}).x}"
			],
			// What a value converts as is known through its operators, three levels deep.
			[
				"function g(a, b){ var c = (a < b) - 1, d = (1 >>> 0) - 1, e = (1 + \"s\") - 1, h = (1n + 1n) - 1n, i = (1 + 2) - 1, j = (a + 1) - 1, k = (1n * 1n) - 1n, l = (1 * 2) - 1, m = (a * 1) - 1, n = null - 1, w = `x` - 1, x = 1 - ((((1 + 1) + 1) + 1) + 1), o = (0, /r/) - 1, p = (b++) - 1, q = -(-1n) - 1n, r = -(a + 1), s = 1 - (((1 + 1) + 1) + 1), t = undefined + 1, u = (a ? 1 : \"s\") - 1, v = (a = 1) - 1, y = (a += 1) - 1, z = -\"1\" - 1, aa = -(1 + \"\".length) - 1; }",
				{},
				"function g(n,a){n+1-1;n*1-1;(0,/r/)-1;a++-1;-(n+1);(n?1:\"s\")-1;(n=1)-1;(n+=1)-1}"
			],
			// A constant's value folds where only its value is known.
			[
				"function f(){ const k = void 1, m = delete x; g(k, m) }",
				{},
				"function f(){g(void 1,delete x)}"
			],
			// A declarator going, but keeping its value, prints it apart.
			[
				"function f(){ var a = g(), b = h(), c = k(); use(a, c) }",
				{},
				"function f(){var a=g();h();use(a,k())}"
			],
			// A `with` anywhere may answer any name.
			[
				"function w(o){ with (o) {} } function f(){ var a = b; }",
				{},
				"function w(n){with(n);}function f(){b}"
			],
			// A conversion of what may be an object may run its methods, as `in` and `instanceof` may throw.
			[
				"function f(a, b){ var p = a + b, q = -a, r = a in b, s = a instanceof b, t = `${a}`, u = !a, v = typeof a, w = a < b, x = `${1}`, y = a && b, c = +a, d = a == b, e = ~a, h = a * 2; }",
				{},
				"function f(a,b){a+b;-a;a in b;a instanceof b;`${a}`;+a;~a;a*2}"
			],
			[
				"function g(a){ var p = 1 + 2, q = \"s\" + 1, r = -1, s = 1n + 2n, t = 1n + 1, u = `${-1}${\"x\"}`, v = typeof a + \"\", w = !a + 1, x = (a, 1) * 2, y = 1 - \"2\", z = /r/ + \"\", k = 1n >>> 1n, m = -(a ? 1 : 2), n = (a = 1) + 1, o = (a || \"\") + 1, l = 1 + ++a; }",
				{},
				"function g(a){1n+1;1n>>>1n;(a=1)+1;(a||\"\")+1;1+ ++a}"
			],
			// Reading a member runs nothing only off what is no `null`, `undefined` or object with a getter.
			[
				"function f(o){ var a = Math, b = o.x, c = [1].length, d = {}.x, e = { get x(){} }.x, h = typeof q, i = [...o], j = { ...o }, m = Function.prototype, n = (function(){}).prototype, p = o?.x, q2 = null.x, r = { ...{ a: 1 } }.a, s = (o, {}).x, t = (o ? {} : []).x, u = (void 0).x, v = (o = {}).x, w = (o &&= {}).x, y = (o ? 1 : 2).x, z = o.y.prototype; }",
				{},
				"function f(o){o.x;({get x(){}}).x;[...o];({...o});null.x;(void 0).x;(o={}).x;(o&&={}).x;o.y.prototype}"
			],
			// A class is made with effects where its heritage or a key may run or throw.
			[
				"function f(){ var a = class extends (() => 1) {}, b = class extends null {}, d = class { [k] = 1 }, e = class { static x = 1; m(){} }, g = class extends Object {}, h = class extends (async function(){}) {}, i = class extends {} {}, j = class extends (function*(){}) {}, l = class extends 1 {}, n = class { static {} }, p = class { static { q() } }, r = class { static y = q() }; }",
				{},
				"function f(){(class extends(()=>1){});(class{[k]=1});(class extends async function(){}{});(class extends({}){});(class extends function*(){}{});(class extends(1){});(class{static{q()}});(class{static y=q()})}"
			],
			// A `typeof` reads a name in its dead zone with a throw, so its value folds in after.
			[
				"function f(){ var a = typeof x; let x = 1; return a } function g(){ return k } const k = 2; h(g())",
				{},
				"function f(){var n=typeof t;let t=1;return n}function g(){return k}const k=2;h(g());"
			],
			// A callee set before the statement a collapse moves reads the same after it.
			[
				"function f(c){ { if (c) { var x; x = s(); g(x) } let g = q; } } function h(c){ let g = q; if (c) { var x; x = s(); g(x) } } function k(){ class C {} var x; x = s(); new C(x) } function m(){ let g = () => {}; function n(){ var x; x = s(); g(x) } return n }",
				{},
				"function f(n){{if(n){var x=s();c(x)}let c=q}}function h(n){let x=q;if(n)x(s())}function k(){class n{}new n(s())}function m(){let n=()=>{};return function(){var x=s();n(x)}}"
			],
			// An `if` of expressions prints as `?:`, its test parenthesized where it binds looser, first in a statement or not.
			[
				"function f(a, b){ if (a) x(); else y(); if (a = b) x(); else { y() } if (function(){}()) x(); else y(); if (a) x(); else if (b) y(); else (x(), y()); if (a) { if (b) x(); else y() } else z(); }",
				{},
				"function f(e,f){e?x():y(),(e=f)?x():y();(function(){}())?x():y();e?x():f?y():(x(),y()),e?f?x():y():z()}"
			],
			// A comment kept on an `if`'s branch or its `return` keeps it, and `conditionals: false` keeps every `if`.
			[
				"function f(a){ if (a) /*! c */ x(); else y(); if (a) { x() /*! d */ } else y(); if (a) return 1; /*! e */ return 2 }",
				{},
				"function f(e){if(e)/*! c */x();else y();if(e){x()/*! d */}else y();if(e)return 1;/*! e */return 2}"
			],
			[
				"function f(a){ if (a) x(); else y() }",
				{ compress: {toplevel: false,conditionals: false} },
				"function f(f){if(f)x();else y()}"
			],
			// `if (t) return x; return y` prints as one `return`, a sequence parenthesized, but no `return` without a value.
			[
				"function f(a, b){ if (a) return b, 1; return 2 } function g(a){ if (a) { return 1 } return void 0 } function h(a){ if (a) return; return 1 }",
				{},
				"function f(n,r){return n?(r,1):2}function g(n){if(n)return 1}function h(n){if(!n)return 1}"
			],
			// An `if` whose test is known false goes, and what only it read with it, but not where its body declares a function or holds a comment kept: a `var` stays declared.
			[
				"function f(a){ var m = 1; if (!1) m = a; if (0) { var v = 1 } if (false) { function q(){} q() } const D = false; if (D) g(); if (!1) x(); else y(); if (0) x(/*! c */ 1); return m + v }",
				{},
				"function f(f){var i=1;var a;if(0){function n(){}n()}y();if(0)x(/*! c */1);return i+a}"
			],
			[
				"function f(a){ if (0) x() }",
				{ compress: {toplevel: false,dead_code: false} },
				"function f(f){if(0)x()}"
			],
			// A conditional whose test is known prints the branch it picks, after `0,` where `delete`, `typeof` or a call would read a name or member differently, but not what opens a statement or drops a comment kept.
			[
				"function f(o){ const T = 1; g(T ? o : 2); g(!T ? 1 : (o, 2)); delete (T ? o.x : 1); (T ? o.f : 1)(); (T ? o.f : 1)``; typeof (T ? u : 1); g(T ? o.f : 1); T ? function(){}() : 1; g(T ? o : h(/*! c */ 2)); return () => T ? {} : 1 }",
				{},
				"function f(o){g(o),g((o,2)),0,o.x,(0,o.f)(),(0,o.f)``,0,u,g(o.f),g(1?o:h(/*! c */2));return()=>1?{}:1}"
			],
			// So does `&&`, `||` or `??` whose left side is known.
			[
				"function f(o){ const T = 1, N = null; g(T && o.f, T || o, N ?? o, T ?? o); delete (T && o.x); (T && o.f)(); T && function(){}(); g(T || h(/*! c */ 2)) }",
				{},
				"function f(o){g(o.f,1,o,1),0,o.x,(0,o.f)(),g(1||h(/*! c */2))}"
			],
			// A branch that is no expression keeps the `if`, a sequence test is parenthesized, and a dead `if` declaring only in its own scopes goes.
			[
				"function f(a, b){ const T = 1; if (a) for (;;) g(); else y(); if ((h(), b)) x(); else y(); if (0) { let w = () => { var z } } g([T ? a : 2]) }",
				{},
				"function f(f,e){if(f)for(;;)g();else y();(h(),e)?x():y(),g([f])}"
			],
			// A statement that runs nothing goes, but not a directive, a comment kept, a `#__PURE__` call with `side_effects: false` nor a global a `try` probes for.
			[
				"function f(a){ \"use strict\"; 1, 2; Math.PI; a; \"x\" + 1; a.b; g; /*! c */ 3; try { window } catch (e) {} }",
				{},
				"function f(t){\"use strict\";t.b;g;/*! c */3;try{window}catch(t){}}"
			],
			[
				"function f(a){ a; /*#__PURE__*/ g() }",
				{ compress: {toplevel: false,side_effects: false} },
				"function f(a){a,g()}"
			],
			// Without mangling it compresses the same, names as written.
			[
				"function f(a){ if (a) x(); else y(); Math.PI; a - 1 }",
				{ mangle: false },
				"function f(a){a?x():y(),a-1}"
			],
			[
				"function f(a){ g((1 || -a) ? 1 : 2, (1 || Math.PI) ? 3 : 4) }",
				{ mangle: false },
				"function f(a){g(1,3)}"
			],
			[
				"function f(a){ if (0) { a = function(){ var z } } return a }",
				{},
				"function f(n){return n}"
			],
			// A value folds past what reads the same after it runs: a global callee, for a local, `await`, a literal, `this`, a name nothing writes and the stable left of a binary or computed member.
			[
				"async function f(p){ var a = g(); h(p, 1, this, a); var b = g(); new K(p, b); var c = g(); i(await c); var d = g(); j(p + d); var e = g(); k(p[e]); var m = g(); l([p, , m]); var n = g(); o({ x: p, y: n }); var q = g(); r((p, q)) }",
				{},
				"async function f(a){h(a,1,this,g()),new K(a,g()),i(await g()),j(a+g()),k(a[g()]),l([a,,g()]),o({x:a,y:g()}),r(g())}"
			],
			// But not past a spread, shorthand, computed key, getter or template part before it, an optional member, a global the value sets, a name something writes, nor where `eval` may read it.
			[
				"function f(p){ var a = g(); h(...p, a); var b = g(); h({ p, b }); var c = g(); h({ [p]: 1, c }); var d = g(); h({ get x(){}, y: d }); var e = g(); h(`${p}${e}`); var m = g(); h(p?.[m]); var n = (h = g)(); h(n); var q = (h++, g()); h(q); var r = g(); h(p, r); p = 1 } function k(){ var a = g(); h(a); eval(\"\") } function l(){ x = g(); h(x) }",
				{},
				"function f(a){var r=g();h(...a,r);var v=g();h({p:a,b:v});var n=g();h({[a]:1,c:n});var p=g();h({get x(){},y:p});var c=g();h(`${a}${c}`);var e=g();h(a?.[e]);var f=(h=g)();h(f);var t=(h++,g());h(t);var i=g();h(a,i),a=1}function k(){var a=g();h(a),eval(\"\")}function l(){x=g(),h(x)}"
			],
			// Each declarator folds into the next value after it, past one without a value.
			[
				"function f(){ let a = g(), b = h(a), c = i(b), d; j(c, d) }",
				{},
				"function f(){let c;j(i(h(g())),c)}"
			],
			// After a body that always leaves, what the `else` holds prints after the `if` where a list holds it, but not a block scoping a name or keeping a comment.
			[
				"function f(a, b){ if (a) return 1; else b(); if (b) { x(); return 2 } else { y(); z() } if (a) throw 1; else { let q = g(); h(q) } while (a) { if (b) break; else w() } for (;;) { if (a) continue; else { /*! c */ v() } } if (b) return; else if (a) v(); else u(); } for (;;) if (a) break; else b(); l: if (a) break l; else b(); switch (a) { case 1: if (b) break; else c() }",
				{},
				"function f(e,a){if(e)return 1;a();if(a)return x(),2;y(),z();if(e)throw 1;h(g());while(e&&!a)w();for(;;)if(!e){/*! c */v()}if(!a)e?v():u()}for(;!a;)b();e:if(!a)b();switch(a){case 1:if(b)break;c()}"
			],
			[
				"function f(a){ if (a) return 1; else { class C {} g(new C) } if (a) return 2; else { function q(){} q() } if (a) return 3; else /*! c */ { h() } }",
				{},
				"function f(e){if(e)return 1;else{class f{}g(new f)}if(e)return 2;else{function n(){}n()}if(e)return 3;else/*! c */{h()}}"
			],
			// A value `using` or `await using` disposes of folds nowhere.
			[
				"async function f(){ await using x = g(); h(x) } async function k(){ await using y = g(), z = q(y); h(z) } function m(){ using w = g(); h(w) }",
				{},
				"async function f(){await using n=g();h(n)}async function k(){await using n=g(),i=q(n);h(i)}function m(){using n=g();h(n)}"
			],
			// Dividing a bigint by zero or raising it to a negative power throws, so it stays unless the right side is a literal that cannot.
			[
				"function b(a){ 1n / 0n; 2n ** -1n; 1n % 0n; 1n / 2n; 1n % 3n; 2n ** 3n; 1n / (2n); 1n / a; 1n + 2n }",
				{},
				"function b(n){1n/0n,2n**-1n,1n%0n,1n/n}"
			],
			// A `switch` drops a `break` ending it and a `default` doing nothing last, and a value folds into `import()`.
			[
				"function f(c){ switch (c) { case -1: c = 1; break; case 0: c = 2; break; default: break } switch (c) { case 1: x(); break } switch (c) { default: break } switch (c) { case 1: y(); break; default: } a: switch (c) { case 1: z(); break a } switch (c) { case 1: y(); /*! c */ break } var i = r(c); return import(i) }",
				{},
				"function f(c){switch(c){case-1:c=1;break;case 0:c=2}if(c===1)x();if(c===1)y();c:switch(c){case 1:z();break c}switch(c){case 1:y();/*! c */break}return import(r(c))}"
			],
			// `!!!x` read for its truth folds its innermost `!!` alone; a test swaps its branches for the `!` left.
			[
				"function f(x) { if (!!!x) g(); if (!!!!x) h(); return [!!!x ? 1 : 2, !!!x] }",
				{},
				"function f(x){if(!x)g();if(x)h();return[x?2:1,!x]}"
			],
			// A parameter `arguments` reads keeps what sets it.
			[
				"function f(a) { a = 1; return arguments[0] } function k(b) { b = 1; return () => arguments } function m(c) { c = 1; return function () { return arguments } }",
				{},
				"function f(n){return n=1,arguments[0]}function k(n){n=1;return()=>arguments}function m(n){return function(){return arguments}}"
			],
			// A function called with nothing but names never written passed prints as what it returns.
			[
				"function f(g) { var h = function () { return g.a }; function k() { return g.b } return [h(), k(), (() => ({ a: 1 }))(), (function () { return g.c + 1 })() * 2] }",
				{},
				"function f(n){return[n.a,n.b,{a:1},(n.c+1)*2]}"
			],
			[
				"function f(s, e) { (() => ({ a: 1 }))(); return [((x, y) => x + y)(s, e), ((x) => (x, 1))(s)] }",
				{},
				"function f(x,e){return[x+e,(x,1)]}"
			],
			[
				"function f(a, b) { a = 2; return [((x) => x + 1)(a), ((x) => () => x)(b), (function () { return this })(), (function n() { return n })(), (async () => 1)(), ((x) => x)(b, b), (() => 1)?.()] }",
				{},
				"function f(n,t){n=2;return[(n=>n+1)(n),(n=>()=>n)(t),function(){return this}(),function n(){return n}(),(async()=>1)(),(n=>n)(t,t),(()=>1)()]}"
			],
			// The assignment every branch of a chain ends in prints once, before its test.
			[
				"function f(e, t) { if (e === 7) t += \"a\"; else if (e === 8) t += \"b\"; else t += e; if (e()) t += 1; else t += 2; return [t, e ? t = 1 : t = 2, e ? t = 1 : t += 2, e ? t = 1 : o.t = 2] }",
				{},
				"function f(e,t){t+=e===7?\"a\":e===8?\"b\":e,e()?t+=1:t+=2;return[t,t=e?1:2,e?t=1:t+=2,e?t=1:o.t=2]}"
			],
			// `if`s next to each other leaving alike test as one.
			[
				"function f(a, b, c) { for (const t of a) { if (t < 1) continue; if (t > 9) { continue } g(t) } if (a) return; if (b = c, b) return; if (a ?? b) return; if (c) break_(); g() }",
				{},
				"function f(t,f,n){for(let f of t){if(f<1||f>9)continue;g(f)}if(t||(f=n,f)||(t??f))return;if(n)break_();g()}"
			],
			// A conditional `dead_code` folds keeps the assignment of the branch it prints.
			[
				"function f(c) { var a = 0, b = 0; true ? a = 1 : a = 2; c ? (0 ? b = 1 : b = 2) : b = 3; return [a, b] }",
				{},
				"function f(a){var b=0,r=0;b=1,r=a?2:3;return[b,r]}"
			],
			// A global or labelled exit stays; a name nothing mangles prints as written.
			[
				'var t; if (a === 1) t = "x"; else t = "y"; function f(a) { if (a) X = 1; else X = 2; l: { for (;;) { if (a) break l; if (!a) break l; g() } } }',
				{},
				'var t;t=a===1?"x":"y";function f(a){a?X=1:X=2;a:for(;;){if(a)break a;if(!a)break a;g()}}'
			],
			// A function declaration read once before it prints there, but in a loop.
			[
				"function f(t) { t.exports = u; function u() { return g() } return t } function k(t) { for (var i = 0; i < 2; i++) t.push(v); function v() {} return t } function m(t) { t.a = w; var r = h(); function w(e) { return r(e) } return t }",
				{},
				"function f(t){return t.exports=function(){return g()},t}function k(t){for(var n=0;n<2;n++)t.push(r);function r(){}return t}function m(t){t.a=function(t){return n(t)};var n=h();return t}"
			],
			// One holding a function moved after the read stays, until a reprint.
			[
				"function f(t) { t.e = a; function c() { h(); return g(1) } function a() { return c() } return t }",
				{},
				"function f(n){n.e=t;function t(){return function(){return h(),g(1)}()}return n}"
			],
			// One printed first inside another printed first prints where that one does.
			[
				"function f() { function w() { return b() } function a() { return x() } function b() { return c() } function c() { return a() } return w() }",
				{},
				"function f(){function n(){return x()}return n()}"
			],
			// What only unread code reads goes, though it would print first.
			[
				"function f() { function w() { return b() } function a() { return x() } function b() { return a() } }",
				{},
				"function f(){}"
			],
			[
				"u(); function u() { return g() }",
				{ compress: { toplevel: true }, mangle: { toplevel: true } },
				"u();function u(){return g()}"
			],
			// One reading its own `arguments` keeps one identity across calls.
			[
				"function f() { function r() { return a() } function a() { return arguments.callee } function s() { return b(1) } function b(n) { return () => n } return [r(), r(), s(), s()] }",
				{},
				"function f(){function n(){return r()}function r(){return arguments.callee}function t(){return function(){return()=>1}()}return[n(),n(),t(),t()]}"
			],
			// A literal of constants folds into its read where that runs once.
			[
				'function f(n, e) { let A = { negated: false, prefix: "" }; return n(e, A) } function k(n) { let C = [1, ["a"]]; return n.map(() => C) } function m() { let D = {}; return delete D }',
				{},
				'function f(e,n){return e(n,{negated:!1,prefix:""})}function k(e){let n=[1,["a"]];return e.map(()=>n)}function m(){let e={};return delete e}'
			],
			// Literals a string adds join; an operation folds in bare where it may.
			[
				'function f(b, c) { var j = "(?:" + b + "|" + c + ")", re = j + "?"; return [re + re, b + 1 + "a " + true, (b + "a") + 1] }',
				{},
				'function f(r,e){var b="(?:"+r+"|"+e+")"+"?";return[b+b,r+1+"a true",r+"a1"]}'
			],
			[
				"function a(b,c){var j=b-c;return 10-j}function d(b,c){var j=b-c;return j-10}function e(b,c){var j=b+c;return j*2}function h(b,c){var j=b??c;return j||3}function k(b,c){var j=b**c;return j**2}function l(b,c){var j=b+c;return j(1)}function m(b,c){var j=b&&c;return j.x}function n(b,c){var j=b+c;return g(j,1)}function o(b,c){var j=b+c;throw j}function p(b,c){var j=b+c;return[j]}function q(b,c){var j=b+c;return`${j}`}function r(b,c){var j=b+c;return j?1:2}function s(b,c){var j=b+c;return{x:j}}function t(b,c){var j=b+c;return{[j]:1}}function v(b,c){var j=b+c;return[...j]}function w(b,c){var j=b+c;return new G(j)}function x(b,c){var j=function(){}+c;return j}function y(b,c){var j=b+c,z=j;return z}",
				{},
				"function a(n,c){return 10-(n-c)}function d(n,c){return n-c-10}function e(n,c){return(n+c)*2}function h(n,c){return(n??c)||3}function k(n,c){return(n**c)**2}function l(n,c){return(n+c)(1)}function m(n,c){return(n&&c).x}function n(n,c){return g(n+c,1)}function o(n,c){throw n+c}function p(n,c){return[n+c]}function q(n,c){return`${n+c}`}function r(n,c){return n+c?1:2}function s(n,c){return{x:n+c}}function t(n,c){var r=n+c;return{[r]:1}}function v(n,c){var r=n+c;return[...r]}function w(n,c){return new G(n+c)}function x(n,c){return function(){}+c}function y(n,c){return n+c}"
			],
			[
				"function f(n){let A=[1,,g()];return[n.y,A]}function k(n){let B={...n};return[n.y,B]}function m(n){let C={get x(){return 1}};return[n.y,C]}function o(n){let D={[n]:1};return[n.y,D]}function p(n){let E={f(){}};return[n.y,E]}function q(n){let F=[1];return[n.y,/*! c */F]}function r(n){let H=[1];return[n.y,delete H]}function s(n){let I=[1];return[n.y,()=>I]}function t(n){let J=[1,,2];return[n.y,J]}",
				{},
				"function f(n){let t=[1,,g()];return[n.y,t]}function k(n){let t={...n};return[n.y,t]}function m(n){let t={get x(){return 1}};return[n.y,t]}function o(n){let t={[n]:1};return[n.y,t]}function p(n){let t={f(){}};return[n.y,t]}function q(n){let t=[1];return[n.y,/*! c */t]}function r(n){let t=[1];return[n.y,delete t]}function s(n){let t=[1];return[n.y,()=>t]}function t(n){return[n.y,[1,,2]]}"
			],
			[
				"function u(b,c){var j=b||c;return j??1}function z(b,c){var j=b+c,k;k=j;return k}",
				{},
				"function u(c,n){return(c||n)??1}function z(c,n){return c+n}"
			],
			[
				"(function () { u(); function u() { console.log(g()) } })()",
				{},
				"!function(){n();function n(){console.log(g())}}();"
			],
			[
				"function f(o) { return [typeof (function () { return undeclaredX })(), delete (() => o.p)(), ((x) => x.m)(o)()] }",
				{},
				"function f(e){return[typeof(0,undeclaredX),delete(0,e.p),(0,e.m)()]}"
			],
			[
				"function f(o) { var h = function () { return o.m }; const k = () => undeclaredY; return [h()(), typeof k()] }",
				{},
				"function f(n){return[(0,n.m)(),typeof(0,undeclaredY)]}"
			],
			[
				'function f(a) { const k = 1; let r = [((x) => x + 1)(k), ((x) => 1)(later), (function () { return eval("a") })(), (function () { return () => this })(), (function () { return () => arguments })()]; const later = 2; return r }',
				{},
				'function f(a){const k=1;let r=[k+1,(n=>1)(later),function(){return eval("a")}(),function(){return()=>this}(),function(){return()=>arguments}()];const later=2;return r}'
			],
			[
				"function f(a, b, o) { (() => o.x = b)(); (() => ({ a: g() }))(); g((() => a + b)()); new G((() => a - b)()); o.y = (() => a * b)(); o[(() => a + b)()] = 1; return [`${(() => a + b)()}`, ...(() => [a])(), { p: (() => a + b)(), [(() => a | b)()]: 1 }, (() => \"s\")(), (() => `t${a}`)(), (() => -a)()] }",
				{},
				'function f(a,b,o){o.x=b;({a:g()});g(a+b),new G(a-b),o.y=a*b,o[a+b]=1;return[`${a+b}`,...[a],{p:a+b,[a|b]:1},"s",`t${a}`,-a]}'
			],
			[
				"function f() { return [(function () { g() })(), (function () { return })(), (function () { return new.target })(), (function () { return class {} })(), (function n() { return function () { return 1 } })(), (function n() { return function () { return n } })(), (function () { return function () { return 1 } })()] } class A extends B { m() { return (() => super.m())() } } function h(a, b) { throw (() => a + b)() } function k(a, b) { var v = (() => a % b)(); g(v); g(v) }",
				{},
				"function f(){return[function(){g()}(),function(){}(),function(){return new.target}(),class{},function(){return 1},function n(){return function(){return n}}(),function(){return 1}]}class A extends B{m(){return(()=>super.m())()}}function h(n,t){throw n+t}function k(n,t){var r=n%t;g(r),g(r)}"
			],
			[
				"function f(y) { var h = function (x) { return x.a }; return [((x) => x)(/*! a */ y), (function () { /*! b */ return y })(), h(/*! c */ y)] }",
				{},
				"function f(n){return[(n=>n)(/*! a */n),function(){/*! b */return n}(),function(n){return n.a}(/*! c */n)]}"
			],
			// Not mangled, the definitions still merge the assignments.
			[
				"function f(c) { var a; c ? a = 1 : a = 2; return a }",
				{ mangle: false },
				"function f(c){var a;return a=c?1:2,a}"
			],
			// A call prints as its value only where what it passes prints as named.
			[
				"(function () { var x = 7; function h(k) { return k() } function f(a) { var g = function () { return x }; return h(g) + a } g(f(3)) })(); (function () { function h(k) { return k + 1 } function f(a) { var c = 5; return h(c) + a } g(f(3)) })(); (function () { function h(k) { return k.v } function f(a) { var c = { v: 5 }; return h(c) + a } g(f(3)) })()",
				{},
				"!function(){g(function(){return function(n){return n()}(function(){return 7})+3}())}(),function(){g(function(){return 6}()+3)}(),function(){g(function(n){return n.v}({v:5})+3)}();"
			],
			[
				"function f(a){ if (0) x(); Math.PI }",
				{ compress: {toplevel: false,builtins_ecma: 2020},format: {comments: false} },
				"function f(f){}"
			],
			// A function or constant read as a shorthand prints as its value.
			[
				"function m(o) { function add(a) { o.x(a) } function stop() { o.y() } return { add, stop } }",
				{},
				"function m(o){return{add:function(n){o.x(n)},stop:function(){o.y()}}}"
			],
			[
				"function m(b) { var dot = \"\\\\.\", slash = \"\\\\/\", end = `(?:${slash}|$)`; return { dot, end, ends: b + end } }",
				{},
				"function m(n){return{dot:\"\\\\.\",end:\"(?:\\\\/|$)\",ends:n+\"(?:\\\\/|$)\"}}"
			],
			[
				"function m() { var __proto__ = 1; return { __proto__ } }",
				{},
				"function m(){return{[\"__proto__\"]:1}}"
			],
			// A known test prints the branch it picks, a block in its list.
			[
				"function f(){ const t = 1; if (t) { a(); b() } else c(); if (!t) d(); else { e(); g() } if (t) h() }",
				{},
				"function f(){a(),b();e(),g();h()}"
			],
			// An arrow's chain opening with an object is parenthesized past what goes.
			[
				"g(x => { var u = 1; if ({}.a) return 1; return 2 })",
				{},
				"g(r=>({}.a?1:2));"
			],
			// A value printed where a read opening a statement was keeps its parentheses.
			[
				"function f(){ var c = {}.a ? g() : h(); c, 1; var d = function(){}.call() ? g() : h(); d; (() => ({}.a ? g() : 2))(), g() }",
				{},
				"function f(){({}.a?g():h());(function(){}.call()?g():h());({}.a?g():2),g()}"
			],
			// A function declared as the branch kept declares it only once that runs.
			[
				"g(function(){ g(typeof f); if (1) function f(){} if (0) ; else function h(){} g(f, h) })",
				{},
				"g(function(){g(typeof f);if(1)function f(){}if(!0)function n(){}g(f,n)});"
			],
			// With shorthands, a name printing otherwise than its key prints after it.
			[
				"function m(o){ var add = g(), b = h(); function f(a){ o.x(a) } var c = \"x\"; var __proto__ = g(); return { add, b, f, c, __proto__ } }",
				{ ecma: 2015 },
				"function m(o){var _=g(),b=h(),a=g();return{add:_,b,f:function(_){o.x(_)},c:`x`,[\"__proto__\"]:a}}"
			],
			// A function expression's name that goes takes no name from its scope.
			[
				"function m(o) { var T = function Token(label, options) { this.label = label; this.options = options }; return [new T(o, 1), new T(o, 2)] }",
				{},
				"function m(o){var n=function(o,n){this.label=o,this.options=n};return[new n(o,1),new n(o,2)]}"
			],
			// A value folded into its one read takes the parentheses that read needs.
			["function f(a){var b=!a;return b.x}", {}, "function f(a){return(!a).x}"],
			["function f(a){var b=-a;return b(1)}", {}, "function f(a){return(-a)(1)}"],
			["function f(a){var b=-a;return b**2}", {}, "function f(a){return(-a)**2}"],
			["function f(a){var b=-a;return 2**b}", {}, "function f(a){return 2**-a}"],
			["function f(a){var b=-a;return[b]}", {}, "function f(a){return[-a]}"],
			["function f(a,c){var b=a+1;return c[b]}", {}, "function f(a,c){return c[a+1]}"],
			["function f(a,c){var b=a+1;return[b]}", {}, "function f(a,n){return[a+1]}"],
			["function f(a){var b=function(){}.x+a;b,g()}", {}, "function f(n){(function(){}.x+n),g()}"],
			["function f(){var b={}.x=1;b,g()}", {}, "function f(){({}.x=1),g()}"],
			["function f(a){var b={x:a()};b.y,g()}", {}, "function f(a){({x:a()}).y,g()}"],
			["function f(a){var b=class{};return b.name}", {}, "function f(a){return class{}.name}"],
			["function f(a){var b=function(){return a};b.call()}", {}, "function f(n){(function(){return n}).call()}"],
			["function f(a){var c={}.x;var b=c+1;b,g()}", {}, "function f(a){({}.x+1),g()}"],
			["function f(a){var b=a+1;return\"x\"+b+\"y\"}", {}, "function f(a){return\"x\"+(a+1)+\"y\"}"],
			["function f(a){var b=a+1;return`${b}`}", {}, "function f(a){return`${a+1}`}"],
			["function f(a){var b=function(){};b.x=a}", {}, "function f(n){(function(){}).x=n}"],
			["function f(a){var b=function(){};return b.x}", {}, "function f(n){return function(){}.x}"],
			["function f(a){var b=a&&c;return b?1:2}", {}, "function f(a){return a&&c?1:2}"],
			["function f(a){var b=-a;return b?1:2}", {}, "function f(a){return-a?1:2}"],
			// A sequence a declarator set prints bare where a `return`, `throw` or sequence reads it.
			["function f(a){var b=(a(),1);g(b)}", {}, "function f(a){g((a(),1))}"],
			["function f(a){var b=(a,1);return b}", {}, "function f(a){return 1}"],
			// An item that may print as a sequence itself keeps the parentheses, as an argument would split.
			["a=\"PASS\";console.log({a:\"FAIL\",b:function(){return function(c){return c.a}((String,(Object,function(){return this}())))}}.b())", {}, "a=\"PASS\",console.log({a:\"FAIL\",b:function(){return function(n){return n.a}((String,Object,function(){return this}()))}}.b());"],
			// One item left of it printed bare, so a `return` takes it whole.
			["function f(a,c){var b=(a,(c+1).x);return b}", {}, "function f(a,c){return(c+1).x}"],
			["function f(a){var b=(a,1);throw b}", {}, "function f(a){throw 1}"],
			["function f(a){var b=(a,1);return b,2}", {}, "function f(a){return 1,2}"],
			["function f(a){var b=(a,1);return b.x}", {}, "function f(a){return(1).x}"],
			// A test known to be pure goes with the branch it never takes.
			["function f(){if((0))g()}", {}, "function f(){}"],
			["function f(){if(0&&x())g()}", {}, "function f(){}"],
			["function f(){if(1||x())g()}", {}, "function f(){g()}"],
			["function f(){if(1??x())g()}", {}, "function f(){g()}"],
			["function f(){return(0)?a():b()}", {}, "function f(){return b()}"],
			["function f(){var x=(1);if(x)g()}", {}, "function f(){g()}"],
			// `if` chains returning print as one `return t?x:y`, booleans as `!`.
			["function f(a,b){if(a)return 1;else if(b)return 2;else return 3}", {}, "function f(e,r){return e?1:r?2:3}"],
			["function f(a){if(a)return!0;return!1}", {}, "function f(n){return!!n}"],
			["function f(a){if(a)return false;else return true}", {}, "function f(e){return!e}"],
			["function f(a,b){if(a)return true;if(b)return 1;return false}", {}, "function f(r,e){return r?!0:e?1:!1}"],
			["const f=(a,b)=>{;if({}.x)return 1;if(b)return 2;return 3}", {}, "const f=(r,n)=>({}.x?1:n?2:3);"],
			["function f(a,b,c){if(a){;if(b)return 1;if(c)return 4;return 2}return 3}", {}, "function f(r,n,f){return r?n?1:f?4:2:3}"],
			// So do chains throwing, esbuild's `throw t?x:y`; one mixing `return` and `throw`, a body not one `throw`, or an exit dead code drops keeps its `if`.
			["function f(a,b){if(!a)throw b;throw 1}function g(){if(a)throw b();else throw c()}function h(){if(a)throw b;if(c)throw d;throw e}function i(){if(a){throw b}throw c}function j(){if(a)throw b,c;throw d}function k(){if(a)throw b;else throw b}f=()=>{if(a)throw b;throw c}", {}, "function f(o,t){throw o?1:t}function g(){throw a?b():c()}function h(){throw a?b:c?d:e}function i(){throw a?b:c}function j(){throw a?(b,c):d}function k(){throw a,b}f=()=>{throw a?b:c};"],
			["function f(){if(a)throw b;return c}function g(){if(a)return b;if(c)throw d;return e}function h(){if(a){g();throw b}throw c}function i(){if(a)return b;throw c}", {}, "function f(){if(a)throw b;return c}function g(){if(a)return b;if(c)throw d;return e}function h(){if(a){g();throw b}throw c}function i(){if(a)return b;throw c}"],
			["function f(){return 1;if(d)/*j*/return e;return g}function h(){throw 1;if(d)/*j*/throw e;throw g}", { format: { comments: "all" } }, "function f(){return 1;if(d)/*j*/return e}function h(){throw 1;if(d)/*j*/throw e}"],
			// An empty statement prints nothing, a block of only those as `;`.
			["function f(a){if(a){;}else g()}", {}, "function f(f){if(!f)g()}"],
			["while(a){;}", {}, "while(a);"],
			// A `RegExp` built from constants that parse goes unused; one that throws stays.
			["function m(){f();var rangeChars=\"abcdefghijklmnopq\";new RegExp(\"[\"+rangeChars+\"]\");new RegExp(\"[\"+rangeChars+\"0-9]\",\"g\")}", {}, "function m(){f()}"],
			["function m(){new RegExp(\"[\");RegExp(\"a\",\"q\")}", {}, "function m(){RegExp(\"[\"),RegExp(\"a\",\"q\")}"],
			["function m(RegExp){new RegExp(\"a\")}", {}, "function m(e){new e(\"a\")}"],
			// A `var` set after a call folds where its function reads it after the declaration.
			["function m(){f();var greeting=\"hello\";g(greeting+\"!\")}", {}, "function m(){f(),g(\"hello!\")}"],
			["function m(){g(greeting+\"!\");var greeting=\"hello\"}", {}, "function m(){g(e+\"!\");var e=\"hello\"}"],
			["function m(){function g(){return greeting}f();var greeting=\"hello\";g(greeting)}", {}, "function m(){f()}"],
			["function m(){f();var contraction=\"(?:d|ll|m|re|s|t|ve)?\";g(\"x\"+contraction,\"y\"+contraction,contraction)}", {}, "function m(){f(),g(\"x(?:d|ll|m|re|s|t|ve)?\",\"y(?:d|ll|m|re|s|t|ve)?\",\"(?:d|ll|m|re|s|t|ve)?\")}"],
			// A fold weighs the operands as printed, a string's run joined.
			["f(x+\"a\"+\"b\"+1)", {}, "f(x+\"ab1\");"],
			// A hundred strings print as one string split on a delimiter none holds.
			["g([\"w0\",\"w1\",\"w2\",\"w3\",\"w4\",\"w5\",\"w6\",\"w7\",\"w8\",\"w9\",\"w10\",\"w11\",\"w12\",\"w13\",\"w14\",\"w15\",\"w16\",\"w17\",\"w18\",\"w19\",\"w20\",\"w21\",\"w22\",\"w23\",\"w24\",\"w25\",\"w26\",\"w27\",\"w28\",\"w29\",\"w30\",\"w31\",\"w32\",\"w33\",\"w34\",\"w35\",\"w36\",\"w37\",\"w38\",\"w39\",\"w40\",\"w41\",\"w42\",\"w43\",\"w44\",\"w45\",\"w46\",\"w47\",\"w48\",\"w49\",\"w50\",\"w51\",\"w52\",\"w53\",\"w54\",\"w55\",\"w56\",\"w57\",\"w58\",\"w59\",\"w60\",\"w61\",\"w62\",\"w63\",\"w64\",\"w65\",\"w66\",\"w67\",\"w68\",\"w69\",\"w70\",\"w71\",\"w72\",\"w73\",\"w74\",\"w75\",\"w76\",\"w77\",\"w78\",\"w79\",\"w80\",\"w81\",\"w82\",\"w83\",\"w84\",\"w85\",\"w86\",\"w87\",\"w88\",\"w89\",\"w90\",\"w91\",\"w92\",\"w93\",\"w94\",\"w95\",\"w96\",\"w97\",\"w98\",\"w99\"])", {}, "g(\"w0.w1.w2.w3.w4.w5.w6.w7.w8.w9.w10.w11.w12.w13.w14.w15.w16.w17.w18.w19.w20.w21.w22.w23.w24.w25.w26.w27.w28.w29.w30.w31.w32.w33.w34.w35.w36.w37.w38.w39.w40.w41.w42.w43.w44.w45.w46.w47.w48.w49.w50.w51.w52.w53.w54.w55.w56.w57.w58.w59.w60.w61.w62.w63.w64.w65.w66.w67.w68.w69.w70.w71.w72.w73.w74.w75.w76.w77.w78.w79.w80.w81.w82.w83.w84.w85.w86.w87.w88.w89.w90.w91.w92.w93.w94.w95.w96.w97.w98.w99\".split(\".\"));"],
			["g([\"w0.,() \",\"w1.,() \",\"w2.,() \",\"w3.,() \",\"w4.,() \",\"w5.,() \",\"w6.,() \",\"w7.,() \",\"w8.,() \",\"w9.,() \",\"w10.,() \",\"w11.,() \",\"w12.,() \",\"w13.,() \",\"w14.,() \",\"w15.,() \",\"w16.,() \",\"w17.,() \",\"w18.,() \",\"w19.,() \",\"w20.,() \",\"w21.,() \",\"w22.,() \",\"w23.,() \",\"w24.,() \",\"w25.,() \",\"w26.,() \",\"w27.,() \",\"w28.,() \",\"w29.,() \",\"w30.,() \",\"w31.,() \",\"w32.,() \",\"w33.,() \",\"w34.,() \",\"w35.,() \",\"w36.,() \",\"w37.,() \",\"w38.,() \",\"w39.,() \",\"w40.,() \",\"w41.,() \",\"w42.,() \",\"w43.,() \",\"w44.,() \",\"w45.,() \",\"w46.,() \",\"w47.,() \",\"w48.,() \",\"w49.,() \",\"w50.,() \",\"w51.,() \",\"w52.,() \",\"w53.,() \",\"w54.,() \",\"w55.,() \",\"w56.,() \",\"w57.,() \",\"w58.,() \",\"w59.,() \",\"w60.,() \",\"w61.,() \",\"w62.,() \",\"w63.,() \",\"w64.,() \",\"w65.,() \",\"w66.,() \",\"w67.,() \",\"w68.,() \",\"w69.,() \",\"w70.,() \",\"w71.,() \",\"w72.,() \",\"w73.,() \",\"w74.,() \",\"w75.,() \",\"w76.,() \",\"w77.,() \",\"w78.,() \",\"w79.,() \",\"w80.,() \",\"w81.,() \",\"w82.,() \",\"w83.,() \",\"w84.,() \",\"w85.,() \",\"w86.,() \",\"w87.,() \",\"w88.,() \",\"w89.,() \",\"w90.,() \",\"w91.,() \",\"w92.,() \",\"w93.,() \",\"w94.,() \",\"w95.,() \",\"w96.,() \",\"w97.,() \",\"w98.,() \",\"w99.,() \"])", {}, "g([\"w0.,() \",\"w1.,() \",\"w2.,() \",\"w3.,() \",\"w4.,() \",\"w5.,() \",\"w6.,() \",\"w7.,() \",\"w8.,() \",\"w9.,() \",\"w10.,() \",\"w11.,() \",\"w12.,() \",\"w13.,() \",\"w14.,() \",\"w15.,() \",\"w16.,() \",\"w17.,() \",\"w18.,() \",\"w19.,() \",\"w20.,() \",\"w21.,() \",\"w22.,() \",\"w23.,() \",\"w24.,() \",\"w25.,() \",\"w26.,() \",\"w27.,() \",\"w28.,() \",\"w29.,() \",\"w30.,() \",\"w31.,() \",\"w32.,() \",\"w33.,() \",\"w34.,() \",\"w35.,() \",\"w36.,() \",\"w37.,() \",\"w38.,() \",\"w39.,() \",\"w40.,() \",\"w41.,() \",\"w42.,() \",\"w43.,() \",\"w44.,() \",\"w45.,() \",\"w46.,() \",\"w47.,() \",\"w48.,() \",\"w49.,() \",\"w50.,() \",\"w51.,() \",\"w52.,() \",\"w53.,() \",\"w54.,() \",\"w55.,() \",\"w56.,() \",\"w57.,() \",\"w58.,() \",\"w59.,() \",\"w60.,() \",\"w61.,() \",\"w62.,() \",\"w63.,() \",\"w64.,() \",\"w65.,() \",\"w66.,() \",\"w67.,() \",\"w68.,() \",\"w69.,() \",\"w70.,() \",\"w71.,() \",\"w72.,() \",\"w73.,() \",\"w74.,() \",\"w75.,() \",\"w76.,() \",\"w77.,() \",\"w78.,() \",\"w79.,() \",\"w80.,() \",\"w81.,() \",\"w82.,() \",\"w83.,() \",\"w84.,() \",\"w85.,() \",\"w86.,() \",\"w87.,() \",\"w88.,() \",\"w89.,() \",\"w90.,() \",\"w91.,() \",\"w92.,() \",\"w93.,() \",\"w94.,() \",\"w95.,() \",\"w96.,() \",\"w97.,() \",\"w98.,() \",\"w99.,() \"]);"],
			// Setting a `const` throws, so the write stays though nothing reads it.
			["function m(){const e=2;e=1;return 3}", {}, "function m(){const n=2;return n=1,3}"],
			// A `const` set to `undefined` prints as a `let` without it.
			["function f(){const c=undefined;g(c);g(c)}", {}, "function f(){let c;g(c),g(c)}"],
			// `-Infinity` prints `-1/0` where a division reads as one value there.
			["function f(){return-Infinity}", {}, "function f(){return-1/0}"],
			["function f(a){return[a/-Infinity,-Infinity/a,(-Infinity).x]}", {}, "function f(n){return[n/-(1/0),-(1/0)/n,(-(1/0)).x]}"],
			// `false` read off and a boolean constructed print shorter in parentheses, `undefined`
			// read off too, and an arrow's body and a class field read the global `undefined` as `void 0`.
			["x=[false.toString(b),new true,new false(1),true.x,undefined.x];y=()=>undefined;class A{u=undefined;static v=undefined}", {}, "x=[(!1).toString(b),new(!0),new(!1)(1),true.x,(void 0).x],y=()=>void 0;class A{u=void 0;static v=void 0}"],
			// A string's index reads its code unit, and its `concat` prints as a template, its constants
			// as text, but where one converted after evaluating another could tell.
			["x=[\"abc\"[1],\"abc\"[\"1\"],\"abc\"[5],\"abc\"[\"01\"],\"\\ud83d\\ude00\"[1],\"abc\"[1]()]", {}, "x=[\"b\",\"b\",\"abc\"[5],\"abc\"[\"01\"],\"\\ude00\",\"abc\"[1]()];"],
			["y=\"translate(\".concat(o.x,\", \").concat(o.y,\")\");z=[\"\".concat(a,1,!0,null),`a${b}`.concat(c),\"a\".concat(b,c),\"a\".concat(...b),a.concat(b),\"a\".concat?.(b)]", { ecma: 2020 }, "y=`translate(${o.x}, ${o.y})`,z=[`${a}1truenull`,`a${b}${c}`,`a`.concat(b,c),`a`.concat(...b),a.concat(b),`a`.concat?.(b)];"],
			["String.prototype.concat=f;x=\"a\".concat(b)", {}, "String.prototype.concat=f,x=\"a\".concat(b);"],
			// What reading throws no more than `typeof` compares to `void 0`, but a name no declaration binds.
			["function f(a){return[typeof a==\"undefined\",\"undefined\"!==typeof a.b,typeof g()!=\"undefined\",typeof c>\"u\"]}", {}, "function f(e){return[e===void 0,e.b!==void 0,g()!==void 0,typeof c>\"u\"]}"],
			// Past `typeof o=="object"`, `o` is an object or `null`, so `null` only where falsy.
			["function f(o,p){if(typeof o==\"object\"&&o!==null)g();return[typeof o===\"object\"&&null!=o,typeof o!=\"object\"||o===null,typeof o==\"object\"&&p!==null,typeof o==\"function\"&&o!==null]}", {}, "function f(o,t){if(\"object\"==typeof o&&o)g();return[\"object\"==typeof o&&!!o,\"object\"!=typeof o||!o,\"object\"==typeof o&&t!==null,\"function\"==typeof o&&o!==null]}"],
			// Nobody reading it, a string added keeps only the other side's conversion, and a template one for each run.
			["\"prefix\"+f();g()+\"suffix\";\"\"+h();\"a\"+1;`a${b}c${d}e`;`${a=1}${b}`", {}, "\"\"+f(),g()+\"\",\"\"+h(),`${b}${d}`,a=1,`${b}`;"],
			["v=function(a,b){\"a\"+ +b;\"a\"+ ++b;b+++\"a\"}", {}, "v=function(a,b){\"\"+ +b,\"\"+ ++b,b+++\"\"};"],
			// A branch a known test drops declares its `var`s still, without their values, each named apart.
			["function f(){if(0){var a=1}else{var b=2}return[a,b]}function g(){if(1)h();else{var c=h(),[d,{e:k=1}]=[2]}return[c,d,k]}", {}, "function f(){var r=2;var e;return[e,r]}function g(){h();var e,r,n;return[e,r,n]}"],
			// A name the dropped branch declares again keeps the value set before it.
			["function f(){var b=7;if(0){var b=5}return b}", {}, "function f(){var r=7;if(0)var r=5;return r}"],
			// A name only the dropped branch reads is declared for nothing.
			["function f(){g();if(0){var c=5,d=c}if(0){var e}return 1}", {}, "function f(){return g(),1}"],
			// A truth known though it runs something decides: past `x()||1` the right side runs, `x()&&0` is the value,
			// and a constant inside a chain of the same operator goes.
			["f((x()||!0)&&y());f((x()&&0)||y());f((x()&&0)&&y());f(x()&&!0&&y);f(a&&1&&b);f(a||0||null);f(a&&\"x\"&&b);f(foo&&false?a():b());f(typeof g()?a:b);x=void 0||c;(x()||!0)&&y()", {}, "f((x()||!0,y())),f(x()&&0||y()),f(x()&&0),f(x()&&y),f(a&&b),f(a||null),f(a&&b),f((foo&&0,b())),f((typeof g(),a)),(x=c)()||1,y();"],
			// De Morgan's laws: a `!` goes into `&&` or `||` where its operands cost less negated, the value staying a boolean,
			// but where a test swaps its branches instead or another `!` takes it.
			["f(!(a==b||c==d));f(!(a&&b));f(!(a==b||g(c)));f(!(x&&!(a||b)));x=!(a==b||c==d)&&e;x=!(a==b&&c==d)&&e;x=!(a==b&&c==d)||e;x=e??!(a==b||c==d);x=-!(a==b||c==d);x=!(a==b||c==d)?1:2;x=!(a||b)?c:d;f(!(!a||b));while(!(!x&&!y))g();for(;!(a||b);)g();if(!(a==b||c==d))throw x", {}, "f(a!=b&&c!=d),f(!a||!b),f(a!=b&&!g(c)),f(!(x&&!a&&!b)),x=a!=b&&c!=d&&e,x=(a!=b||c!=d)&&e,x=a!=b||c!=d||e,x=e??(a!=b&&c!=d),x=-(a!=b&&c!=d),x=a==b||c==d?2:1,x=a||b?d:c,f(!(!a||b));while(x||y)g();for(;!a&&!b;)g();if(a!=b&&c!=d)throw x;"],
			// A sequence left one item where any expression stands bare drops its parentheses, but where it names a function.
			["x=(3,6);let y=(2,a[b]);f((1,2),...(0,c));z=[(1,()=>1)];w={a:(1,b?c:d),[(1,e)]:1,b:(1,()=>1),c:(1,class{})};v=`${(1,a)}`;u=(1,()=>1);for(var t=(1,a in b);;);", {}, "x=6;let y=a[b];f(2,...c),z=[()=>1],w={a:(1,b?c:d),[e]:1,b:(1,()=>1),c:(1,class{})},v=`${a}`,u=(1,()=>1);for(var t=(1,a in b);;);"],
			// A number too big for a double is no name: a binding named `Infinity` does not read it.
			["function f(Infinity){eval(\"\");return[1e500,-1e500,1e500.x,2*1e500]}", {}, "function f(Infinity){eval(\"\");return[1/0,-1/0,(1/0).x,2*(1/0)]}"],
			// A body printing nothing is `;`, and an `if` with one only runs its test.
			["function f(a){for(a of b){}while(a()){}l:{}}", {}, "function f(f){for(f of b);while(f());}"],
			["function f(a){if(a()){}if(a){}else b()}", {}, "function f(f){f();if(!f)b()}"],
			["function f(x){if(x){if(a()){}}else b()}", {}, "function f(f){if(f)a();else b()}"],
			// `!t?a:b` is `t?b:a`, but where the test would open a statement.
			["function f(a){return[!a?b:c,!(a||b)?c:d,! --a?b:c,!!a?b:c]}", {}, "function f(a){return[a?c:b,a||b?d:c,--a?c:b,a?b:c]}"],
			["function f(a){if(!a)b();else c()}", {}, "function f(f){f?c():b()}"],
			["function f(){!function(){}()?a():b()}", {}, "function f(){!function(){}()?a():b()}"],
			["function f(n){if(!n)return 2;return g(n)}", {}, "function f(n){return n?g(n):2}"],
			["function f(n){if(!n){return a,b}return c}", {}, "function f(n){return n?c:(a,b)}"],
			// A test already a boolean takes no `!!`.
			["function f(n){if(!n)return!0;return!1}", {}, "function f(n){return!n}"],
			["function f(n){if(n>1)return!0;return!1}", {}, "function f(n){return n>1}"],
			["function f(a,b){return a instanceof b?!0:!1}", {}, "function f(n,a){return n instanceof a}"],
			// Writing a function runs nothing, so its `typeof` is known.
			["function f(){return[typeof function(){},typeof(()=>4)]}", {}, "function f(){return[\"function\",\"function\"]}"],
			// A call prints as the value returned where the rest of the body prints nothing.
			["function f(c){var r=function(){var v;v=c.push(3);return v}();return[r,r]}", {}, "function f(r){var n=r.push(3);return[n,n]}"],
			["function f(c){function g(){var v;v=c.push(3);return v}var r=g();return[r,r]}", {}, "function f(r){var n=r.push(3);return[n,n]}"],
			["function f(o){return function(){var v;v=o.m;return v}()()}", {}, "function f(n){return(0,n.m)()}"],
			// A name of the function the value would print as stays inside it.
			["function f(){var r=function(){var v;return v}();return[r,r]}", {}, "function f(){var r=function(){var r;return r}();return[r,r]}"],
			// `if(t)return;x` ending a function is `if(!t)x`, and a guarded `if` continues the test.
			["function f(a,b){if(a)return;if(b)return 1}", {}, "function f(f,n){if(!f&&n)return 1}"],
			["function f(a,b){if(!(a||b))return;if(b)g()}", {}, "function f(f,b){if((f||b)&&b)g()}"],
			["function f(a){if(a)return;g()}", {}, "function f(f){if(!f)g()}"],
			["function f(a){if(a)return;g();h()}", {}, "function f(f){if(!f)g(),h()}"],
			["function f(a,b){if(a)return;if(b)return 1;else g()}", {}, "function f(e,f){if(!e){if(f)return 1;g()}}"],
			// A test giving a boolean picks a branch as `||` or `&&` would.
			["function f(a,b){return[a==b?!0:x,!a?!0:x,a<b?x:!1]}", {}, "function f(a,b){return[a==b||x,!a||x,a<b&&x]}"],
			// `a ? x : true` is `!a || x` whatever `a` is, `a ? x : false` stays.
			["function f(a){return[a?x:!0,a?x:!1]}", {}, "function f(a){return[!a||x,a?x:!1]}"],
			// What runs nothing in a sequence goes, its last value where nothing reads it, but where one left would read as another.
			["function f(n,o){for(;n;0,n--,0)a(),0,b();return[(1,o.m),(1,2,o.m)(),(a(),0,1)]}", {}, "function f(n,o){for(;n;n--)a(),b();return[o.m,(0,o.m)(),(a(),1)]}"],
			["function f(a,r){return[(0,a).x(r),(0,a.b).c,(1,2).x,(0,let).x]}", {}, "function f(r,a){return[r.x(a),r.b.c,(1,2).x,(0,let).x]}"],
			["function f(){0,{}.a.b;0,a(),{}.a.b}", {}, "function f(){0,{}.a.b,a(),{}.a.b}"],
			// A `!` the compressor adds before an equality flips its operator, one written stays.
			["function f(a,b){if(a!==b)return;h(a==b?x:!0,a===b?!1:x,!(a==b))}", {}, "function f(a,b){if(a===b)h(a!=b||x,a!==b&&x,a!=b)}"],
			// A body of expressions prints as one sequence, without braces.
			["function f(x){if(x){a();b()}else c();while(x){a();var y;b()}if(x){a();(function(){if(x)b();c()})()}}", {}, "function f(f){if(f)a(),b();else c();while(f)a(),b();if(f)a(),function(){if(f)b();c()}()}"],
			// asm.js keeps its statements and sequences as written.
			["function m(){\"use asm\";function f(a){a=a|0;if(a){a=a+1|0;a=(0,a+2)|0}return a|0}return f}", {}, "function m(){\"use asm\";return function(a){if(a=a|0){a=a+1|0;a=(0,a+2)|0}return a|0}}"],
			// An arrow of expressions ending in a `return` of a value prints as their sequence.
			["function f(){return[x=>{a();return b},x=>{a();b();return{c:1}},x=>{a();var y;return y}]}", {}, "function f(){return[r=>(a(),b),r=>(a(),b(),{c:1}),r=>{a();var n;return n}]}"],
			// A guard takes any one statement but a labeled one, or an `if` printing its kept branch.
			["function f(a){if(a)return;var x;throw g()}", {}, "function f(r){if(!r)throw g()}"],
			["function f(a){if(a)return;for(;;)g()}", {}, "function f(f){if(!f)for(;;)g()}"],
			["function f(a,o){if(a)return;for(var k in o)g(k)}", {}, "function f(f,n){if(!f)for(var o in n)g(o)}"],
			["function f(a,o){if(a)return;for(var k of o)g(k)}", {}, "function f(f,o){if(!f)for(var r of o)g(r)}"],
			["function f(a){if(a)return;while(a)g()}", {}, "function f(a){if(!a)while(a)g()}"],
			["function f(a){if(a)return;do g();while(a)}", {}, "function f(a){if(!a)do{g()}while(a)}"],
			["function f(a){if(a)return;switch(a){case 1:g()}}", {}, "function f(a){if(!a)if(a===1)g()}"],
			["function f(a){if(a)return;try{g()}catch(e){}}", {}, "function f(t){if(!t)try{g()}catch(t){}}"],
			["function f(a){if(a)return;l:g()}", {}, "function f(f){if(!f){g()}}"],
			["function f(a){if(a)return;if(1)g()}", {}, "function f(f){if(!f)g()}"],
			["function f(y){(function(x){if(x)return;if(g(x))return 3})(y)}", {}, "function f(n){!function(n){if(!n&&g(n))return}(n)}"],
			// `if(!t)x;else y` swaps inside the `?:` it is a branch of.
			["function f(x){if(x){if(!a)b();else c()}else d()}", {}, "function f(e){e?a?c():b():d()}"],
			// What no literal reads of itself stays.
			["function f(){return[[1].source,\"ab\".source,/a/.length,1..length]}", {}, "function f(){return[[1].source,\"ab\".source,/a/.length,1..length]}"],
			// An arrow's sequence is its expressions and the value returned, nothing after.
			["f=x=>{a();return b;g()}", { compress: { dead_code: false } }, "f=r=>{return a(),b;g()};"],
			// Joined into a `return` taking a space more, an `if` body drops its braces, unless more prints after it.
			["function x(){if(c){a(),b();return!1}if(d){k();return!1;g()}}", { compress: { dead_code: false } }, "function x(){if(c)return a(),b(),!1;if(d){k();return!1;g()}}"],
			["f=x=>{a();return}", {}, "f=r=>{a()};"],
			["f=x=>{a();var y;return b}", {}, "f=r=>(a(),b);"],
			["function f(x){return[(g(),0,h()),(0,a).b]}", { compress: { side_effects: false } }, "function f(n){return[(g(),0,h()),(0,a).b]}"],
			["f=x=>{a();return b};g((0,a).b)", { compress: false }, "f=r=>{a();return b};g((0,a).b);"],
			// A value read through a constant, a parameter or a collapsed write prints in the call's place.
			["function f(){var r=function(){var k=2;var v;v=g(k);return v}();return[r,r]}", {}, "function f(){var r=g(2);return[r,r]}"],
			["function f(a){var r=function(x){var v;v=x.y();return v}(a);return[r,r]}", {}, "function f(r){var n=r.y();return[n,n]}"],
			["function f(){var r=function(){let v=0;v=c.push(3);return v}();return[r,r]}", {}, "function f(){var r=c.push(3);return[r,r]}"],
			["function f(a){var r=function(x){var v;return v}(a);return[r,r]}", {}, "function f(r){var n=function(r){var n;return n}(r);return[n,n]}"],
			// A name the function declares whose reads print its value is no name the call reads.
			["function f(){var r=function(){var p=1;const v={p};return v}();return[r,r]}", {}, "function f(){var r={p:1};return[r,r]}"],
			["function f(a,b){var r=function(x,y){var v;v=g(y);return v}(a,b);return[r,r]}", {}, "function f(r,n){var v=g(n);return[v,v]}"],
			// A statement printing nothing between guards keeps them apart.
			["function f(a,b){void function(){0}();if(a)return;if(b)g()}", {}, "function f(f,i){if(!f&&i)g()}"],
			// A function no longer moving to its one read keeps its call.
			["function f(){d();function c(){x()}function d(){c()}}", {}, "function f(){n();function n(){(function(){x()})()}}"],
			// A sum is no boolean, so `a ? x : false` stays.
			["function f(a,b){return a+b?x:!1}", {}, "function f(n,a){return n+a?x:!1}"],
			// A `!` test keeps the parentheses of what a folded or called test prints as where they are its own.
			["function f(b){return[!(0||(a=b))?c:d,!(0||(x(),b)())?c:d]}", {}, "function f(b){return[(a=b)?d:c,(x(),b)()?d:c]}"],
			["function g(s){return!function(s){return s.a&&s.b}(s)?a():b()}", {}, "function g(n){return n.a&&n.b?b():a()}"],
			// `!!x` read for its truth prints as `x`, so it gives no boolean to return.
			["function f(x,y){return[!!x?!0:y,!!x?y:!1,!!x?!0:!1]}", {}, "function f(x,n){return[x?!0:n,x?n:!1,!!x]}"],
			["function f(x){if(!!x)return!0;return!1}", {}, "function f(n){return!!n}"],
			// A statement printing nothing, as a call nothing reads of a function doing nothing, joins no sequence.
			["function f(x,g){if(x){void function(){0}();g();g()}}", {}, "function f(f,i){if(f)i(),i()}"],
			["f=b=>{void function(){0}();g();return b}", {}, "f=n=>(g(),n);"],
			// A statement after the first that printed its own parentheses keeps the body's braces.
			["function k(a,p){function A(x,y){x.push(1);x.push(2)}if(p){a.push(3);A(a,p)}return a}", {}, "function k(p,u){if(u){p.push(3);(function(p,u){p.push(1),p.push(2)})(p)}return p}"],
			["f=x=>{a();({}).b=x;return 1}", {}, "f=r=>{a();({}).b=r;return 1};"],
			// An object opening an optional chain a statement opens with keeps its parentheses.
			["if({m(){}}?.m())a();else b()", {}, "({m(){}}.m())?a():b();"],
			// A heritage the call prints as needs no parentheses.
			["class C extends (function(){return B})(){}", {}, "class C extends B{}"],
			// What a literal written in place reads of itself is known, but where a call, tag or `delete` reads it as a reference.
			["function f(a){return[\"abc\".length,[1,,a].length+1,[g()].length,/a\\/b/.source,\"ab\".length.x,\"ab\".length(),\"ab\".length``,delete\"ab\".length]}", {}, "function f(e){return[3,4,[g()].length,\"a\\\\/b\",2..x,\"ab\".length(),\"ab\".length``,delete\"ab\".length]}"],
			// A name set to a stable value folds past a member callee, whose getter cannot change it.
			["function f(o,p){var x=p;o.f(x)}", {}, "function f(f,o){f.f(o)}"],
			["function f(o,p){var x=p;x.f(x)}", {}, "function f(f,x){var n=x;n.f(n)}"],
			["function f(o,p){var x=p.q;o.f(x)}", {}, "function f(f,o){var n=o.q;f.f(n)}"],
			["function f(o,p){var x=p;new o.F(x)}", {}, "function f(n,o){new n.F(o)}"],
			// A pure trailing argument to a parameter nothing reads, or to none, goes.
			["function f(){function g(a,b){return a}return[g(1,2),g(x,y()),g(1,2,3),g(...z,1)]}", {}, "function f(){function n(n,g){return n}return[n(1),n(x,y()),n(1),n(...z,1)]}"],
			["function f(z){var q=z.p;function g(a,b){return a}return[g(x,q),g(y,2)]}", {}, "function f(n){n.p;function r(n,r){return n}return[r(x),r(y)]}"],
			["function f(){function g(a,...b){return a}return[g(1,2),g(3,4)]}", {}, "function f(){function n(n,...r){return n}return[n(1,2),n(3,4)]}"],
			["function f(){function g(a,b){return arguments}return[g(1,2),g(3,4)]}", {}, "function f(){function n(n,r){return arguments}return[n(1,2),n(3,4)]}"],
			["function f(){function g(a,b=1){return a}return[g(1,2),g(3,4)]}", {}, "function f(){function n(n,r=1){return n}return[n(1,2),n(3,4)]}"],
			["function f(){function g(x,y=arguments[2]){return[x,y]}return[g(1,2,3),g(5)]}", {}, "function f(){function n(n,r=arguments[2]){return[n,r]}return[n(1,2,3),n(5)]}"],
			["function f(){function g(a,b){return a}g=h;return[g(1,2),g(3,4)]}", {}, "function f(){function n(n,g){return n}return[(n=h)(1,2),n(3,4)]}"],
			["function f(){function g(a,b){return a}return[g(1,/*! keep */2),g(3,4)]}", {}, "function f(){function n(n,r){return n}return[n(1,/*! keep */2),n(3)]}"],
			["function f(){function g(a,b){return a}return[g(1,[1,/*! keep */2]),g(3,4)]}", {}, "function f(){function n(n,r){return n}return[n(1,[1,/*! keep */2]),n(3)]}"],
			["function f(){function g(a,b){return a}return[g(1,()=>/*! keep */2),g(3,()=>4)]}", {}, "function f(){function n(n,r){return n}return[n(1,()=>/*! keep */2),n(3)]}"],
			["function f(){function g(a,b){return a}return[g(1,(/*! keep */x)=>2),g(3,4)]}", {}, "function f(){function n(n,r){return n}return[n(1,/*! keep */n=>2),n(3)]}"],
			["function f(){function g(a,b){return a}return[g(1,(/*! keep */x)=>y=>2),g(3,4)]}", {}, "function f(){function n(n,r){return n}return[n(1,/*! keep */n=>n=>2),n(3)]}"],
			["function f(){function g(a,b){return a}return[g(1,x=>y=>2),g(3,4)]}", {}, "function f(){function n(n,r){return n}return[n(1),n(3)]}"],
			["function f(){function g(a,b){return a}var g;return[g(1,2),g(3,4)]}", {}, "function f(){function n(n,r){return n}var n;return[n(1,2),n(3,4)]}"],
			["function f(){function g(a,b){return a}return[g(1,2),g(3,4)];function h(){eval(\"\")}}", {}, "function f(){function g(n,t){return n}return[g(1,2),g(3,4)];function h(){eval(\"\")}}"],
			["function f(){function g(a,b){return a+b}return[g(1,2),g(3,4)]}", {}, "function f(){function n(n,r){return n+r}return[n(1,2),n(3,4)]}"],
			["function f(){function g(a,{b}){return a}return[g(1,2),g(3,4)]}", {}, "function f(){function n(n,{b:r}){return n}return[n(1,2),n(3,4)]}"],
			["function f(){function g(a,/*! keep */b){return a}return[g(1,2),g(3,4)]}", {}, "function f(){function n(n,/*! keep */r){return n}return[n(1,2),n(3,4)]}"],
			// A literal of literals passed to a parameter read once, not in a loop, prints at the read.
			["function f(){(function(o){g(o.a)})({a:1})}", {}, "function f(){!function(){g({a:1}.a)}()}"],
			["function f(){return(o=>o)({a:1})}", {}, "function f(){return{a:1}}"],
			["function f(){return(o=>o)([1,,-1,\"s\",{b:!0}])}", {}, "function f(){return[1,,-1,\"s\",{b:!0}]}"],
			["function f(){(function(o){for(;;)g(o)})([1])}", {}, "function f(){!function(o){for(;;)g(o)}([1])}"],
			["function f(){(function(o){return function(){return o}})([1])}", {}, "function f(){}"],
			["function f(){(function(o){g(o,o)})([1])}", {}, "function f(){!function(o){g(o,o)}([1])}"],
			["function f(){(function(o){g(o)})([h])}", {}, "function f(){!function(n){g(n)}([h])}"],
			["function f(){(function(o){g(o)})({h})}", {}, "function f(){!function(n){g(n)}({h:h})}"],
			["function f(){(function(o){g(o)})({h(){}})}", {}, "function f(){!function(n){g(n)}({h(){}})}"],
			["function f(){(function(o){g(o)})({[h]:1})}", {}, "function f(){!function(n){g(n)}({[h]:1})}"],
			["function f(){(function(o){g(o)})({get h(){return 1}})}", {}, "function f(){!function(n){g(n)}({get h(){return 1}})}"],
			["function f(){(function(o){g(o)})([/a/])}", {}, "function f(){!function(){g([/a/])}()}"],
			["function f(){(function(o,p){g(p,o)})([1],[2])}", {}, "function f(){!function(o){g(o,[1])}([2])}"],
			["function f(){(function(o){g(arguments)})([1])}", {}, "function f(){!function(n){g(arguments)}([1])}"],
			["function f(){(function(o){g(o);o=1})([1])}", {}, "function f(){!function(o){g(o),o=1}([1])}"],
			["function f(){(function(o){g(o)})({a:[1,{b:-1}]})}", {}, "function f(){!function(){g({a:[1,{b:-1}]})}()}"],
			["function f(){(function(o){g(o)})([`t${h}`])}", {}, "function f(){!function(n){g(n)}([`t${h}`])}"],
			["function f(){(function(o){g(o.a)})({a:1},h())}", {}, "function f(){!function(){g({a:1}.a)}(h())}"],
			["function f(){(function(o){if(0)g(o)})([1])}", {}, "function f(){!function(f){}([1])}"],
			["function f(){(function(o){h();g(o)})({a:1})}", {}, "function f(){!function(){h(),g({a:1})}()}"],
			["function f(){(function(o){h(function(){});g(o)})([1])}", {}, "function f(){!function(){h(function(){}),g([1])}()}"],
			["function f(){(function(o,p){g(o,p)})([1],h)}", {}, "function f(){!function(o){g([1],o)}(h)}"],
			["function f(){(function(o){class A{x=o}g(new A,new A)})([1])}", {}, "function f(){!function(n){class o{x=n}g(new o,new o)}([1])}"],
			["function f(){(function(o){g(o)})([1]);(function(p){g(p)})([2])}", {}, "function f(){!function(){g([1])}(),function(){g([2])}()}"],
			// A `join` of constants, an empty block and a loop on a truthy constant print shorter or not at all.
			["function f(){[1,2].join();g()}", {}, "function f(){g()}"],
			["function f(){[1,g()].join();h()}", {}, "function f(){[1,g()].join(),h()}"],
			["x=[1,/*! c */2].join()", {}, "x=[1,/*! c */2].join();"],
			["function f(){g();{}}", {}, "function f(){g()}"],
			["function f(){g();{/*! keep */}}", {}, "function f(){g();{/*! keep */}}"],
			["function f(){while(1)g()}", {}, "function f(){for(;;)g()}"],
			["function f(){while(!0)g()}", {}, "function f(){for(;;)g()}"],
			["function f(){while(x)g()}", {}, "function f(){while(x)g()}"],
			["function f(){while(0)g()}", {}, "function f(){}"],
			// An assignment of the name its value reads first prints compound.
			["function f(x){x=x+1;g(x)}", {}, "function f(x){g(x+=1)}"],
			["function f(x){x=x>>>g();h(x)}", {}, "function f(x){h(x>>>=g())}"],
			["function f(x){x=x-(a-b);h(x)}", {}, "function f(x){h(x-=a-b)}"],
			// The parentheses only the operator needed go with it; a sequence or a call keeps them.
			["function f(e,t,x){e.name=e.name+(t-1);x=x*(a+b);x=x+(c?1:2);x=x+(y=2);x=x|(a||b);x=x+(a*b);x=x+(a,b);x=x+(f||g)(1);x=x+/*k*/(a-b);h(x)}function*g(x){x=x+(yield);h(x)}", {}, "function f(x,e,n){x.name+=e-1,n*=a+b,n+=c?1:2,n+=y=2,n|=a||b,n+=a*b,n+=(a,b),n+=(f||g)(1),h(n+=a-b)}function*g(x){h(x+=yield)}"],
			["function f(x){x=y+x;h(x)}", {}, "function f(x){h(x=y+x)}"],
			// A member of `this` or of a declared name, read again in its value, is set by `op=`; a global, a computed key, `with` or `?.` keeps it.
			["function f(o){o.p=o.p+1}", {}, "function f(o){o.p+=1}"],
			["class A{m(){this.x=this.x+v;this.#p=this.#p*2}#p}o.y=o.y+1;var q;q.y=q.y+1;function f(o,p){o[k]=o[k]+1;o.y=o.z+1;o.y=p.y+1;o.y=o?.y+1;with(p)p.y=p.y+1}function g(o,b){o.b.c=o.b.c+1;({a}=b+1)}", {}, "class A{m(){this.x+=v,this.#o*=2}#o}o.y=o.y+1;var q;q.y=q.y+1;function f(o,p){o[k]=o[k]+1,o.y=o.z+1,o.y=p.y+1,o.y=o?.y+1;with(p)p.y=p.y+1}function g(o,y){o.b.c=o.b.c+1,({a:a}=y+1)}"],
			["function f(x){with(o)x=x+1;h(x)}", {}, "function f(x){with(o)x=x+1;h(x)}"],
			["function f(x){x=x&&1;h(x)}", {}, "function f(x){h(x=x&&1)}"],
			// An unread catch binding goes; `a?a:b` of a local prints `a||b`; equal unary branches fold.
			["function f(){try{g()}catch(r){h()}}", {"ecma": 2020}, "function f(){try{g()}catch{h()}}"],
			["function f(){try{g()}catch(r){h()}}", {}, "function f(){try{g()}catch(c){h()}}"],
			["function f(){try{g()}catch(r){h(r)}}", {"ecma": 2020}, "function f(){try{g()}catch(c){h(c)}}"],
			["function f(){try{g()}catch(r){eval(\"h(r)\")}}", {"ecma": 2020}, "function f(){try{g()}catch(r){eval(`h(r)`)}}"],
			["function f(){try{g()}catch({a}){h()}}", {"ecma": 2020}, "function f(){try{g()}catch({a}){h()}}"],
			["function f(){try{g()}catch(r){r=1}}", {"ecma": 2020}, "function f(){try{g()}catch(c){c=1}}"],
			["function f(a,b){return a?a:b}", {}, "function f(a,n){return a||n}"],
			["function f(a,c){return(a?a:a)&&c}", {}, "function f(a,c){return a&&c}"],
			["function f(a){return a?a:a}", {}, "function f(a){return a}"],
			["function f(a,b){return a?a:b?1:2}", {}, "function f(a,n){return a?a:n?1:2}"],
			["function f(a,b){return g(b),a?a:b=1}", {}, "function f(a,b){return g(b),a?a:b=1}"],
			["function f(a,b){return a?a:b=1}", {}, "function f(a,n){return a?a:1}"],
			["function f(a,b){return a?a:b??1}", {}, "function f(a,n){return a?a:n??1}"],
			["function f(a,b){return a?a:b||1}", {}, "function f(a,n){return a||n||1}"],
			["function f(a,b){return a?a:b&&1}", {}, "function f(a,n){return a||n&&1}"],
			["function f(a,b){return(a?a:b)??1}", {}, "function f(a,n){return(a||n)??1}"],
			["function f(a,b){return a?a:(b,1)}", {}, "function f(a,n){return a?a:(n,1)}"],
			["function f(a,b){return a?a:()=>1}", {}, "function f(a,n){return a?a:()=>1}"],
			["function*f(a,b){return a?a:yield}", {}, "function*f(a,n){return a?a:yield}"],
			["function f(b){return a?a:b}", {}, "function f(n){return a||n}"],
			["function f(o,b){return o.a?o.a:b}", {}, "function f(o,n){return o.a?o.a:n}"],
			["function f(a,b){with(b)return a?a:b}", {}, "function f(a,b){with(b)return a?a:b}"],
			["function f(a,b){return a?b:a}", {}, "function f(a,n){return a?n:a}"],
			["function f(a,b){x(a?a:b)}", {}, "function f(a,b){x(a||b)}"],
			["function f(n){return n?-1:-1}", {}, "function f(n){return-1}"],
			["function f(n,o){return n?typeof o:typeof o}", {}, "function f(o,n){return typeof n}"],
			["function f(n,o){return n?-o:-o}", {}, "function f(n,o){return-o}"],
			// A block scoping no name prints its statements in the list holding it, unless one becomes a directive.
			["function f(){{var y=g()}h(y)}", {}, "function f(){var f=g();h(f)}"],
			["function f(){g();{h();k()}m()}", {}, "function f(){g();h(),k();m()}"],
			["function f(){{let y=g();h(y)}{let y=k();h(y)}}", {}, "function f(){h(g());h(k())}"],
			["function f(){{function y(){}h(y)}}", {}, "function f(){{function n(){}h(n)}}"],
			["function f(){{class y{}h(y)}}", {}, "function f(){{class c{}h(c)}}"],
			["function f(){{\"use strict\";g()}h()}", {}, "function f(){g();h()}"],
			["{\"use strict\"}x=1", {}, "x=1;"],
			["function f(){{(\"use strict\")}h()}", {}, "function f(){h()}"],
			["function f(x){switch(x){case 1:{var y=g();h(y)}}}", {}, "function f(c){if(c===1){h(g())}}"],
			["function f(){a:{g();break a}h()}", {}, "function f(){a:g();h()}"],
			["function f(){if(a){{g()}h()}}", {}, "function f(){if(a){g();h()}}"],
			["function f(){for(;;){{g()}h()}}", {}, "function f(){for(;;){g();h()}}"],
			["function f(){{if(a)return 1}return 2}", {}, "function f(){if(a)return 1;return 2}"],
			["x={}", {}, "x={};"],
			["function f(){{var a=1}{var b=2}h(a,b)}", {}, "function f(){var a=1;var b=2;h(a,b)}"],
			["function f(){{\"use strict\";g()}h()}", {"compress": {"side_effects": false}}, "function f(){{\"use strict\";g()}h()}"],
			["{\"use strict\";g()}x=1", {"compress": {"side_effects": false}}, "{\"use strict\";g()}x=1;"],
			["function f(){{(\"use strict\")}h()}", {"compress": {"side_effects": false}}, "function f(){{\"use strict\"}h()}"],
			["function f(){;{\"use strict\";g()}}", {"compress": {"side_effects": false}}, "function f(){{\"use strict\";g()}}"],
			["function f(){{`use strict`;g()}h()}", {"compress": {"side_effects": false}}, "function f(){{`use strict`,g()}h()}"],
			["function f(){{\"use \"+\"strict\";g()}h()}", {"compress": {"side_effects": false}}, "function f(){{;\"use strict\";g()}h()}"],
			["function f(){{{\"use strict\"}g()}h()}", {"compress": {"side_effects": false}}, "function f(){{\"use strict\"}g();h()}"],
			["function f(){{g();\"x\"}h()}", {"compress": {"side_effects": false}}, "function f(){g();\"x\";h()}"],
			["function f(){g();{a();/*! keep */}h()}", {}, "function f(){g();a();/*! keep */h()}"],
			["{/*! keep */}x()", {}, "{/*! keep */}x();"],
			["function f(){for(k in o){{var b=5;while(--b>0)g()}}}", {}, "function f(){for(k in o){var f=5;while(--f>0)g()}}"],
			["function f(){if(a){{g();h()}}}", {}, "function f(){if(a)g(),h()}"],
			// A `continue` ending its own loop's body goes, one naming that loop's label too; a commented one stays.
			["function f(){while(foo){x();y();continue}}", {}, "function f(){while(foo)x(),y()}"],
			["function f(){do{x();continue}while(a)}", {}, "function f(){do{x()}while(a)}"],
			["function f(){for(k in o){continue}}", {}, "function f(){for(k in o);}"],
			["function f(){for(;;){x();continue/*! c */}}", {}, "function f(){for(;;){x();continue;/*! c */}}"],
			["function f(){l:while(a){x();continue l}}", {}, "function f(){while(a)x()}"],
			// A `switch` of one case prints as an `if`, but one a `break` leaves, labelled or not in a list.
			["function f(){switch(foo){case\"bar\":baz()}}", {}, "function f(){if(foo===\"bar\")baz()}"],
			["function f(){switch(foo){case\"bar\":baz();break}}", {}, "function f(){if(foo===\"bar\")baz()}"],
			["function f(){switch(foo){case 1:baz();break;}h()}", {}, "function f(){if(foo===1)baz();h()}"],
			["function f(){switch(foo){default:baz()}}", {}, "function f(){foo,baz()}"],
			["function f(){switch(foo){case 1:if(a)break;baz()}}", {}, "function f(){switch(foo){case 1:if(a)break;baz()}}"],
			["function f(){switch(foo()){case g():let x=1;h(x)}}", {}, "function f(){switch(foo()){case g():let c=1;h(c)}}"],
			["function f(){switch(a){case 1:b();c()}}", {}, "function f(){if(a===1){b();c()}}"],
			["function f(){switch(a){case 1:return b}}", {}, "function f(){if(a===1)return b}"],
			["function f(){switch(a){case 1:b();break;default:}}", {}, "function f(){if(a===1)b()}"],
			["function f(){switch(a){case 1:b();break;default:c()}}", {}, "function f(){if(a===1)b();else c()}"],
			["function f(){switch(a+b){case 1:b()}}", {}, "function f(){switch(a+b){case 1:b()}}"],
			["function f(){switch(a){case b?1:2:c()}}", {}, "function f(){switch(a){case b?1:2:c()}}"],
			["function f(){if(c){switch(d){case 1:if(a)b()}}else e()}", {}, "function f(){if(c){if(d===1)if(a)b()}else e()}"],
			["function f(){if(c){switch(d){case 1:b()}}else e()}", {}, "function f(){if(c){if(d===1)b()}else e()}"],
			["function f(){for(;;){switch(d){case 1:continue}}}", {}, "function f(){for(;;)if(d===1)continue}"],
			["function f(){l:switch(d){case 1:x();break l}}", {}, "function f(){c:switch(d){case 1:x();break c}}"],
			["function f(){switch(d){case 1:\"use strict\"}}", {}, "function f(){if(d===1){\"use strict\"}}"],
			["function f(){switch(d){case 1:for(k in o)break;g()}}", {}, "function f(){if(d===1){for(k in o)break;g()}}"],
			["function f(){switch(d){case 1:/*! k */g()}}", {}, "function f(){if(d===1)/*! k */g()}"],
			["function f(){switch(d){case 1:}}", {}, "function f(){d}"],
			["function f(){switch(-x){case typeof y:g()}}", {}, "function f(){if(-x===typeof y)g()}"],
			["switch(a){case 1:var x=1}console.log(x)", {}, "if(a===1){var x=1}console.log(x);"],
			["function f(){switch(d){case 1:if(a)b();else c()}}", {}, "function f(){if(d===1)a?b():c()}"],
			["function f(){switch(d){case 1:{let x=g();h(x)}}}", {}, "function f(){if(d===1){h(g())}}"],
			["function f(){switch(d){case 1:function q(){}q()}}", {}, "function f(){switch(d){case 1:function c(){}c()}}"],
			["function f(){for(;;)switch(d){case 1:continue}}", {}, "function f(){for(;;)switch(d){case 1:continue}}"],
			["function f(){a:for(;;){switch(d){case 1:break a}g()}}", {}, "function f(){a:for(;;){if(d===1)break a;g()}}"],
			["function f(){switch(d){case 1:x();break;case 2:y()}}", {}, "function f(){switch(d){case 1:x();break;case 2:y()}}"],
			["function f(){switch(1){case 1:x()}}", {}, "function f(){x()}"],
			["function f(x){switch(x){case 1:g()}return x}", {"compress": {"side_effects": false}}, "function f(c){if(c===1)g();return c}"],
			["function f(){switch(d){case 1:x()}}", {"compress": {"dead_code": false}}, "function f(){switch(d){case 1:x()}}"],
			["function f(){switch(g()){case 2:debugger;h();default:}}", {}, "function f(){if(g()===2)h()}"],
			["function f(){switch(g()){case 2:debugger}}", {}, "function f(){if(g()===2){}}"],
			["function f(x){let t=1;switch(x){case t:let t=2;return t}}", {}, "function f(t){switch(t){case t:let t=2;return t}}"],
			["function f(x){switch(x){case typeof q:label:function q(){};return 1}return 2}", {}, "function f(n){switch(n){case typeof t:n:function t(){}return 1}return 2}"],
			["function f(){{l:function q(){}}g(typeof q)}", {}, "function f(){{f:function f(){}}g(typeof f)}"],
			["switch (b) { case 2: switch (a) { case 2: foo()}}", {}, "if(b===2)if(a===2)foo();"],
			["if (a) { if (c) switch (b) { case 2: switch (a) { case 2: foo()}}; b() }", {}, "if(a){if(c)if(b===2)if(a===2)foo();b()}"],
			["if(c)switch(d){case 1:x()}else y()", {}, "if(c)switch(d){case 1:x()}else y();"],
			["if(p){if(c)switch(d){case 1:x()}}else z()", {}, "if(p){if(c)if(d===1)x()}else z();"],
			["switch(b){case 2:switch(a){case 2:foo();break;case 3:g()}}", {}, "if(b===2)switch(a){case 2:foo();break;case 3:g()}"],
			["if(c)switch(d){case 1:if(a)b()}", {}, "if(c)if(d===1)if(a)b();"],
			["x=n?true:true;y=a()?false:false", {}, "x=(n,!0),y=(a(),!1);"],
			["function f(n,b=n?!0:!0){return n?!1:!1}", {}, "function f(n,f=!0){return!1}"],
			["if(n?1:1)f();while(n?x:x);do;while(n?x:x);switch(n?x:x){case 1:f();break;case 2:g()}", {}, "if(n,1)f();while(n,x);do{}while(n,x);switch(n,x){case 1:f();break;case 2:g()}"],
			["function f(a){if(a){x();z();return}y()}function g(a){if(a){x();return void 0}return y()}function h(a){if(a){x();return}if(b)c()}", {}, "function f(n){if(n)x(),z();else y()}function g(n){if(n)x();else return y()}function h(n){if(n)x();else if(b)c()}"],
			["for(;;){if(b){x();continue}y()}do{if(b){x();continue}y()}while(t);for(;;){if(b)continue;y()}while(c){if(b)continue;y()}", {}, "for(;;)if(b)x();else y();do{if(b)x();else y()}while(t);for(;;)if(!b)y();while(c)if(!b)y();"],
			["function f(a){if(a){x();return}y()}", { format: { semicolons: false } }, "function f(f){if(f)x()\nelse y()}"],
			// Each keeps its exit: a label, a comment, an inner `if`, a declaration, more after, a kept test, a value returned.
			["l:for(;;){if(b){x();continue l}y()}for(;;){if(b){x();/*c*/continue}y()}for(;;){if(b){if(c)x();continue}y()}for(;;){if(b){x();continue}function q(){}q()}for(;;){if(b){x();continue}y();y()}function f(){if(1){x();return}y()}function g(a){if(a){x();return 1}y()}for(;;){if(b){continue}y()}", { format: { comments: "all" } }, "for(;;){if(b){x();continue}y()}for(;;){if(b){x();/*c*/continue}y()}for(;;){if(b){if(c)x();continue}y()}for(;;){if(b){x();continue}function q(){}q()}for(;;){if(b){x();continue}y(),y()}function f(){x()}function g(n){if(n)return x(),1;y()}for(;;)if(!b)y();"],
			["for(;;){if(b){x();continue}y()}function f(a){if(a){x();return}/*c*/y()}function g(a){if(a){x();return}if(a){x();return}}", { format: { comments: "all" } }, "for(;;)if(b)x();else y();function f(n){if(n){x();return}/*c*/y()}function g(n){if(n)x();else if(n)x()}"],
			["function f(a){if(a){x();throw e}y()}for(;;){if(b){x();break}y()}function g(a){if(a){0;return}y()}function h(a){if(a){x();return}0}for(;;){if(b){x();continue}let q=y()}", {}, "function f(f){if(f){x();throw e}y()}for(;;){if(b){x();break}y()}function g(f){if(!f)y()}function h(f){if(f)x()}for(;;){if(b){x();continue}y()}"],
			["function g(){var a=[1,2];f(a[0],a[1])}function n(){let a=[1,\"s\",!0,null];f(a[1]+a[0],a[2],a[3].x,typeof a[0],a[2]?3:4)}function s(){var a=[\"a long string\"];f(a[0],a[0],a[0])}function t(){g();const a=[1];function g(){f(a[0])}}function v(){var a=[1];return function(){return a[0]}}", {}, "function g(){f(1,2)}function n(){f(\"s1\",!0,null.x,\"number\",3)}function s(){var a=[\"a long string\"];f(a[0],a[0],a[0])}function t(){(function(){f(a[0])})();let a=[1]}function v(){var a=[1];return function(){return a[0]}}"],
			// Each array stays: a write, a delete, a call, an unknown or missing index, an element not a constant.
			["function z(){const a=[1,2];f(a[0]);f(delete a[0])} function z2(){const a=[1,2];f(a[0]);({x:a[1]}={})} function z3(){const a=[1,2];for(a[0] of b);} function z4(){const a=[1,2];f(a?.[0],a[1])} function z5(){const a=[1,2];f(a[0],a[2])} function z6(){const a=[1,2];f(a[0],a[\"0\"])} function z7(){const a=[1,2];f(a[0],a[0.5])} function z8(){const a=[1,2];f(a[0],a[1]`x`)} function z9(){const a=[1,2];f(a[0],new a[1])} function y2(){const a=[1,2];f(a[0]);[a[1]]=b} function y3(){const a=[1,2];f(a[0]);a[1]++} function y5(){const a=[1,2];f(a[0],a[1]())} function y6(){const a=[1,x];f(a[0],a[1])} function y7(){const a=[1,-1];f(a[0],a[1])} function y8(){const a=[];f(a[0],a[1])} function y9(){const a=[1,,2];f(a[0],a[1])} function w1(){const a=[1,2];f(a[-1],a[0])} function w2(){const a=[1,2];f(a[0],a.length)} function w4(){const a=[1,2];f(a[0],a[i])} function w5(){const a=[1,2];f(a[0]);a[0]=1}", {}, "function z(){let n=[1,2];f(n[0]),f(delete n[0])}function z2(){let n=[1,2];f(n[0]),({x:n[1]}={})}function z3(){let n=[1,2];for(n[0]of b);}function z4(){let n=[1,2];f(n?.[0],n[1])}function z5(){let n=[1,2];f(n[0],n[2])}function z6(){let n=[1,2];f(n[0],n[0])}function z7(){let n=[1,2];f(n[0],n[.5])}function z8(){let n=[1,2];f(n[0],n[1]`x`)}function z9(){let n=[1,2];f(n[0],new n[1])}function y2(){let n=[1,2];f(n[0]),[n[1]]=b}function y3(){let n=[1,2];f(n[0]),n[1]++}function y5(){let n=[1,2];f(n[0],n[1]())}function y6(){let n=[1,x];f(n[0],n[1])}function y7(){let n=[1,-1];f(n[0],n[1])}function y8(){let n=[];f(n[0],n[1])}function y9(){let n=[1,,2];f(n[0],n[1])}function w1(){let n=[1,2];f(n[-1],n[0])}function w2(){let n=[1,2];f(n[0],n.length)}function w4(){let n=[1,2];f(n[0],n[i])}function w5(){let n=[1,2];f(n[0]),n[0]=1}"],
			["function w3(){const a=[1,/*c*/2];f(a[0],a[1])}", { format: { comments: "all" } }, "function w3(){let a=[1,/*c*/2];f(a[0],a[1])}"],
			["function g(){const a=[1,2];x=a[0];f({[a[1]]:1})}", {}, "function g(){x=1,f({[2]:1})}"],
			["for(;;){if(b)/*c*/continue;y()}", { format: { comments: "all" } }, "for(;;){if(b)/*c*/continue;y()}"],
			// An exit ending its function's, loop's or label's body goes, but in a `finally`, of an outer loop or before more.
			["for(x of y){if(false){a();continue}else;b();continue}function f(){if(x)return;if(y)return}function g(){try{a();return}catch(e){b();return}}function h(){try{a()}finally{return}}function i(){l:{a();break l}}l:for(;;){a();continue l}x:for(;;)for(;;){a();continue x}function j(){if(a){b();return}else{c();return}}function k(){if(a()){return}else{return}}function m(){return void 0}do{a()}while(true);for(;;){a();break}function n(){for(;;){a();return}}function*o(){a();return}", {}, "for(x of y)b();function f(){if(x||y)return}function g(){try{a()}catch(n){b()}}function h(){try{a()}finally{return}}function i(){n:a()}for(;;)a();n:for(;;)for(;;){a();continue n}function j(){a?b():c()}function k(){a()}function m(){}for(;;)a();for(;;){a();break}function n(){for(;;){a();return}}function*o(){a()}"],
			// An empty `try` runs no `catch`, its `finally` printing in its place; a loop test known goes, true or false.
			["try{}catch(e){foo()}a();try{}finally{foo();x()}b();try{}catch(e){foo()}finally{bar()}try{}finally{}try{}catch(e){var v}function f(){g();try{}finally{if(a)b()}c()}if(x)try{}finally{y()}try{}finally{let q=f();g(q,q)}for(;true;)foo();for(var i=0;!0;i++)k();while(0)g();for(;false;i++)h();for(;0;)var w=0", {}, "a();foo(),x();b();bar();try{}catch(f){var v}function f(){g();if(a)b();c()}if(x)try{}finally{y()}{let r=f();g(r,r)}for(;;)foo();for(var i=0;;i++)k();for(;0;)var w=0;"],
			// A `let` or `const` printing only its one value scopes no name: its braces go; two values or a name read keep them.
			["function f(){try{}finally{let x=foo()}for(;;){const x=y}}function g(){if(x){let a=f()}else g();while(x){let y=z();if(1)continue;z()}}function h(){if(x){let a=1,b=f()}else h();if(x){let a=f(),b=1}else h()}", {}, "function f(){foo();for(;;)y}function g(){if(x)f();else g();while(x)z()}function h(){if(x)f();else h();if(x)f();else h()}"],
			["function f(){if(x){let a=f(),b=g()}else h();for(;;){let q=f();g(q,q)}}", {}, "function f(){if(x){f();g()}else h();for(;;){let e=f();g(e,e)}}"],
			// What runs nothing before a name called goes, and before a member is `0`, but before `eval` or in `with`.
			["(0,foo)();(0,foo)``;(0,foo)?.();(!0,a.b)();(1,2,a.b)();(0,a.b)();(0,eval)();typeof(0,foo);(x(),foo)``;(function(){},foo)``;(x(),a.b)()", {}, "foo(),foo``,foo?.(),(0,a.b)(),(0,a.b)(),(0,a.b)(),(0,eval)(),0,foo,(x(),foo)``,foo``,(x(),a.b)();"],
			["with(o)(0,foo)()", {}, "with(o)(0,foo)();"],
			// A known test or left side folding to a reference a call, tag, `typeof` or `delete` reads keeps it a value with `0,`; a name called bare or `new` needs none.
			["(true&&x.y)();(1?x[y]:2)``;f(typeof(1?x:2),delete(0?1:x.y));(0||x?.y)();(1?eval:2)(s);(1?x:2)();new(1?x.y:2);(c?x.y:2)();(null??x.y)()", {}, "(0,x.y)(),(0,x[y])``,f(typeof(0,x),delete(0,x.y)),(0,x?.y)(),(0,eval)(s),x(),new x.y,(c?x.y:2)(),(0,x.y)();"],
			["x=[(1&&(0,f.g))(),(1&&(1&&f.g))``,typeof(1&&(1&&f)),delete(1?(0,f.g):2),(1&&(1&&g))(),(1&&(1&&eval))(1),new(1&&(a?f:f))]", {}, "x=[((0,f.g))(),(0,f.g)``,typeof(0,f),delete((0,f.g)),(g)(),(0,eval)(1),new((a?f:f))];"],
			["for(;;){if(x)break;else{function f(){}}}for(;;){if(y){function g(){}}else break}", {}, "for(;!x;){function f(){}}for(;y;){function g(){}}"],
			["foo();bar();for(;i<1;)g();x=(a in b);for(;i<1;)g();x=1;for(;0;)g();y=1;for(;i<1;)g();z=function(){a in b};for(;i<1;)g()", {}, "foo();for(bar();i<1;)g();x=a in b;for(;i<1;)g();x=1;for(y=1;i<1;)g();for(z=function(){a in b};i<1;)g();"],
			["function f(){var t=g();var e,h=0;for(;h<1;++h)e=k(e);return t+e+t}", {}, "function f(){var e=g(),r,t=0;for(;t<1;++t)r=k(r);return e+r+e}"],
			["if(t)`${a()}${b()}`;else c();if(u)`${a()}${1}`;else c();(function(){if(t)return;`${a()}${b()}`})();(function(){if(u)return;`${a()}${1}`})()", {}, "t?`${a()}${b()}`:c(),u?`${a()}`:c(),t||`${a()}${b()}`,u||`${a()}`;"],
			["Object.create({},null);Object.create({},\"ab\");Object.create({},void 0);Object.create({},1)", {}, "Object.create({},null),Object.create({},\"ab\"),Object.create({},1);"],
			["(class{#x;static{#x in 1}});(class{#y;static{#y in {}}});(class{#z;static{#z in o}})", {}, "(class{#s;static{#s in 1}});(class{#c;static{#c in o}});"],
			["(0,foo)``", { compress: false, mangle: false }, "(0,foo)``;"],
			// terser's `comparisons`: `!(a==b)` is `a!=b` where an equality takes no parentheses, and a boolean compared with one is itself or negated.
			["x=!(a==b);if(!(a!=b))f();x=!(a<b);x=!(a==b)+1;f(!(a!==b),[!(a==b)],-!(a==b));x=!(a==b)&&c;x=!(a==b)?1:2;x=c?!(a==b):!(d===e);x=()=>!(a==b);x={k:!(a==b)};x=`${!(a==b)}`;throw!(a==b)", {}, "x=a!=b;if(a==b)f();x=!(a<b),x=!(a==b)+1,f(a===b,[a!=b],-!(a==b)),x=a!=b&&c,x=a==b?2:1,x=c?a!=b:d!==e,x=()=>a!=b,x={k:a!=b},x=`${a!=b}`;throw a!=b;"],
			["!(a==b);var v=!(a==b);function g(){return!(a===b)}", {}, "a==b;var v=a!=b;function g(){return a!==b}"],
			["x=(a instanceof b)===true;x=!a===!1;x=true===(a in b);x=y===true;x=(a<b)!=true;x=delete y==false;while(x&&!0)f();x=!(y()&&true);x=!(a<b&&!0);if(a??true)b();x=a&&true;if(a&&b())c()", {}, "x=a instanceof b,x=!!a,x=a in b,x=y===!0,x=!(a<b),x=!delete y;while(x)f();x=!y(),x=!(a<b);if(a??!0)b();x=a&&!0;if(a&&b())c();"],
			["x=!(/*c*/a==b);if(a&&/*k*/true)b()", { mangle: false, format: { comments: "all" } }, "x=!(/*c*/a==b);if(a&&/*k*/1)b();"],
			// A name both branches call is called bare, after the test runs; `eval` or a member as `(0,f)`; in `with` the test stays, and `new` keeps it.
			["var c;(c?foo:foo)(\"x\");(c()?foo:foo)(\"y\");(c?eval:eval)(\"z\");(c?o.f:o.f)(\"w\");(c?foo:foo)`t`;(c()?foo:foo)`v`;new(c?F:F);(c?a:b)`u`", {}, "var c;foo(\"x\"),(c(),foo)(\"y\"),(0,eval)(\"z\"),(0,o.f)(\"w\"),foo`t`,(c(),foo)`v`,new(c?F:F),(c?a:b)`u`;"],
			["with(o)(c?foo:foo)()", {}, "with(o)(c,foo)();"],
			// terser's `loops`: `if(x)break` opening a loop's body joins its test as `!x`, but where the body scopes a name.
			["for(;;)if(x)break;for(;;)if(!x)break;for(;a;){if(x)break;y()}while(x){if(y)break;z()}while(1){if(a==b)break;c()}for(;a||b;)if(c&&d)break;l:for(;;){if(x)break l;y()}for(;;){if(x)continue;y()}for(;a=b;)if(x)break;for(;a;)if(!(b&&c))break;var x=1;for(;;){if(x)break;let x=g();h(x,x)}for(;;){;if(x)break;y()}for(;true;){if(x)break;y()}", {}, "for(;!x;);for(;x;);for(;a&&!x;)y();while(x&&!y)z();while(a!=b)c();for(;(a||b)&&!(c&&d););for(;;){if(x)break;y()}for(;;)if(!x)y();for(;(a=b)&&!x;);for(;a&&b&&c;);for(var x=1;;){if(r)break;let r=g();h(r,r)}for(;!x;)y();for(;!x;)y();"],
			["for(;;){/*c*/if(x)break;y()}class S{/*k*/static{}}", { mangle: false, format: { comments: "all" } }, "for(;;){/*c*/if(x)break;y()}class S{/*k*/static{}}"],
			// `!!b` is `b` where `b` is a boolean; a key an integer spells is that number; a static block running nothing goes.
			["a=!!delete b;a=!!(b==c);a=!!(b==c)+1;a=!!!(b<c);if(!!!(b<c))d();a=!!!b;!!(function(){g()}()==x);!(function(){g()}()==x);x[\"0\"];x[\"-123\"];x[\"-0\"];x[\"01\"];x?.[\"5\"];class P{static{};foo}class Q{static{123}}class R{static{g()}}", {}, "a=delete b,a=b==c,a=(b==c)+1,a=!(b<c);if(!(b<c))d();a=!b,(function(){g()}()==x),!(function(){g()}()==x),x[0],x[-123],x[\"-0\"],x[\"01\"],x?.[5];class P{foo}class Q{}class R{static{g()}}"],
			// What is never nullish leaves `??` nothing to run; same logical operators regroup; an integer compared with `0` read for its truth is itself.
			["x(0n??1);x(/./??1);x({}??1);x((()=>{})??1);x(+y??1);x((y<z)??1);x(a??b);x=a&&(b&&c&&(d&&e));x=a||(b||c||(d||e));x=a??(b??c??(d??e));x=a&&(b||c);if((a|+b)!==0)throw 0;if(0!=(a&+b))throw 0;if((a^+b)===0)throw 0;if(0==~a)f();x=!((a|b)===0);if(a>>b!==0)g();if(a>>b===0)g();x=(a|b)!==0?1:2;x=(a|b)!==0;if((a+b)!==0)h();if(a!==0)k()", {}, "x(0n),x(/./),x({}),x((()=>{})),x(+y),x(y<z),x(a??b),x=a&&b&&c&&d&&e,x=a||b||c||d||e,x=a??b??c??d??e,x=a&&(b||c);if(a|+b)throw 0;if(a&+b)throw 0;if(!(a^+b))throw 0;if(!~a)f();x=(a|b)!==0;if(a>>b!==0)g();if(a>>b===0)g();x=(a|b)!==0?1:2,x=(a|b)!==0;if(a+b!==0)h();if(a!==0)k();"],
			["x=a&&/*c*/(b&&c);x=(a|b/*d*/)!==0?1:2", { mangle: false, format: { comments: "all" } }, "x=a&&(/*c*/b&&c),x=(a|b/*d*/)!==0?1:2;"],
			// An optional `?.` continues a chain unbroken; arithmetic beside a number converts as `+` does; `void 0` and booleans compared loosely; `yield` of nothing.
			["(a?.b)?.c;(a?.b).c;(a?.b)?.();(a?.b)?.[0];(a?.b)();v=1-+foo;v=+foo-1;v=1e3*+d;v=5|+b;v=+xs-(2*3);v=a-+b;v=1+ +b;v=1-+-b;v=1-+(a+b);v=(+a)**2;v=1-+x++;v=undefined!=foo;v=void 0==foo;v=!0==y;v=false!=y;function*g(){yield void 0;yield*void 0;x=yield undefined;yield void f()}", {}, "a?.b?.c,(a?.b).c,a?.b?.(),a?.b?.[0],(a?.b)(),v=1-foo,v=foo-1,v=1e3*d,v=5|b,v=xs-6,v=a-+b,v=1+ +b,v=1-+-b,v=1-(a+b),v=(+a)**2,v=1-x++,v=null!=foo,v=null==foo,v=1==y,v=0!=y;function*g(){yield,yield*void 0,x=yield,yield void f()}"],
			["v=1-/*c*/+foo;v=/*d*/void 0!=foo;function*g(){yield/*e*/void 0}", { mangle: false, format: { comments: "all" } }, "v=1-/*c*/+foo,v=/*d*/void 0!=foo;function*g(){/*e*/yield void 0}"],
			// A `debugger` dropped prints nothing as a body; `if(t);else x` is `if(!t)x`; `void` of a value nobody reads goes; `use strict` in strict code goes.
			["if(foo())debugger;if(x)debugger;else foo();label:debugger;for(;;)debugger;if(x);else foo();if(x){}else{foo();bar()}if(a==b);else c();if(p){if(x);else foo()}else q();if(x);else if(y)z();void x;void f();x=(void g(),1);function q(){let x=1;void x;if(x);h()}", {}, "foo();if(!x)foo();for(;;);if(!x)foo();if(!x)foo(),bar();if(a!=b)c();if(p){if(!x)foo()}else q();if(!x)if(y)z();x,f(),x=(g(),1);function q(){h()}"],
			["function a(){\"use strict\";function b(){\"use strict\";c()}return b}function e(){\"use strict\";\"use asm\";f()}class K{m(){\"use strict\";g()}}", { mangle: false }, "function a(){\"use strict\";return function(){c()}}function e(){\"use strict\";\"use asm\";f()}class K{m(){g()}}"],
			["\"use strict\";export function foo(){\"use strict\";g()}", { module: true, compress: {}, mangle: {} }, "export function foo(){g()}"],
			// What nobody reads: an operator running only its operand goes, a branch running nothing goes, an array or object prints what its parts run, `x==null&&y` is `x??y`.
			["!x.y;!x?.y;typeof x.y;typeof x;delete x.y.z();delete x.y;delete x;delete(0,x);!function(){g()}();!(a==b);f(),!(a<b),g();void(a=b);!({}.a+1);foo()?1:2;foo()?1:bar();foo()?bar():2;(a,b)?1:c();a??b?1:c();x=foo()?1:2;c?1:a=b;c?1:(d,e);c?d:1", {}, "x.y,x?.y,x.y,x.y.z(),delete x.y,delete x,0,x,g(),a==b,f(),a<b,g(),a=b,!({}.a+1),foo(),foo()||bar(),foo()&&bar(),(a,b)||c(),(a??b)||c(),x=foo()?1:2,c||(a=b),c||(d,e),c&&d;"],
			["([a]);([foo()]);[4,...c,a];({a:foo()});({foo:{foo:foo()}});({[bar()]:foo()});({a:1,b:g(),c:h()});x=[a(),b()];({a(){},b:g()});({get a(){},b:g()});[,a(),,b()];({b});x=({a:f()},1);({a:function(){}()}.x)", {}, "a,foo(),[...c,a],foo(),foo();({[bar()]:foo()});g(),h(),x=[a(),b()],g();({get a(){},b:g()});a(),b(),b,x=(f(),1);"],
			["x==null&&y", {"ecma": 2019}, "x==null&&y;"],
			["void {a:g()}.b;typeof function(){return g()}().x;delete {a:g()}.b.c()", {}, "({a:g()}.b),g().x,({a:g()}.b.c());"],
			["x==null&&y;x!=null||y;a==null&&(a=b);null==x&&g();o.y!=null||(o={},o.y=3);x===null&&y;x==null&&(y||z);z=x==null&&y;f()==null&&y;x==null&&!y;x==null&&new Y;x==null&&a+b", {"ecma": 2020}, "x??y,x??y,a??(a=b),x??g(),o.y??(o={},o.y=3),x===null&&y,x==null&&(y||z),z=x==null&&y,f()==null&&y,x??y,x??new Y,x??a+b;"],
			// An operand of `&&` or `||` whose truth alone is read is read for its truth too; a strict equality nobody reads runs only its sides.
			["v=!(a||!0);v=!(a&&!1);if(!!a||!!b)throw 0;x=a||!0;if(a&&(b?!0:c))d();if(a&&(x&&!0))f();x=a??!0;if(a??!!b)g();if(!0)h();while(!1)k()", {}, "v=!(a||1),v=!(a&&0);if(a||b)throw 0;x=a||!0;if(a&&(b||c))d();if(a&&x)f();x=a??!0;if(a??!!b)g();h();"],
			// esbuild's `!!(!b&&c)` as `!(b||!c)`, where shorter; a logical folding to a unary takes no parentheses under `!`, and `!!` of a boolean goes.
			["a=!!(!b&&c);a=!!(!b||c);a=!!(b&&!c);a=!!(b||!c);a=!!(!b&&!c);a=!!(!b||!c);a=!!(!b&&c.d);a=!!(!(b,c)&&d);a=!!(!--b&&c);x=[!!(!b&&c)];x=-!!(!b&&c);a=!!(!b??c);a=!(0||!b);a=!!(1&&(b<c));a=!(1?!b:c)", {}, "a=!(b||!c),a=!(b&&!c),a=!(!b||c),a=!(!b&&c),a=!(b||c),a=!(b&&c),a=!(b||!c.d),a=!((b,c)||!d),a=!(--b||!c),x=[!(b||!c)],x=-!(b||!c),a=!b,a=!!b,a=b<c,a=!!b;"],
			// No shorter, read for its truth or unread, under one `!` or one not `!`, it stays; so does one holding a comment kept.
			["a=!!(b&&c);a=!!(!b&&c+d);a=!!(!b&&!c&&d);x=!!(!b&&c).y;if(!!(!b&&c))f();!!(!b&&c);a=!(!b&&c);a=-(1&&-b)", {}, "a=!!(b&&c),a=!!(!b&&c+d),a=!!(!b&&!c&&d),x=!!(!b&&c).y;if((!b&&c))f();!b&&c,a=!(!b&&c),a=-(-b);"],
			["x=!!(!b&&/*c*/c);y=!!(/*k*/!b&&c)", { format: { comments: "all" } }, "x=!!(!b&&/*c*/c),y=!!(/*k*/!b&&c);"],
			// A test `!!!t` printing `!t` swaps the branches for `t`, as `!t` does.
			["x=!!!(a,b)?c:d;x=!!!(a&&b)?c:d;if(!!!a)f();else g();x=!!(!a)?c:d", {}, "x=(a,b)?d:c,x=a&&b?d:c,a?g():f(),x=a?d:c;"],
			["!(x===undefined);!(typeof x()===\"undefined\");x===void 0;a()===b;a===b();f(a===b,c());g(),a()!==b(),h();x==void 0;({}).a===b();({}).a===b", {}, "x,typeof x(),x,a(),b,a,b(),f(a===b,c()),g(),a(),b(),h(),x==null,b(),b;"],
			// `x["length"]` folds as `x.length` does, and `"a"[0]` to its character; an `else if` known false goes, one known true prints its branch.
			["use(\"abc\"[\"length\"]);use([1,2,3][\"length\"]);use([,,1][\"length\"]);use(/a/[\"source\"]);use(\"a\"[\"x\"]);use(\"a\"[0]);use(a?.[\"length\"]);delete\"ab\"[\"length\"]", {}, "use(3),use(3),use(3),use(\"a\"),use(\"a\".x),use(\"a\"),use(a?.length),delete\"ab\".length;"],
			["if(xxx){foo}else if(false){bar};if(xxx){foo}else if(false){bar}else{baz};if(xxx){foo}else if(true){bar}else if(false){baz};if(x)a();else if(0){var q=1}", {}, "if(xxx)foo;if(xxx)foo;else baz;if(xxx)foo;else bar;if(x)a();else var q;"],
			// A part in parentheses, after a hole, prints what it holds.
			["function f(p3){([,(b+1)],g());({a:(h())});[(k()),,(m())]}", { mangle: false }, "function f(p3){b+1,g(),h(),k(),m()}"],
			// What a logical nobody reads holds is read for its truth; a conditional printing as `!t` or `!!t` takes what a unary takes.
			["(x?true:false)&&y();(x?true:y)&&y();(x&&true)&&y();(x||false)&&y();a?true:false;a?false:true;x=(a?!0:!1)||b;x=y&&(a?!0:!1);x=(a?!1:!0).b;x=(a<b?!0:!1)&&c;x=(a?!0:!1)+1;(a+b?!0:!1)&&c();x=(a?!1:!0)**2;x=(a?!0:!1)?1:2", {}, "x&&y(),(x||y)&&y(),x&&y(),x&&y(),a,a,x=!!a||b,x=y&&!!a,x=(!a).b,x=(a<b)&&c,x=!!a+1,(a+b)&&c(),x=(!a)**2,x=a?1:2;"],
			// esbuild's `x?y:0` as `x&&y` where only its truth is read: a constant branch, `NaN`, `-0` and `""` among them, is its boolean; `||` under `&&` keeps parentheses.
			["(x?y:0)&&f();(x?0:y)&&f();(x?1:y)&&f();(x?y:\"\")||f();(x?y:1)||f();(x?0:y)||f();if(x?y:NaN)f();a=(x?y:-0)?1:2;a=!(x?y:0);if(c?!!b:!!d)f()", {}, "x&&y&&f(),!x&&y&&f(),(x||y)&&f(),x&&y||f(),!x||y||f(),!x&&y||f();if(x&&y)f();a=x&&y?1:2,a=!(x&&y);if(c?b:d)f();"],
			// The value read, a branch not a constant, an object, `void 0`, `0n`, both branches constant or a branch `&&` would take in parentheses keeps `?:`.
			["a=(x?y:0)&&z;a=x?y:0;(x?y:{})&&f();(x?y:void 0)&&f();(x?[]:y)&&f();(x?0:0)&&f();(x?0n:y)&&f();(c?a||b:0)&&f();(x?y:g())&&f()", {}, "a=(x?y:0)&&z,a=x?y:0,(x?y:{})&&f(),(x?y:void 0)&&f(),(x?[]:y)&&f(),(x,0)&&f(),(x?0n:y)&&f(),(c?a||b:0)&&f(),(x?y:g())&&f();"],
			// terser's `switches`: cases ending a `switch` that run nothing go; one with none left runs its test, or goes from its list.
			["switch(a()){}switch(a){default:break}switch(a){case 3:b();case 2:case 1:}switch(a){case 3:b();break;case 2:break}switch(a){case f():}switch(a){default:b()}switch(a){case 1:b();break;case 2:c();case 3:}if(x)switch(y){case 1:}else z();function f(e){switch(e){case 2:}g()}switch(a){case 1:/*! k */}", {}, "a();a;if(a===3)b();if(a===3)b();switch(a){case f():}a,b();switch(a){case 1:b();break;case 2:c()}if(x)y;else z();function f(a){g()}switch(a){case 1:/*! k */}"],
			// A read in parentheses may be what they write, and with `unused` off the array stays: either keeps its reads.
			["function g(){const a=[1,2];(a[0])=3;f(a[0],a[1])}function h(){const a=[1,2];(a[0])++;f(a[0])}", { mangle: false }, "function g(){let a=[1,2];a[0]=3,f(a[0],a[1])}function h(){let a=[1,2];a[0]++,f(a[0])}"],
			["function g(){const a=[1,2];f(a[0],a[1])}", { mangle: false, compress: { toplevel: false, unused: false } }, "function g(){let a=[1,2];f(a[0],a[1])}"],
			// A case ending a `switch` that runs nothing stays where a `default` before it would take its value.
			["switch(a){default:b();case 0:break}switch(a){case 0:break;default:b();case 1:}switch(a){default:b();break;case 1:}", {}, "if(a!==0)b();switch(a){case 0:break;default:b();case 1:}if(a!==1)b();"],
			// What runs nothing before a callee goes but one `0`, which a bare `eval` keeps to read no scope; a function or class takes no `this`.
			["(0,1,eval)(),(0,1,f)(),(0,eval)()", {}, "(0,eval)(),f(),(0,eval)();"],
			["function g(a){(a,function(){h(this)})(),x=(a,function(){})(),new(a,function(){})(1),new(a,class{})}", { mangle: false }, "function g(a){(function(){h(this)})(),x=function(){}(),new function(){}(1),new class{}}"],
			// A `try` whose exit went runs nothing for its `catch`, its `finally` the tail.
			["function f(){try{return}catch(e){throw 9}finally{return}}function g(){try{return}finally{h();return}}function k(){try{return}catch(e){var q}finally{return}}for(;;)try{continue}catch(e){h()}finally{g();continue}", { mangle: false }, "function f(){}function g(){h()}function k(){try{}catch(e){}finally{return}}for(;;){g()}"],
			// A test known falsy, `undefined` too, runs nothing for a loop or `if`, labeled or not, that declares nothing.
			["if(void 0)f();while(void 0)g();for(;undefined;)h();l:for(;!1;);a:b:while(void 0)f();if(void 0)var q;function k(undefined){if(undefined)g()}", { mangle: false }, "if(void 0)var q;function k(undefined){if(undefined)g()}"],
			// A known test leaves a name called bare but `eval`, and `new` takes a name or member bare.
			["var a;(!0?a:0)(),(!1?0:a)``,new(!0?a:0),x=new(!0?a.b:0)(1),x=new(!0?a():0),(!0?eval:0)(\"x\")", { mangle: false }, "var a;a(),a``,new a,x=new a.b(1),x=new(a()),(0,eval)(\"x\");"],
			// A `finally` running nothing goes beside a `catch`; without one, the `try` runs as its block.
			["try{f()}catch(e){g()}finally{}try{f()}catch(e){}finally{/*c*/}a();try{f();b()}finally{}if(x)try{y()}finally{}else z();function k(){try{return g()}finally{}}", { mangle: false, format: { comments: "all" } }, "try{f()}catch(e){g()}try{f()}catch(e){}finally{/*c*/}a();f(),b();if(x){y()}else z();function k(){return g()}"],
			// terser's `loops` with an `else`: `if(x)break;else y` loops while `!x`, `if(x)y;else break` while `x`, `y` where the `if` was.
			["for(;;)if(x)break;else y();for(;a;){if(x)break;else y();z()}for(;;)if(!x)y();else break;for(;a;)if(x||w){y();q()}else break;for(;a||b;)if(c,d)y();else break;for(;;)if(x){let q=g();y(q,q)}else break;if(a){for(;;)if(x)break;else if(y)z()}else w()", { mangle: false }, "for(;!x;)y();for(;a&&!x;)y(),z();for(;!x;)y();for(;a&&(x||w);)y(),q();for(;(a||b)&&(c,d);)y();for(;x;){let q=g();y(q,q)}if(a){for(;!x;)if(y)z()}else w();"],
			// The branch kept joins the statements after it, the loop's braces going for one; an object opening it or a block kept stays apart.
			["for(;;){if(x)break;else y();z()}for(;;){if(x)y();else break;z()}while(1){if(x)break;else y()}", {}, "for(;!x;)y(),z();for(;x;)y(),z();while(!x)y();"],
			["for(;;){if(x)break;else({}).a=1;z()}for(;;){if(x)break;else{y();q()}z()}for(;;){if(x)break;else/*k*/y();z()}", { format: { comments: "all" } }, "for(;!x;){({}).a=1;z()}for(;!x;){y(),q();z()}for(;;){if(x)break;else/*k*/y();z()}"],
			// A block ending a loop an `if` with an `else` holds keeps its braces where it ends in an `if` the `else` would take.
			["if(q)for(;;){if(y)z()}else w();if(q)for(;;){if(x)break;else if(y)z()}else w();if(q)l:while(a){if(y)z()}else w();if(q)while(a){if(y)z();else v()}else w()", {}, "if(q)for(;;){if(y)z()}else w();if(q)for(;!x;){if(y)z()}else w();if(q)while(a){if(y)z()}else w();if(q)while(a)y?z():v();else w();"],
			// A function an `else` declares keeps its braces, and a label's comment its loop.
			["for(;a;){if(x)break;else function f(){}}for(;a;){if(x)break;else{y();z()}}/*! c */l:while(0)f();", { mangle: false }, "for(;a&&!x;){function f(){}}for(;a&&!x;){y(),z()}/*! c */l:while(0)f();"],
			// Nobody reading it, or only its truth, `x!=null&&x.y()` is `x?.y()`, but not where `with` may read the name twice otherwise.
			["function k(a,b){a!=null&&a.b();a==null||a.b();null!=a&&a[0]();null==a||a();if(a!=null&&a.b)f();x=a!=null&&a.b;a!=null&&a.b``;a!=null&&(a.b=1);a!==null&&a.b();b!=null&&a.b();a!=null&&a?.b();a!=null&&a.b?.c;a!=null&&ab.c}", { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a,b){a?.b(),a?.b(),a?.[0](),a?.();if(a?.b)f();x=a!=null&&a.b,a!=null&&a.b``,a!=null&&(a.b=1),a!==null&&a.b(),b!=null&&a.b(),a!=null&&a?.b(),a!=null&&a.b?.c,a!=null&&ab.c}"],
			["with(o)a!=null&&a.b()", { ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "with(o)a!=null&&a.b();"],
			// `??` takes a sequence or conditional parenthesized as `&&` and `||` do.
			["a.y!=null||(a={},a.y=3);a.y==null&&(b(),a.y=3);a.q!=null||(b?c():d())", { ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "a.y??(a={},a.y=3),a.y??(b(),a.y=3),a.q??(b?c():d());"],
			// An array or object an unread one holds prints only what it runs too.
			["[[f()]];({a:{b:f()}});[[1,[g()]],{a:h(),b:[1]}];x=[[f()]];[{a:{b:f()},c:[1,g()]}]", {}, "f(),f(),g(),h(),x=[[f()]],f(),g();"],
			// A call marked pure that nobody reads runs only its arguments, but not a spread or under a value read.
			["/*@__PURE__*/f(g());/*@__PURE__*/f(1,g(),h());/*#__PURE__*/new F(g());/*@__PURE__*/f({a:g()}.b);x=(/*@__PURE__*/f(g(),h()),1);x=void /*@__PURE__*/f(g(),h());/*@__PURE__*/a.b(g(),(h(),k()));/*@__PURE__*/f(...g());/*@__PURE__*/f(g())?.(h())", {}, "g(),g(),h(),g(),f({a:g()}.b),x=(g(),h(),1),x=void f(g(),h()),g(),(h(),k()),[...g()],f(g())?.(h());"],
			["!/*@__PURE__*/f(g(),h());!/*@__PURE__*/f((g(),h()));/*@__PURE__*/f(function(){g()}())", {}, "(g(),h()),(g(),h()),f(function(){g()}());"],
			// A branch beside the `break` running nothing leaves no statement, the loop running while the test is true.
			["while(a&&b){if(delete x.a){}else{break}f()}while(a){if(c);else break;f()}for(;;){if(c){/*! k */}else break;f()}while(a){if(c){var q}else break;f()}for(;;){if(x){}else break}", { mangle: false }, "while(a&&b&&delete x.a)f();while(a&&c)f();for(;;){if(c){/*! k */}else break;f()}while(a&&c){var q;f()}for(;x;);"],
			// A logical assignment every branch ends in hoists past a pure test, as a compound one does.
			["var a=foo,x=bar;x?a||=1:a||=2;f()?a||=1:a||=2;x?a||=1:a&&=2;x?a+=1:a+=2", { mangle: false }, "var a=foo,x=bar;a||=x?1:2,f()?a||=1:a||=2,x?a||=1:a&&=2,a+=x?1:2;"],
			// `x?x:y` is `x||y` for a global too, but not where `with` may answer it.
			["x?x:y", {}, "x||y;"],
			["x?x:y;with(o)x?x:y", {}, "x?x:y;with(o)x?x:y;"],
			// Nobody reading a boolean compared, its `!` goes; an integer equal to `0` is `!` of it wherever read, but not where parentheses would hold the `!`.
			["a instanceof b===false;delete x!=true;x=(a instanceof b)===false", {}, "a instanceof b,delete x,x=!(a instanceof b);"],
			["f((a&2)==0);f(0===(a&4));f((a&4)!=0);(a&2)==0,g();x=2+((a&2)==0);x=[(a^2)==0]", {}, "f(!(a&2)),f(!(a&4)),f((a&4)!=0),a&2,g(),x=2+((a&2)==0),x=[!(a^2)];"],
			// A `return` of what is `undefined` anyway ending a function prints what it runs, but not nested, after an `if` or as an arrow's body.
			["function f(){return void foo()}function g(){b;return a,void 0}function h(){if(x)return void g();else k()}function i(){return void function(){g()}()}function j(){return void {a:g()}.a}function k(){if(x)return void g();return void h()}function l(){return g(),void 0}f=()=>{return void g()};f=()=>{h();return void g()};class C{m(){return void g()}}", { mangle: false }, "function f(){foo()}function g(){b,a}function h(){if(x)return void g();k()}function i(){(function(){g()}())}function j(){({a:g()}.a)}function k(){return x?void g():void h()}function l(){g()}f=()=>void g(),f=()=>(h(),void g());class C{m(){g()}}"],
			// A test or branch `?:` parenthesized keeps its parentheses as an operand of `&&` or `||`.
			["x=f?!1:(g(),!0);x=f?(g(),v):!0;x=(f=a===b)?!1:v;x=(f=a===b)?v:!0;x=(f?l:r)?!1:v;x=(a,b)?!1:(c,d)", {}, "x=!f&&(g(),!0),x=!f||(g(),v),x=!(f=a===b)&&v,x=!(f=a===b)||v,x=!(f?l:r)&&v,x=!(a,b)&&(c,d);"],
			// `x!=null?x:y` is `x??y` where `y` stands bare after `??`, and `x!=null?x.y:void 0` is `x?.y`, wherever read.
			["function k(a){x=a!=null?a:b;x=a==null?b:a;x=a!=null?a.b.c[d](e):void 0;x=a==null?void 0:a();x=a!=null?a:b||c;x=a!=null?a:(b,c);x=(a!=null?a:b)||c;x=a!=null?a.b:c;x=a!=null?b.c:void 0}", { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a){x=a??b,x=a??b,x=a?.b.c[d](e),x=a?.(),x=a!=null?a:b||c,x=a??(b,c),x=(a??b)||c,x=a!=null?a.b:c,x=a!=null?b.c:void 0}"],
			["with(o)x=a!=null?a:b", { ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "with(o)x=a!=null?a:b;"],
			// So does a test printing as `x!=null`, from strict comparisons either way round; two names, one value twice or swapped branches stay.
			["function k(a){x=null===a||a===void 0?b:a;x=a!==undefined&&a!==null?a:b;x=void 0!==a&&null!==a?a.b:void 0;x=null===a||undefined===a}", { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a){x=a??b,x=a??b,x=a?.b,x=a==null}"],
			["function k(a,c){x=a===null||c===void 0?b:a;x=a!==void 0&&a!==null?b:a;x=a===null||a===null}", { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a,c){x=a===null||c===void 0?b:a,x=a!=null?b:a,x=a===null||a===null}"],
			// esbuild's `a?c:(b,c)` as `(a||b),c`, `a?(b,c):c` as `(a&&b),c` and `a?b||c:c` as `a&&b||c`, where shorter with the parentheses it adds.
			["a?c:(b,c);a?(b,c):c;a?b||c:c;x=a?(y=1)||c:c;x=a?b&&d||c:c;f(a?c:(b,c));x=(a?c:(b,c)).y;a?c:(f(),c);(a?c:(b,c))``;x=(a,b)?c:(d,c);a??b?c:(d,c)", {}, "a||b,c,a&&b,c,a&&b||c,x=a?(y=1):c,x=a&&b&&d||c,f((a||b,c)),x=(a||b,c).y,a||(f()),c,(a||b,c)``,x=((a,b)||d,c),(a??b)||d,c;"],
			["x=a?(b||d)||c:c;x=a?c:(f(),c);x=a?c:(b,d);x=a?c:(b,e,c);x=a?b||c:c+1;x=a?b||c:d;x=a?0||c:c", {}, "x=a?b||d||c:c,x=a?c:(f(),c),x=a?c:(b,d),x=a?c:(b,e,c),x=a?b||c:c+1,x=a?b||c:d,x=a?c:c;"],
			["x=a?c:(b,/*k*/c)", { format: { comments: "all" } }, "x=a?c:(b,/*k*/c);"],
			// terser's `a?b?c:d:d` as `a&&b?c:d` and `a?b:c?b:d` as `a||c?b:d`, but not where the inner `?:` swapped its branches.
			["x=a?b?c:d:d;x=a?b:c?b:d;x=a?!b?c:d:c;x=(a=1)?(b||e)?c:d:d;x=a||f?b?c:d:d;x=a?b:c||e?b:d;x=a?b?c:d:e", {}, "x=a&&b?c:d,x=a||c?b:d,x=a?b?d:c:c,x=(a=1,b||e?c:d),x=(a||f)&&b?c:d,x=a||c||e?b:d,x=a?b?c:d:e;"],
			["function k(a){x=a!=b?a:c;x=a!=null?a:b+c;x=a!=null?a:new B}x=(a,b)?(c,d)?e:f:f", { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a){x=a!=b?a:c,x=a??b+c,x=a??new B}x=(a,b)&&(c,d)?e:f;"],
			// terser's `t?f(a,x):f(b,x)` as `f(t?a:b,x)`, a local `f`, a pure test and one argument apart.
			["function f(a,b){x=a?b(c,d):b(e,d);x=a===0?b(c):b(e);x=a?b(...c):b(...e);x=a()?b(1):b(2);x=a?b(1,2):b(3,4);a?b(g(),1):b(g(),2);x=a?b(c=1):b(e);x=a?b((c,d)):b(e)}x=a?f(1):f(2)", { mangle: false }, "function f(a,b){x=b(a?c:e,d),x=b(a===0?c:e),x=a?b(...c):b(...e),x=a()?b(1):b(2),x=a?b(1,2):b(3,4),a?b(g(),1):b(g(),2),x=b(a?c=1:e),x=b(a?(c,d):e)}x=a?f(1):f(2);"],
			// terser's `unused` of a write whose value is read: nobody reading the name, it prints as the value, but not where the name is read, in its dead zone, through `arguments` or in dead code.
			["function f(){var a;return a=1}function g(b){let a;return a=c(),b}function h(){var a;x(a=1);if(a=k())l()}function i(){var a,b;x(a=b=k())}function j(){var a;x(a=k());return a}function k(){x(a=g());let a}function l(a){x(a=g());return arguments}function m(c){var a;for(a=1;c;)c()}function n(a){var m=1;if(!1)x(m=a);return m}function o(){var a;a=0,p(),q()}", { mangle: false }, "function f(){return 1}function g(b){return c(),b}function h(){x(1);if(k())l()}function i(){x(k())}function j(){var a;return x(a=k()),a}function k(){x(a=g());let a}function l(a){return x(a=g()),arguments}function m(c){for(;c;)c()}function n(a){var m=1;return m}function o(){p(),q()}"],
			// A `for` start running nothing goes.
			["for(0;c;)f();for(a.b,1;c;)f();for(/*! c */0;;);", {}, "for(;c;)f();for(a.b;c;)f();for(/*! c */0;;);"],
			// A function called whose value or last `return` runs nothing runs nothing, but not past a directive or a `return` before the end.
			["(x=>x+1)(1);((x,y)=>x+y)(1,2);(x=>{return x+1})(1);(()=>{return})();(function(){return 1})();x=(()=>2)();(()=>{return g()})();x=function(){f();return 1}();(function(){\"use strict\";return 1})();(function(){return;g()})()", {}, "x=2,g(),x=function(){return f(),1}(),function(){\"use strict\";return}(),function(){}();"],
			// A call `pure_funcs` names keeps what its arguments run in it.
			["debug(g());/*@__PURE__*/f(g())", { compress: { pure_funcs: ["debug"] } }, "debug(g()),g();"],
			// Nobody reading `&&`, `||` or `??`, a right side running nothing goes.
			["a||0;a&&0;a??0;f()||1,g();x=a||0;(a,b)||0;(function(){})||0;a()||b||0;(function(){}).call()||0", {}, "a,a,a,f(),g(),x=a||0,a,b,a()||b;(function(){}).call();"],
			// A `break` before cases running nothing does nothing, a test matched skipping the rest.
			["switch(foo){case\"bar\":bar();break;case\"moo\":case moo:case\"baz\":break}switch(a){case 1:b();break;case 2:c();break;case 3:}switch(a){case 1:b();break;default:break;case g():}switch(a){case 1:b();break;/*! c */case g():}", {}, "switch(foo){case\"bar\":bar();case\"moo\":case moo:}switch(a){case 1:b();break;case 2:c()}switch(a){case 1:b();default:case g():}switch(a){case 1:b();break;/*! c */case g():}"],
			// terser's `switches` of one case and a `default`: `if…else` after a `break`, the other after where one falls into it, in a list, its block keeping braces.
			["switch(a){case 1:b();break;default:c()}switch(a){case 1:b();default:c()}switch(a){default:c();break;case 1:b()}switch(a){default:c();case 1:b()}switch(a){default:b();break;case 1:}switch(a){case 1:break;default:b()}switch(a){case 1:b();break;default:if(y)z()}w();switch(a){case 1:if(y)z();break;default:w()}switch(a){case 1:{let q=g();f(q,q)}break;default:h()}switch(a){case 1:f();if(x)break;g();break;default:h()}for(;;)switch(a){case 1:f();break;default:g()}if(x){switch(a){case 1:f();default:g()}}else h();switch(a){/*! c */case 1:b();break;default:c()}switch(b()){case 1:c();break;default:d()}switch(a){case f():c();break;default:d()}", {}, "if(a===1)b();else c();if(a===1)b();c();if(a===1)b();else c();if(a!==1)c();b();if(a!==1)b();if(a!==1)b();if(a===1)b();else if(y)z();w();if(a===1){if(y)z()}else w();if(a===1){{let a=g();f(a,a)}}else h();switch(a){case 1:f();if(x)break;g();break;default:h()}for(;;)switch(a){case 1:f();break;default:g()}if(x){if(a===1)f();g()}else h();switch(a){/*! c */case 1:b();break;default:c()}if(b()===1)c();else d();if(a===f())c();else d();"],
			// terser's `loops`: `do` forever is `for(;;)`, and a body running once with nothing leaving it early runs where the loop was, but not labeled.
			["do{c()}while(!0);do{d();e()}while(0);f();do{if(x)break;d()}while(0);do{let q=g();h(q,q)}while(0);l:do{d()}while(0);if(a)do{d();e()}while(0);else f();do;while(0);do{switch(a){case 1:b()}}while(0);do{(function(){for(k in o)break})()}while(0)", {}, "for(;;)c();d(),e();f();do{if(x)break;d()}while(0);{let e=g();h(e,e)}do{d()}while(0);if(a){d(),e()}else f();do{if(a===1)b()}while(0);!function(){for(k in o)break}();"],
			// terser's `dead_code` of a loop whose body is a `break`: what sets it up and its test run once, and one running nothing goes from its list.
			["for(;;)break;for(a();;)break;for(;b();)break;for(c();d();)break;for(;;e())break;for(f();;g())break;for(;h();i())break;for(j();k();l())break;while(x())break;while(x()){break}if(a)while(x())break;else y();for(var i=0;x;)break;l:while(x())break;for((a in b);c;)break;for(;function(){}();)break", {}, "a();b();c(),d();f();h();j(),k();x();x();if(a)x();else y();for(var i=0;x;)break;while(x())break;(a in b),c;"],
			// terser's `evaluate`: `!` of an object made running nothing is `!1`, `delete` of what is no reference `!0` and of the global `undefined` or `NaN` `!1`, but a write in it stays.
			["x=![1,2];x=!/foo/;x=!0;x=!\"\";x=!{};x=![f()];x=delete(1/0);x=delete void 0;x=delete undefined;x=delete NaN;x=delete(0,a);x=delete 1;x=delete a.b;x=delete(a);x=delete a?.b;x=delete f();if(delete 1)g();var b;x=delete(b=NaN)", { compress: { toplevel: true } }, "x=!1,x=!1,x=!0,x=!0,x=!1,x=![f()],x=!0,x=!0,x=!1,x=!1,x=delete(0,a),x=!0,x=delete a.b,x=delete a,x=delete a?.b,x=delete f();g();var b;x=delete(b=NaN);"],
			// A function called prints as what it returns past parameters passed nothing nothing reads, but not one it returns or where `arguments` reads them.
			["console.log((function(x,y,z){return 123})());console.log(function(x,y,z){return z}());console.log(function(x){return 6}(a));function q(b){console.log(function(x,y){return x}(b))}console.log(function(x){return arguments.length}())", {}, "console.log(123),console.log(function(n,o,t){return t}()),console.log(function(n){return 6}(a));function q(n){console.log(n)}console.log(function(n){return arguments.length}());"],
			// A logical expression a known left side folds to a name called prints the name, and `eval`, a member or one `typeof` reads after `0,`.
			["x=null??y;(null??f)();(null??x.y)();(1&&f)();(0||x.y)``;(null??eval)(\"x\");typeof(null??q);(0||g)``", {}, "x=y,f(),(0,x.y)(),f(),(0,x.y)``,(0,eval)(\"x\"),0,q,(g)``;"],
			// esbuild's `??` of a function, class or object outside a statement's start is it, and of `void 0` its right side; one an object would open or `void` of a call stays.
			["x(class{}??1);x(function(){}??1);x(void 0??1);(void 0??a.b)();x=({}??1).y;x=(void 0??a)+1;y=void 0??(a,b)", {}, "x(class{}),x(function(){}),x(1),(0,a.b)(),x=({}).y,x=a+1,y=(a,b);"],
			["x(void 0??{});x(void f()??1);({}??g()).x", {}, "x(void 0??{}),x(void f()??1);({}??g()).x;"],
			// A function running nothing called runs only its arguments where nobody reads the call.
			["(function(){})(a(),b());(()=>{})(c());x=(function(){})(a())", {}, "a(),b(),c(),x=function(){}(a());"],
			// A logical folding to an assignment keeps the parentheses that needs under the same operator.
			["a&&(1&&(x=1));const T=1;b&&(T&&(y=1))", {}, "a&&(x=1);const T=1;b&&T&&(y=1);"],
			// A BigInt zero is falsy but strictly unequal to `0`: only `==` and `!=` fold an integer's comparison with it.
			["if((a|b)!==0)f();if((a|b)!=0)g();x=(a&b)===0;x=(a&b)==0", {}, "if((a|b)!==0)f();if(a|b)g();x=(a&b)===0,x=!(a&b);"],
			// `eval?.()` is an indirect `eval`, which reads no local name: a guarded direct one stays.
			["function f(eval){var v=42;eval!=null&&eval(\"v=43\");x=eval!=null?eval(\"v\"):void 0;return v}", { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function f(eval){var v=42;return eval!=null&&eval(`v=43`),x=eval!=null?eval(`v`):void 0,v}"],
			// A name a value collapsed into prints that value, which `!` parenthesizes; an update or `await` joins `&&` bare.
			["function f(o){var h=!1;for(var i=0;i<9;i++){h=o[i]===!0;if(h)break}return h}function g(o){var h;h=o.a===1;if(h)return;k()}for(;i--;){if(x)break;y()}x=!(i--)?1:2", { mangle: false }, "function f(o){for(var h=!1,i=0;i<9&&!(h=o[i]===!0);i++);return h}function g(o){if(!(o.a===1))k()}for(;i--&&!x;)y();x=i--?2:1;"],
			// An inlined body's statement prints as an operand, so its sequence keeps its parentheses; a function moved into `Object(f)` keeps the call.
			["(function(){if(x)return;(a(),b)+c})()", {}, "x||(a(),b)+c;"],
			["(function(){var f=function(){g()};Object(f)(1)})()", {}, "Object(function(){g()})(1);"],
			// An assignment collapsed into the test of an `if` printing as `?:` is that test, in parentheses.
			["x=y+c;if(x)y+c;else d();function f(){x=y+c;if(x)return a;return b}", {}, "(x=y+c)?y+c:d();function f(){return(x=y+c)?a:b}"],
			// A call printing as `null` or a regular expression needs no parentheses read off; a value folded into its read prints where that is; an `else if` known later leaves its `if` nothing.
			["function r(){return null}function q(){return/a/}x=r().filepath;y=q().source;function f(a){var b=g(a);var n={a:a,b:b};return n}f(()=>{if(!1)return;else if(!1){return}else{}g()})", { mangle: false }, "function r(){return null}function q(){return/a/}x=r().filepath,y=q().source;function f(a){return{a:a,b:g(a)}}f(()=>{g()});"],
			// What prints first in a statement again parenthesizes an object, function or class alone, so one inside a part or argument keeps its literal or call; a `+` before one stays; a `do` running nothing once prints nothing in a list.
			["({1:{toString(){}}/2});/*@__PURE__*/f({a:g()}.b);x=+{}/2;+function(){}/3;do{}while(0);a();do;while(0);b();if(x)do{}while(0);else c();do g();while(0)", {}, "({1:{toString(){}}/2});f({a:g()}.b),x=+{}/2,+function(){}/3;a();b();if(x){}else c();g();"],
			// A strict comparison with `0` folds only where no BigInt reaches it.
			["if((a>>>b)!==0)f();if(((a|1)&b)===0)g();if((a&b)===0)h()", {}, "if(a>>>b)f();if(!((a|1)&b))g();if((a&b)===0)h();"],
			// `if(t)if(u)x` is `if(t&&u)x` where neither test needs parentheses there, as what a test prints as decides.
			["if(a)if(b)c();if(a)if(b)if(c)d();if(p){if(a){if(b)c()}}else z();if(a=1)if(b=2)c();if(a)if(b)c();else d();function f(){if(x)return;if(a)if(b)c()}", {}, "if(a&&b)c();if(a&&b&&c)d();if(p){if(a&&b)c()}else z();if(a=1)if(b=2)c();if(a)b?c():d();function f(){if(!x&&a&&b)c()}"],
			["function f(){var x=a||b;if(x)if(c)d()}function g(){if(c)if((()=>a||b)())d()}function h(){if(y)return;if((()=>a||b)())d()}function k(){while((()=>a||b)()){if(x)break;g()}}", {}, "function f(){if(a||b)if(c)d()}function g(){if(c)if(a||b)d()}function h(){if(!y&&(a||b))d()}function k(){while((a||b)&&!x)g()}"],
			["if(c)if(1?a||b:0)d();if(c)if(1?a:0)d();if(c)if(0||(a||b))d();if(c)if(0||a)d()", {}, "if(c)if(a||b)d();if(c&&a)d();if(c)if(a||b)d();if(c&&a)d();"],
			// A comparison printed as `!x` takes a `!` bare.
			["x=!((e&6)==0);x=!((e&6)!=0);x=-((e&6)==0);function f(){return 0===(e&6)?g():!0}", {}, "x=!!(e&6),x=!(e&6),x=-((e&6)==0);function f(){return!!(e&6)||g()}"],
			// terser's `if_return`: `if(t)return;x;y` is `if(!t){x;y}`, unbraced where they print as one statement, and kept where a block would scope what they declare.
			["while(x){if(y)continue;z();w()}function f(){if(x)return;a();if(y)return;b();c()}function n(){if(x)return;a();for(;;)b()}function m(){if(x)return;a();class K{}b(K)}function p(){if(x)return;a();;b()}", {}, "while(x)if(!y)z(),w();function f(){if(!x){a();if(!y)b(),c()}}function n(){if(!x)for(a();;)b()}function m(){if(x)return;a();class n{}b(n)}function p(){if(!x)a(),b()}"],
			// A loop's body printing as one statement drops its braces, its last statement owing the `;` the brace took.
			["while(x){if(y)continue;z();w()}g();for(;;){if(y)continue;z();if(q)continue;w();v()}g();for(;;){if(y)continue;z();a={}}g();if(a)for(;;){if(y)continue;z();w()}else q();for(;;){}", {}, "while(x)if(!y)z(),w();for(g();;)if(!y){z();if(!q)w(),v()}for(g();;)if(!y)z(),a={};g();if(a)for(;;){if(!y)z(),w()}else q();for(;;);"],
			// A `do` body ending in a `break` runs once where the loop was, its test never.
			["do{foo();break}while(0);do{break}while(!new Date());do{foo();break}while(x());if(a)do{f();g();break}while(x);else h();for(;;)do{break}while(x);do{let q=f(),r=g();h(q,r,q,r);break}while(x);do{a={};break}while(x);do{for(;;){}break}while(x);do{if(a)break;f();break}while(x)", {}, "foo();foo();if(a){f(),g()}else h();for(;;);{let e=f(),o=g();h(e,o,e,o)}a={};for(;;);do{if(a)break;f();break}while(x);"],
			// A `try` every path of which leaves, or an `if` both branches of which do, leaves its `else` to print after it.
			["function f(){if(a)try{return g()}catch{return g()}else throw i()}function k(){if(a)try{b}finally{return g()}else throw i()}function m(){if(a)try{return b}catch{c}else throw i()}function n(){if(a){if(b)return 1;else throw 2}else g();h()}function p(){if(a)try{return 1}finally{c()}else g();h()}", {}, "function f(){if(a)try{return g()}catch{return g()}throw i()}function k(){if(a)try{b}finally{return g()}throw i()}function m(){if(a)try{return b}catch{c}else throw i()}function n(){if(a){if(b)return 1;throw 2}g();h()}function p(){if(a)try{return 1}finally{c()}g();h()}"],
			// A call printing as the unary its function returns is parenthesized as that unary.
			["x=(()=>-a)()**2;x=(()=>!a)().b;x=(()=>!a)()();x=`${(()=>!a)()}`;x=(()=>void a)()``;function q(){do{break}while(e)}", {}, "x=(-a)**2,x=(!a).b,x=(!a)(),x=`${!a}`,x=(void a)``;function q(){}"],
			// A statement printing its body in place, or a `switch` as an `if` and what falls through, is several statements: braces hold them.
			["if(a){do{for(;;)g();f();break}while(x)}if(a){do{for(;;)g();f()}while(0)}if(a){try{}finally{for(;;)g();f()}}for(;;){do{for(;;)g();f();break}while(x)}if(a){try{for(;;)g();f()}finally{}}", {}, "if(a){for(;;)g();f()}if(a){for(;;)g();f()}if(a){for(;;)g();f()}for(;;){for(;;)g();f()}if(a){for(;;)g();f()}"],
			["function f(){if(x)return;do{for(;;)g();a()}while(0)}function k(){if(x)return;switch(d){case 1:a();default:b()}}function m(){for(;;){if(x)continue;g();switch(d){case 1:a();default:b()}}}function n(){if(x)return;try{for(;;)g();a()}finally{}}l:for(let i=0;i<1;i++){switch(i){case 0:continue l;default:break l}}for(;;){if(x)continue;break}", {}, "function f(){if(!x){for(;;)g();a()}}function k(){if(!x){if(d===1)a();b()}}function m(){for(;;)if(!x){g();if(d===1)a();b()}}function n(){if(!x){for(;;)g();a()}}i:for(let i=0;i<1;i++){if(i===0)continue;break i}for(;;)if(!x)break;"],
			// terser's `dead_code`: a `var` past an exit declares its names and sets none, so no read folds its value; a pattern keeps it.
			["function f(){use(()=>x);return 1;var x=g()}function k(){g();return;var x=h(),y=k()}function m(){return n;var x=5;function n(){return x}}function p(){return;var [a,b]=g();use(()=>a)}function q(){if(x)return;do{}while(y)}", {}, "function f(){return use(()=>n),1;var n}function k(){g()}function m(){return function(){return n};var n}function p(){return;var[n,r]=g()}function q(){if(!x)do{}while(y)}"],
			// A test the guard would negate in parentheses keeps its exit, which compresses better.
			["function f(){if(a&&b)return;c();d()}function g(){if(a===b)return;c();d()}function h(){if(a<b)return;c();d()}", {}, "function f(){if(a&&b)return;c(),d()}function g(){if(a!==b)c(),d()}function h(){if(a<b)return;c(),d()}"],
			// terser's `join_vars`: a later `var` declaring names only joins the first `var` printed; one with a value or a pattern stays.
			["function f(fn){var frame=c.get(fn);if(frame!==void 0)return frame;var control;g(control=h());return control}function k(){var a=g(),b;h(a,b);var c,d;var [e]=a;var q;use(c,d,e,q)}", {}, "function f(r){var a=c.get(r),n;if(a!==void 0)return a;return g(n=h()),n}function k(){var r=g(),a;h(r,a);var n,e,[f]=r,o;use(n,e,f,o)}"],
			// A sequence setting the declared names in their order gives them their values; one set before an earlier name stays.
			["function f(){var a,b,c;a=g(),c=h(),k();return[a,b,c]}function h2(){var a,b;b=g(),a=h();let c,d;c=1,d=a;return[a,b,c,d]}", {}, "function f(){var a=g(),c,n=h();k();return[a,c,n]}function h2(){var a,c=g();a=h();let n;n=a;return[a,c,1,n]}"],
			// terser's `join_vars` of a statement and the loop after it: an expression or a `var` whose names the loop sets joins the head, a bare `var` taking the value the `for` sets first or the name `for`-`in` and `for`-`of` assign, and a `let` takes the value it is first set to.
			["function f(){var a=0;for(;a<9;a++)use(a)}function h(){init();for(;c<b;c++)use()}function k(){var a=1;for(var b=2;;)use(a++,b)}function m(){var a;for(a=use();a;a=a.next)use(a)}function n(){var a;for(a in b)use(a)}function p(){var a;for(a of b)use(a)}function q(){if(x){var a;for(a in b)use(a)}}function r(){let a;for(a=1;a<9;a++)use(a)}", {}, "function f(){for(var a=0;a<9;a++)use(a)}function h(){for(init();c<b;c++)use()}function k(){for(var a=1,n=2;;)use(a++,n)}function m(){for(var a=use();a;a=a.next)use(a)}function n(){for(var a in b)use(a)}function p(){for(var a of b)use(a)}function q(){if(x)for(var a in b)use(a)}function r(){let a=1;for(;a<9;a++)use(a)}"],
			// A `let` or `const` stays outside, as does a `var` with a value a `for`-`in` sets, one of several declarators, one read in the value it would take, one a `var` before takes bare, a directive, a statement reading a name declared right before it, a `let` whose value runs code and a `var` the loop never sets, which folds or goes.
			["function f(){let a=0;for(;a<9;a++)use(a);use(a)}function h(){var a=1;for(a in b)use(a)}function k(){var a,b;for(b in c)use(a,b)}function m(){var a;for(a=use(a);;a++)use(a)}function n(){x();for(y();;)use()}function p(){\"use strict\";for(;;)use()}function r(){let a;for(a=use();a<9;a++)use(a)}function u(){var a=use();x.y=a;for(;;)use()}function v(){var c=use();var a;for(a in b)use(a,c)}function w(c){var a=2;for(;c;)c(a)}function z(c){var a;for(a=1;c;)c()}", {}, "function f(){let a=0;for(;a<9;a++)use(a);use(a)}function h(){var a=1;for(a in b)use(a)}function k(){var a,u;for(u in c)use(a,u)}function m(){var a;for(a=use(a);;a++)use(a)}function n(){x();for(y();;)use()}function p(){\"use strict\";for(;;)use()}function r(){let a;for(a=use();a<9;a++)use(a)}function u(){var a=use();x.y=a;for(;;)use()}function v(){var a=use(),u;for(u in b)use(u,a)}function w(a){for(;a;)a(2)}function z(a){for(;a;)a()}"],
			["function f(){var b=use();use(b);var a;for(a in c)use(a)}function g(){var b=use();use(b);var a=0;for(;a<9;a++)use(a)}function h(){var b=use();use(b);use();for(;;)use()}function k(){var [a]=use();for(;;a++)use(a)}", {}, "function f(){use(use());var a;for(a in c)use(a)}function g(){use(use());for(var a=0;a<9;a++)use(a)}function h(){use(use());for(use();;)use()}function k(){var[a]=use();for(;;a++)use(a)}"],
			// A global no rule drops joins whether the loop sets it or not, but not in a static block or under `toplevel`.
			["var a=0;for(;c<b;c++)use();if(x){var d;for(d in b)use()}class C{static{var e=0;for(;c<b;c++)use()}}use(C)", {}, "for(var a=0;c<b;c++)use();if(x)for(var d in b)use();class C{static{for(;c<b;c++)use()}}use(C);"],
			["var a=0;for(;c<b;c++)use()", { compress: { toplevel: true } }, "for(;c<b;c++)use();"],
			["function f(){var a=0;/* c */for(;a<9;a++)use(a)}function h(){var a=0;for(;a<9;a++)use(a)}", { format: { comments: "all" } }, "function f(){var a=0;/* c */for(;a<9;a++)use(a)}function h(){for(var a=0;a<9;a++)use(a)}"],
			["function f(){var a=\"x\"in o;for(;;a++)use(a)}function h(){a=\"x\"in o;for(;;)use()}", {}, "function f(){for(var n=(\"x\"in o);;n++)use(n)}function h(){a=\"x\"in o;for(;;)use()}"],
			// A `var` whose declarators print their values apart is several statements: a loop keeps its braces, and no bare `var` joins it.
			["function f(){for(let i=0;i<3;i++){var v=i,w=g(i)}}function k(){var b=2,a=f();use(b);var c;use(c=1,c)}", {}, "function f(){for(let i=0;i<3;i++){i;g(i)}}function k(){f();use(2);var i;use(i=1,i)}"],
			// terser's `a|(b|c)` as `a|b|c`, for `|`, `&` and `^` alone.
			["x=a|(b|c);x=a&(b&c);x=a^(b^c);x=a|(b&c);x=a&(b|c);x=a-(b-c);x=a|((b|c)|d)", {}, "x=a|b|c,x=a&b&c,x=a^b^c,x=a|b&c,x=a&(b|c),x=a-(b-c),x=a|b|c|d;"],
			["x=a|/*k*/(b|c)", { format: { comments: "all" } }, "x=a|(/*k*/b|c);"],
			["function f(x){x=x+(/*k*/a-b);h(x)}", { format: { comments: "all" } }, "function f(x){h(x+=(/*k*/a-b))}"],
			// An operand opening with a group of its own keeps it: only parentheses wrapping it whole go.
			["function f(x){x=x|((g(),h())|f(c));k(x)}", {}, "function f(x){k(x|=(g(),h())|f(c))}"],
			// A call of a function moved to it that runs nothing prints its arguments, or nothing as a statement no `?:` prints.
			["x=()=>{function nested(){}nested()};y=()=>{var n=function(){};n();g()};function f(){function n(){}if(a){n()}else b()}function k(){function n(){}h(n(g()))}", {}, "x=()=>{},y=()=>{g()};function f(){a?[]:b()}function k(){h(function(){}(g()))}"],
			["function m(){function g(){}f();g(1,h(),...a);k()}", {}, "function m(){f(),[h(),...a],k()}"],
			// A write nobody reads keeps a value that is a reference where it is called, `eval`'d or read by `typeof`; a `do` ending in an open `if` keeps its loop before an `else`; a negated name prints what it holds bare.
			["function f(){var x;(x=o.m)()}function g(){var x;(x=eval)(\"1\")}function h(){var x;return typeof(x=y)}function k(){var x;m(x=n())}if(a)do if(b)x();while(0);else y();function p(e,b){var h=b&&q(e);if(!h)return;r();s()}", {}, "function f(){var n;(n=o.m)()}function g(){var n;(n=eval)(\"1\")}function h(){var n;return typeof(n=y)}function k(){m(n())}if(a)do{if(b)x()}while(0);else y();function p(n,f){if(f&&q(n))r(),s()}"],
			// An async generator awaits what it returns, so `return void 0` ending one keeps its `return`.
			["async function*g(){return void 0}async function*h(){x();return void 0}function k(){x();return void 0}", {}, "async function*g(){return void 0}async function*h(){return x(),void 0}function k(){x()}"],
			// `!` negates an optional chain whole.
			["function f(){if(t?.has(x))return;y()}for(;;){if(t?.has(x))continue;y()}x=t?.a?!1:y", {}, "function f(){if(!t?.has(x))y()}for(;;)if(!t?.has(x))y();x=!t?.a&&y;"],
			// A built-in called on primitives prints its answer where that is no longer, and folds what reads it.
			["x=[parseInt(\"12\"),isNaN(\"a\"),Math.max(1,2),String.fromCharCode(65),\"Ab\".toLowerCase(),(12).toString(16),\"ab\".concat(\"c\").toUpperCase()];if(isNaN(1))f()", {}, "x=[12,!0,2,\"A\",\"ab\",\"c\",\"ABC\"];"],
			["x=[Math.min(-1,2),Math.min(-1,2).x,-Math.abs(-3),Math.min(-1,2)()]", {}, "x=[-1,(-1).x,-3,(-1)()];"],
			// One newer than `builtinsEcma` folds only once it reaches the built-in's edition.
			["x=[\"ab\".padStart(3),Math.sign(-2),\"x\".repeat(2)]", {}, "x=[\"ab\".padStart(3),Math.sign(-2),\"x\".repeat(2)];"],
			["x=[\"ab\".padStart(3),Math.sign(-2),\"x\".repeat(2)]", { compress: { toplevel: false, builtinsEcma: 2020 } }, "x=[\" ab\",-1,\"xx\"];"],
			// ECMAScript 5 reads no binary or octal string, which the build's engine would.
			["x=[Number(\"0b1\"),Math.abs(\" 0O7\"),Number(\"0x1\")]", { compress: { toplevel: false, builtinsEcma: 5 } }, "x=[Number(\"0b1\"),Math.abs(\" 0O7\"),1];"],
			["x=[Number(\"0b1\"),Math.abs(\" 0O7\")]", { compress: { toplevel: false, builtinsEcma: 2015 } }, "x=[1,7];"],
			["x=[Number(+\"0b1\"),-\"0o7\",\"0b1\"*1,\"0b1\"===\"0b1\",typeof \"0b1\",!\"0b1\"]", { compress: { toplevel: false, builtinsEcma: 5 } }, "x=[Number(+\"0b1\"),-\"0o7\",\"0b1\"*1,!0,\"string\",!1];"],
			["x=[Number(+\"0b1\"),-\"0o7\",\"0b1\"*1]", { compress: { toplevel: false, builtinsEcma: 2015 } }, "x=[1,-7,1];"],
			// Not given, it is the compressor's `ecma`: an engine running that syntax has the built-ins too.
			["x=[\"ab\".padStart(3),Math.sign(-2),\"x\".repeat(2)]", { compress: { toplevel: false, ecma: 2015 } }, "x=[\"ab\".padStart(3),-1,\"xx\"];"],
			["x=[\"ab\".padStart(3),Math.sign(-2),\"x\".repeat(2)]", { compress: { toplevel: false, ecma: 2020, builtinsEcma: 5 } }, "x=[\"ab\".padStart(3),Math.sign(-2),\"x\".repeat(2)];"],
			["x=[\"a\".repeat(99),(1).toPrecision(22),(1.5).toPrecision(2),(1).toFixed(20)]", { compress: { toplevel: false, builtinsEcma: 2020 } }, "x=[\"a\".repeat(99),1..toPrecision(22),\"1.5\",1..toFixed(20)];"],
			// It stays a call where an engine may answer otherwise, throws, answers no finite primitive or runs code.
			["x=[\"\u00c4\".toLowerCase(),decodeURI(\"%\"),parseFloat(\"x\"),Math.max(),\"a\".repeat(99),\"ab\".concat(g()),1.5.toString(2),(1).toFixed(30),parseInt(\"\u180e1\"),\"ab\".concat(\"c\").length,1..toFixed(1)]", {}, "x=[\"\u00c4\".toLowerCase(),decodeURI(\"%\"),parseFloat(\"x\"),Math.max(),\"a\".repeat(99),\"ab\".concat(g()),1.5.toString(2),1..toFixed(30),parseInt(\"\u180e1\"),\"abc\".length,\"1.0\"];"],
			["function f(Math,parseInt){x=[Math.abs(-1),parseInt(\"1\")]}x=[Math?.abs(-1),Math.abs?.(-1),Math.abs(...[g]),Math.abs(/*! c */1)]", {}, "function f(a,t){x=[a.abs(-1),t(\"1\")]}x=[Math?.abs(-1),Math.abs?.(-1),Math.abs(g),Math.abs(/*! c */1)];"],
			["x=[Math.abs(-1),parseInt(\"1\")]", { compress: { toplevel: false }, mangle: false, keep_fnames: true }, "x=[1,1];"],
			["x=hasOwnProperty.call(a,b)+constructor.name(1)", {}, "x=hasOwnProperty.call(a,b)+constructor.name(1);"],
			// A call measured by what it holds stays one where an argument is worked out, and where its answer prints longer.
			["x=[Math.min(1/3-1,0,0),Math.sqrt(.5),Math.max(1,2).x]", {}, "x=[Math.min(1/3-1,0,0),Math.sqrt(.5),2..x];"],
			["x=[Math.abs(-(1+1)),`ab`.concat(`c`),`a${1}`.concat(\"b\"),Math.max(1.5,2.5).x,Math.min(-1,2)()]", {}, "x=[Math.abs(-2),\"abc\",\"a1\".concat(\"b\"),2.5.x,(-1)()];"],
			["x=[\"abcNaNdef\".indexOf(NaN),(-Infinity).toString(),String.fromCharCode(Infinity),isFinite(-Infinity),\"a function\".indexOf(typeof function(){})]", {}, "x=[3,\"-Infinity\",\"\\0\",!1,\"a function\".indexOf(\"function\")];"],
			// A built-in the program may replace, set, passed or stored anywhere, stays a call; a parse past 20 digits or in another radix too.
			["Math.abs=f;String.prototype.concat=g;globalThis.parseFloat=h;Math[1]=k;x=[Math.abs(-1),\"a\".concat(\"b\"),parseFloat(\"1\"),Math.max(1,2),parseInt(\"1\")]", {}, "Math.abs=f,String.prototype.concat=g,globalThis.parseFloat=h,Math[1]=k,x=[Math.abs(-1),\"a\".concat(\"b\"),parseFloat(\"1\"),2,1];"],
			["delete Number.prototype.toFixed;Math.round++;[String.prototype.trim]=[f];for(Math.ceil in o);x=[(1).toFixed(1),Math.round(1.5),\" a\".trim(),Math.ceil(1.5),Math.floor(1.5)]", {}, "delete Number.prototype.toFixed,Math.round++,[String.prototype.trim]=[f];for(Math.ceil in o);x=[1..toFixed(1),Math.round(1.5),\" a\".trim(),Math.ceil(1.5),1];"],
			["window[k]=f;x=[parseInt(\"1\"),Math.abs(-1)]", {}, "window[k]=f,x=[parseInt(\"1\"),Math.abs(-1)];"],
			["var g=globalThis;g.parseInt=f;x=parseInt(\"12\")", {}, "var g=globalThis;g.parseInt=f,x=parseInt(\"12\");"],
			["({abs:Math.abs}={abs:f});[...Math.round]=[];({...Math.ceil}=o);x=[Math.abs(-1),Math.round(1.5),Math.ceil(1.5),Math.floor(1.5)]", {}, "({abs:Math.abs}={abs:f}),[...Math.round]=[],({...Math.ceil}=o),x=[Math.abs(-1),Math.round(1.5),Math.ceil(1.5),1];"],
			["window.Math=m;String.prototype=p;x=[Math.abs(-1),parseInt(\"1\"),\"a\".concat(\"b\"),String.fromCharCode(65)]", {}, "window.Math=m,String.prototype=p,x=[Math.abs(-1),1,\"a\".concat(\"b\"),\"A\"];"],
			["Object.assign(Math,o);function q(a=Number){}var s=String;x=[Math.abs(-1),Number.isNaN(1),\"a\".concat(\"b\")]", {}, "Object.assign(Math,o);function q(a=Number){}var s=String;x=[Math.abs(-1),Number.isNaN(1),\"a\".concat(\"b\")];"],
			["Object.setPrototypeOf(Number.prototype,p);g(Math,[String],{a:Number});Object.keys(Math);Object[k](Math);x=[Math.abs(-1),(1).toFixed(1),\"a\".concat(\"b\")]", {}, "Object.setPrototypeOf(Number.prototype,p),g(Math,[String],{a:Number}),Object.keys(Math),Object[k](Math),x=[1,1..toFixed(1),\"ab\"];"],
			["x=[parseInt(\"z\",36),parseInt(\"123456789012345678901234\"),parseFloat(\"1.23456789012345678901234\"),parseInt(\"ff\",16)]", {}, "x=[parseInt(\"z\",36),parseInt(\"123456789012345678901234\"),parseFloat(\"1.23456789012345678901234\"),255];"],
			["function f(Math){Math.abs=g;h(Math)}Math.prototype.abs=k;y=1;x=Math.abs(-1)", {}, "function f(a){a.abs=g,h(a)}Math.prototype.abs=k,y=1,x=1;"],
			// Constructed, it parenthesizes only a sign, as a second print would.
			["x=[new(\"abc\".concat(1,\"def\")),new(Math.min(-1,2)),new(Math.min(1,2))(3),new(g(1))]", {}, "x=[new\"abc1def\",new(-1),new 1(3),new(g(1))];"],
			// Unread, it goes however long its answer; an outer call folds on it, and another radix needs a safe integer.
			["Math.sqrt(2);x=[Math.ceil(Math.sqrt(2)),(1e20).toString(36),(35).toString(36)]", {}, "x=[2,1e20.toString(36),\"z\"];"],
			// An unread built-in call that can't throw or run code goes: terser's `builtins_pure` tables, edition-gated, with converted arguments checked.
			["Date();new Array(4);String({a:1,b:[2]});Number([1]);Boolean(function(){});new Error(\"m\");Math.max(1,\"2\");Date.now();Object.isFrozen({});Object.isFrozen();new Math.abs(1);new Date.now;x=1", {}, "Object.isFrozen(),new Math.abs(1),new Date.now,x=1;"],
			["Array(-1);new Array(2**32);Array(a);String({toString(){return f()}});String({valueOf:f});String({__proto__:p});String({[k]:1});String({...o});String(1n);Error(\"m\",{get cause(){f()}});Error(\"m\",{cause:1});Math.abs(a);Math.random();x=1", {}, "Array(-1),Array(2**32),Array(a),String({toString(){return f()}}),String({valueOf:f}),String({__proto__:p}),String({[k]:1}),String({...o}),Error(\"m\",{get cause(){f()}}),Math.abs(a),x=1;"],
			// `Math.random` nothing reads is unobservable, and `NaN` and `Infinity` convert as numbers.
			["Math.abs(Math.random());Math.abs(-NaN);Math.min(0,-Infinity,NaN);Math.abs(-1n);x=1", {}, "Math.abs(-1n),x=1;"],
			["Math.abs(Math.random());Math.random=g;Math.random();x=1", {}, "Math.abs(Math.random()),Math.random=g,Math.random(),x=1;"],
			["function h(NaN,Infinity){Math.abs(-NaN);Math.abs(Infinity)}", {}, "function h(a,n){Math.abs(-a),Math.abs(n)}"],
			// A `concat` of an array literal joins the array literals and constants it leads with.
			["x=[[1,2].concat(1).concat(2,[\"a\"]),[].concat([],[3],[]),[].concat(1,y),[].concat(1,...y),[].concat(),[1].concat(2).length,[].concat(1).concat([2,3]).join(\"-\")];[1].concat(2)", {}, "x=[[1,2,1,2,\"a\"],[3],[1].concat(y),[1].concat(...y),[],[1,2].length,\"1-2-3\"],[1,2];"],
			// A hole reads the prototypes, an argument may be an array, and a comment stays in place.
			["x=[[1,,2].concat(3),[1].concat([,2]),[1].concat([...a]),[...a].concat(1),[f()].concat(g(),[h()]),[1].concat(y).concat(2),[1].concat(/*! c */2),[1]?.concat(2),[1].concat?.(2),[1][\"concat\"](2),[1].concat(y).join()]", {}, "x=[[1,,2].concat(3),[1].concat([,2]),[1].concat([...a]),[...a].concat(1),[f()].concat(g(),[h()]),[1].concat(y).concat(2),[1].concat(/*! c */2),[1].concat(2),[1].concat?.(2),[1].concat(2),[1].concat(y).join()];"],
			["x=[[g()].concat(1).join(),[1].concat([g()]).join(),[1].concat((g(),2)).join(),[1].concat(void 0,null).join()]", {}, "x=[[g(),1].join(),[1,g()].join(),[1].concat((g(),2)).join(),\"1,,\"];"],
			// A spread of a literal after what joins prints its items.
			["x=[[1].concat(y,...[2,3]),[1].concat(y,...[],z),[1].concat(...[2],y)]", {}, "x=[[1].concat(y,2,3),[1].concat(y,z),[1].concat(2,y)];"],
			["Array.prototype.concat=f;x=[1].concat(2)", {}, "Array.prototype.concat=f,x=[1].concat(2);"],
			["Reflect.defineProperty(Array.prototype,\"concat\",d);Reflect.set(Math,\"abs\",f);x=[[1].concat(2),Math.abs(-1)]", {}, "Reflect.defineProperty(Array.prototype,\"concat\",d),Reflect.set(Math,\"abs\",f),x=[[1].concat(2),Math.abs(-1)];"],
			["Reflect.get(Math,\"max\");x=[[1].concat(2),Math.max(1,2)]", {}, "Reflect.get(Math,\"max\"),x=[[1,2],2];"],
			["Reflect[\"set\"](Math,\"sign\",f);Object[\"assign\"](Number,o);x=[Math.sign(1),Number.isNaN(1)]", {}, "Reflect.set(Math,\"sign\",f),Object.assign(Number,o),x=[Math.sign(1),Number.isNaN(1)];"],
			["Reflect[\"get\"](Math,\"abs\");Object[1](Math);x=Math.abs(-1)", {}, "Reflect.get(Math,\"abs\"),Object[1](Math),x=1;"],
			["Reflect.deleteProperty(Array.prototype,\"concat\");Reflect.setPrototypeOf(Math,p);x=[[1].concat(2),Math.sign(1)]", {}, "Reflect.deleteProperty(Array.prototype,\"concat\"),Reflect.setPrototypeOf(Math,p),x=[[1].concat(2),Math.sign(1)];"],
			["Array.prototype[Symbol.isConcatSpreadable]=!1;x=[1].concat([2])", {}, "Array.prototype[Symbol.isConcatSpreadable]=!1,x=[1].concat([2]);"],
			["Object.prototype[Symbol.isConcatSpreadable]=!1;x=[1].concat([2])", {}, "Object.prototype[Symbol.isConcatSpreadable]=!1,x=[1].concat([2]);"],
			["Array[Symbol.species]=g;Array.prototype.constructor=h;x=[1].concat(2)", {}, "Array[Symbol.species]=g,Array.prototype.constructor=h,x=[1].concat(2);"],
			["new Set;new Map([[1,2]]);new Map([1]);new Map(a);new WeakSet([1]);new WeakMap([[1,1]]);Symbol();new Symbol;BigInt(1);Object.isFrozen(1);Object.keys(42);Number.isNaN(1);x=1", { compress: { toplevel: false, builtinsEcma: 2020 } }, "new Map([1]),new Map(a),new WeakSet([1]),new WeakMap([[1,1]]),new Symbol,x=1;"],
			// Without `unsafe` too, a weak collection of nothing or of an empty string, a `Set` of a string's characters,
			// a length `ToIndex` reads off a primitive, a BigInt converted to a string or a number, and `ToObject` of a primitive.
			["new WeakMap;new WeakSet(null);new WeakSet(\"\");new WeakSet(\"a\");new Map(\"\");new Map(\"a\");new Set(\"ab\");new ArrayBuffer(null);new Int8Array(\"ab\");new Int8Array(!0);new ArrayBuffer(-1);new BigInt64Array(0);new BigInt64Array([1]);new BigUint64Array(\"2\");Error(1n);new Number(1n);isNaN(1n);BigInt(2);BigInt(!0);BigInt(\"12\");BigInt(3n);BigInt(1.5);BigInt(\"x\");BigInt({});BigInt();new BigInt(1);Object.keys(1);Object.getPrototypeOf(\"a\");Object.keys(1n);Object.keys(null);Object.create(1);x=1", { compress: { toplevel: false, builtinsEcma: 2020 } }, "new WeakSet(\"a\"),new Map(\"a\"),new ArrayBuffer(-1),new BigInt64Array([1]),isNaN(1n),BigInt(1.5),BigInt(\"x\"),BigInt({}),BigInt(),new BigInt(1),Object.keys(1n),Object.keys(null),Object.create(1),x=1;"],
			// Before ECMAScript 2015 a weak collection may be missing, and `Object.keys` throws on a primitive.
			["new WeakMap;Object.keys(1);x=1", { compress: { toplevel: false, builtinsEcma: 5 } }, "new WeakMap,Object.keys(1),x=1;"],
			["new Promise(function(){g()});new Proxy(1,{});new WeakRef(1);new Iterator;new AggregateError(1);RegExp(\"(\");decodeURI(\"%\");new parseInt;Int8Array(1);Uint8Array(1);new Int8Array([1,2]);new Int8Array([1n]);new ArrayBuffer(8);new TypeError;Error(\"a\");escape(\"a\");parseInt(\"a\");x=1", { compress: { toplevel: false, builtinsEcma: 2026, unsafe: true } }, "new Promise(function(){g()}),new Proxy(1,{}),new WeakRef(1),new Iterator,AggregateError(1),RegExp(\"(\"),decodeURI(\"%\"),new parseInt,Int8Array(1),Uint8Array(1),new Int8Array([1n]),x=1;"],
			["new WeakSet;new WeakSet([{},[],function(){},()=>{}]);new WeakSet([1]);new WeakSet([,{}]);new WeakMap([[{},1],[[]]]);new WeakMap([[1,1]]);new WeakMap([[]]);new WeakMap([1]);new WeakMap([,]);new Map([[1],[]]);new Map([,]);new Map(\"ab\");new Set([1]);JSON.stringify(1);x=1", { compress: { toplevel: false, builtinsEcma: 2020, unsafe: true } }, "new WeakSet([1]),new WeakSet([,{}]),new WeakMap([[1,1]]),new WeakMap([[]]),new WeakMap([1]),new WeakMap([,]),new Map([,]),new Map(\"ab\"),JSON.stringify(1),x=1;"],
			["Object.keys(42);Object.keys(null);Object.create({},{a:1});Reflect.ownKeys(1);RegExp.escape(1);String.fromCodePoint(-1);decodeURI(\"a\");x=1", { compress: { toplevel: false, unsafe: true, builtinsEcma: 2026 } }, "Object.keys(null),Object.create({},{a:1}),Reflect.ownKeys(1),RegExp.escape(1),String.fromCodePoint(-1),x=1;"],
			["Math.abs=f;Math.abs(1);function g(Date){Date()}Array.isArray=h;Array.isArray(1);Array=k;new Array(1);x=1", {}, "Math.abs=f,Math.abs(1);function g(a){a()}Array.isArray=h,Array.isArray(1),Array=k,new Array(1),x=1;"],
			["Object.keys=f;Object.keys({});var o=Object;o.isFrozen=g;Object.isFrozen({});Object.assign(Date,h);Date.now();Array.isArray(1);x=1", { compress: { toplevel: false, unsafe: true, builtinsEcma: 2020 } }, "Object.keys=f,Object.keys({});var o=Object;o.isFrozen=g,Object.isFrozen({}),Object.assign(Date,h),Date.now(),x=1;"],
			["Math.abs?.(1);Math?.abs(1);Math[\"abs\"](1);a.Math.abs(1);Math.abs.call(1);x=1", {}, "Math.abs?.(1),Math?.abs(1),Math.abs(1),a.Math.abs(1),Math.abs.call(1),x=1;"],
			// A call that stays one where the dropped `var` keeps it stays one where its value is read too.
			["!function(){var a=\"\\\\.\";var w=\"[^\"+a+\"]\";var d=/(W)/.source.replace(\"W\",w);var t=new RegExp(\"\"+\"^\"+d+n+\"$\");g(t,w,a)}()", {}, "!function(){var a=\"[^\\\\.]\",r=\"(W)\".replace(\"W\",a);g(new RegExp(\"^\"+r+n+\"$\"),a,\"\\\\.\")}();"]
		];
		for (const [source, options, expected] of cases) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false },
				...options
			});
			expect(code).toBe(expected);
		}
		// A regexp source this engine rejects, as an older one rejects duplicate group names, stays unread.
		let readsDuplicateGroups = true;
		try {
			// eslint-disable-next-line prefer-regex-literals
			new RegExp("(?<a>x)|(?<a>y)");
		} catch (_err) {
			readsDuplicateGroups = false;
		}
		expect(
			minifyOnePass("function f(){return/(?<a>x)|(?<a>y)/.source}", {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			}).code
		).toBe(
			readsDuplicateGroups
				? 'function f(){return"(?<a>x)|(?<a>y)"}'
				: "function f(){return/(?<a>x)|(?<a>y)/.source}"
		);
		// A test printed without its `!` keeps where its names were in the map.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const mapped = /** @type {{ code: string, map: { names: string[] } }} */ (
			new SourceProcessor().process(
				"function f(a, b){ if (a == b) return; g(!c ? 1 : 2, a === b ? x : !0) }",
				{
					mode: "minify",
					compress: { toplevel: false },
					mangle: false,
					source: "a.js"
				}
			)
		);
		expect(mapped.code).toBe("function f(a,b){if(a!=b)g(c?2:1,a!==b||x)}");
		expect(mapped.map.names).toEqual(
			expect.arrayContaining(["a", "b", "c", "g", "x"])
		);
		// A brace dropped once printed moves the names after it back in the map.
		const unbraced = /** @type {{ code: string, map: { mappings: string } }} */ (
			new SourceProcessor().process(
				"function f(){for(;;){if(xx)continue;yy();zz()}}",
				{
					mode: "minify",
					compress: { toplevel: false },
					mangle: false,
					source: "a.js"
				}
			)
		);
		expect(unbraced.code).toBe("function f(){for(;;)if(!xx)yy(),zz()}");
		// cspell:disable-next-line
		expect(unbraced.map.mappings).toBe("AAAA,SAASA,IAAI,OAAQ,IAAGC,GAAYC");
		// Every comment kept is still the compressor's to keep.
		const { code } = minifyOnePass("if (a) { b() } /* c */", {
			compress: {},
			mangle: {},
			format: { comments: "all" }
		});
		expect(code).toBe("if(a){b()}/* c */");
	});

	it("should print built-in constructions and same-typed comparisons in their shorter spelling", () => {
		/** @type {[string, import("../../../lib/javascript/syntax-parser").JavascriptProcessOptions, string][]} */
		const cases = [
			// Two numbers or two strings compare the same loosely; a `-` or a name may be a BigInt or anything.
			["x=[+a===0,+a!==-1,typeof a===`number`,`number`!==typeof a,(b=1)===1,(a|1)===2,`a${b}`===`c`]", {}, "x=[+a==0,+a!=-1,typeof a==`number`,`number`!=typeof a,(b=1)==1,(a|1)==2,`a${b}`==`c`];"],
			["x=[-a===0,a===0,(a|b)===2,`a${b}`===c,-a===-1,(b+=1)===1,+a===b]", {}, "x=[-a===0,a===0,(a|b)===2,`a${b}`===c,-a===-1,(b+=1)===1,+a===b];"],
			// The built-in `Array` makes the array its literal does: a lone number is a length, a few holes printing shorter.
			["x=[new Array,Array(),Array(0),Array(1),Array(5),Array(\"a\"),Array(7n),Array(a,b),Array(...a,\"b\"),Array(Array(1,\"2\")),new Array(a,...b,c),Array(...[1,2]),Array(1,2).length]", {}, "x=[[],[],[],[,],[,,,,,],[\"a\"],[7n],[a,b],[...a,\"b\"],[[1,\"2\"]],[a,...b,c],[1,2],[1,2].length];"],
			["x=[Array(-0),new Array(-0),Array(-1),Array(...[3],...[]),Array(...[],2),Array(...[-0]),Array(...[6]),Array(...[1.5]),Array(...[3],...a),Array(...[/*! c */3])]", {}, "x=[[],[],Array(-1),[,,,],[,,],[],Array(6),Array(1.5),Array(3,...a),Array(...[/*! c */3])];"],
			["x=[Array(`a${b}`),Array({}),Array([]),Array(function(){}),Array(()=>1),Array(class{}),Array(null),Array(true),Array(!0),Array(/a/)]", {}, "x=[[`a${b}`],[{}],[[]],[function(){}],[()=>1],[class{}],[null],[!0],Array(!0),[/a/]];"],
			// A lone argument that may be a number, a length printing longer, or a spread that may pass one alone stays a call.
			["x=[Array(6),Array(1.5),Array(-1),Array(a),Array(...a),Array(...a,b),Array(3,...[]),Array?.(1,2),Array(Array?.(a)),new(Array(1,2))]", {}, "x=[Array(6),Array(1.5),Array(-1),Array(a),Array(...a),Array(...a,b),[,,,],Array?.(1,2),Array(Array?.(a)),new([1,2])];"],
			["var Array;x=[Array(1,2),Array()]", {}, "var Array;x=[Array(1,2),Array()];"],
			["window.Array=f;x=[Array(1,2),Array(0)]", {}, "window.Array=f,x=[Array(1,2),Array(0)];"],
			["x=Array(1,2/*c*/);y=Array/*c*/(1,2)", { format: { comments: "all" } }, "x=Array(1,2/*c*/),y=Array/*c*/(1,2);"],
			// The built-in `Object` passed nothing makes `{}`, parenthesized where it opens a statement or an arrow's body.
			["x=[new Object,Object(),new Object()];Object().a=1;new Object().b=1;f=()=>Object();g=()=>new Object().c;h=a?Object():[]", {}, "x=[{},{},{}];({}).a=1;({}).b=1;f=()=>({}),g=()=>({}.c),h=a?{}:[];"],
			["export default Object()", {}, "export default{};"],
			["x=[Object(a),Object?.(),window.Object(),new(Object())]", {}, "x=[Object(a),Object?.(),window.Object(),new{}];"],
			["var Object;x=Object()", {}, "var Object;x=Object();"],
			["window.Object=f;x=Object()", {}, "window.Object=f,x=Object();"],
			// An empty function a rest name collects for runs nothing; one destructuring iterates or reads.
			["(function(...a){})();((...a)=>{})();(function(b,...a){})(f(),...c);x=1", {}, "[f(),...c],x=1;"],
			["(function(...[a]){})(...b);(function(...{length}){})();x=1", {}, "!function(...[n]){}(...b),function(...{length:n}){}(),x=1;"],
			// A sequence opening the operations a statement is prints bare, its last value a name or a member of one.
			["(a(),b)+c;(a(),b,c)+d;(a(),b)||c;(a(),b.c)&&d;(a(),b)+c+d;((a(),b)||c)&&d;(a(),b)*c+d;(a(),b)instanceof c", {}, "a(),b+c,a(),b,c+d,a(),b||c,a(),b.c&&d,a(),b+c+d,(a(),b||c)&&d,a(),b*c+d,a(),b instanceof c;"],
			// Not under `**`, nor before a computed member, an assignment, a chain or a conditional's branch.
			["(a(),b)**c;(a(),b[c])+d;(a(),b=1)+d;(a(),b)?.c+d;(a(),undefined)**d;y=(a(),b)+c;if(x)(a(),b)+c;else d()", {}, "(a(),b)**c,(a(),b[c])+d,(a(),b=1)+d,(a(),b)?.c+d,(a(),void 0)**d,y=(a(),b)+c,x?(a(),b)+c:d();"],
			["({}.x.y(),b)+c;(class{}.x(),b)+c", {}, "({}).x.y(),b+c;(class{}).x(),b+c;"],
			// The callee `Object(f)` is `f`; a member keeps no `this`, and `with` or `eval` may reach a name.
			["Object(f)(1,2);Object(a.b)(x);Object(a[b])`x`;function k(f){Object(f)(1)}", {}, "f(1,2),(0,a.b)(x),(0,a[b])`x`;function k(b){b(1)}"],
			["Object(a.b)?.(x);Object(a?.b)(x);new(Object(a.b))(x);Object(f())(1);Object(...f)(1);Object(f,g)(1);x=Object(f).y;Object(f)", {}, "Object(a.b)?.(x),Object(a?.b)(x),new(Object(a.b))(x),Object(f())(1),Object(...f)(1),Object(f,g)(1),x=Object(f).y,f;"],
			["function f(a){var x=g();(a,x)+c}function k(a){var x=a.b;Object(x)(1)}Object(1e999)(1)", {}, "function f(a){(a,g())+c}function k(a){Object(a.b)(1)}Object(1/0)(1);"],
			["var Object;Object(f)(1)", {}, "var Object;Object(f)(1);"],
			["with(o)Object(f)(x)", {}, "with(o)Object(f)(x);"],
			["Object(eval)(x)", {}, "Object(eval)(x);"],
			// Only a static method may be named `constructor` bare.
			["class C{static['constructor'](){}static get['constructor'](){return 1}}", {}, "class C{static constructor(){}static get constructor(){return 1}}"],
			["class C{['constructor'](){}static['constructor']=1;get['constructor'](){return 1}}", {}, "class C{[\"constructor\"](){}static[\"constructor\"]=1;get[\"constructor\"](){return 1}}"],
			// Alike branches a call or tag reads `this` off print as `(t,f)`, or `(0,f)` where the test runs nothing.
			["function k(c){(c?eval:eval)(\"x\");(c?o.f:o.f)(\"y\");(c?o.f:o.f)`y`}(c()?eval:eval)(\"x\");(c?o[f()]:o[f()])(1);(c?o.f:o.f)?.(1)", {}, "function k(f){(0,eval)(\"x\"),(0,o.f)(\"y\"),(0,o.f)`y`}(c(),eval)(\"x\"),(c,o[f()])(1),(c,o.f)?.(1);"],
			["new(c?o.f:o.f)(1);(c?o.f:o.g)(1);(c?a+b:a+b)(1);x=c?o.f:o.f", {}, "new(c?o.f:o.f)(1),(c?o.f:o.g)(1),(c?a+b:a+b)(1),x=(c,o.f);"]
		];
		for (const [source, options, expected] of cases) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false },
				...options
			});
			expect(code).toBe(expected);
		}
	});

	it("should read terser's snake_case option names as their camelCase names", () => {
		const named = "function f() { function foo() { return h() } g(foo, foo) }";
		const quoted = 'a.zzLeft = 1; a["zzRight"] = 2';
		/** @typedef {import("../../../lib/javascript/syntax-printer").MinifyOptions} MinifyOptions */
		/** @type {[string, MinifyOptions, MinifyOptions, MinifyOptions][]} */
		const cases = [
			[named, {}, { keepFnames: true }, { keep_fnames: true }],
			["function f() { class Foo {} g(Foo, Foo) }", {}, { keepClassnames: true }, { keep_classnames: true }],
			[named, {}, { mangle: { keepFnames: true } }, { mangle: { keep_fnames: true } }],
			["function f() { debugger; g() }", {}, { compress: { dropDebugger: false } }, { compress: { drop_debugger: false } }],
			[
				quoted,
				{ mangle: { properties: { regex: /^zz/ } } },
				{ mangle: { properties: { regex: /^zz/, keepQuoted: true } } },
				{ mangle: { properties: { regex: /^zz/, keep_quoted: true } } }
			],
			['g("é")', {}, { format: { asciiOnly: true } }, { format: { ascii_only: true } }],
			["return g()", {}, { parse: { bareReturns: true } }, { parse: { bare_returns: true } }]
		];
		/**
		 * @param {string} source a program
		 * @param {MinifyOptions} options the options beside `compress` and `mangle`
		 * @returns {string} the code, or the error it throws
		 */
		const print = (source, options) => {
			try {
				return minifyOnePass(source, { compress: {}, mangle: {}, ...options }).code;
			} catch (err) {
				return /** @type {Error} */ (err).message;
			}
		};
		for (const [source, baseline, camelCase, snakeCase] of cases) {
			const printed = print(source, camelCase);
			expect(print(source, snakeCase)).toBe(printed);
			// Each option changes the output, so either spelling is read.
			expect(print(source, baseline)).not.toBe(printed);
		}
		// A print `minify` does not read takes the format options as given.
		expect(minifyOnePass('g("é")', { format: { ascii_only: true } }).code).toBe(
			'g("\\xe9");'
		);
		// Where both are given, the camelCase name wins.
		expect(print('g("é")', { format: { asciiOnly: false, ascii_only: true } })).toBe(
			'g("é");'
		);
		expect(print(named, { keepFnames: false, keep_fnames: true })).toBe(
			print(named, {})
		);
	});

	it("should write a long string's tabs raw where only ASCII is written", () => {
		// A tab is ASCII, so `asciiOnly` leaves the tabs of a string long enough
		// to write them raw as they are, and escapes only what is past ASCII.
		const text = `${"a\t".repeat(60)}é`;
		const { code } = minifyOnePass(`g(${JSON.stringify(text)})`, {
			format: { asciiOnly: true }
		});
		expect(code).toBe(`g("${"a\t".repeat(60)}\\xe9");`);
	});

	it("should print as the format options ask in the one pass", () => {
		/** @type {[string, import("../../../lib/javascript/syntax-printer").MinifyOptions, string][]} */
		const cases = [
			// A comments option written as a regexp, a function, `some`, or anything else true
			["/* keep */ a(); /* drop */ b()", { compress: {}, format: { comments: "/keep/" } }, "/* keep */a();b();"],
			["/* keep */ a(); /* drop */ b()", { compress: {}, format: { comments: (_node, comment) => comment.value.includes("keep") } }, "/* keep */a();b();"],
			["/*! lic */ a(); // @license x\nb(); /* no */ c()", { compress: {}, format: { comments: "some" } }, "/*! lic */a();// @license x\nb();c();"],
			["/* a */ x(); // b\ny(); /*\n multi\n*/ z()", { compress: {}, format: { comments: "all" } }, "/* a */x();// b\ny();\n/*\n multi\n*/z();"],
			// An annotation alone is kept, its own comment or not; one in prose prints nowhere
			["/*#__PURE__*/ f(); /* @__NOINLINE__ */ g(); /* text @__PURE__ */ h()", { compress: {}, format: { preserve_annotations: true } }, "/*#__PURE__*/f();/* @__NOINLINE__ */g();"],
			[
				"/* plain */ a(); /*#__PURE__*/ f()",
				{ compress: {}, format: { comments: false, preserve_annotations: true } },
				"a();/*#__PURE__*/f();"
			],
			["/* </script> */ a(); /*   */ b(); /* @__PURE__ */ c()", { compress: {}, format: { comments: "all" } }, "/* <\\/script> */a();b();"],
			["function f(){ return /* a */ x + /* b */ y } function g(){ return ( // c\n x) }", { compress: {}, format: { comments: "all" } }, "function f(){/* a */return x+/* b */y}function g(){// c\nreturn x}"],
			["a = ( /* x */ b /* y */ ) ; c = ( // l\n d); e = (\n/* z */ f)", { compress: {}, format: { comments: "all" } }, "a=/* x */b/* y */,c=// l\nd;e=\n/* z */f;"],
			["f(/* a */); g({ /* b */ }); h([ /* c */ ]); function k() { /* d */ } class C { /* e */ }", { compress: {}, format: { comments: "all" } }, "f(),g({/* b */}),h([]);function k(){/* d */}class C{}"],
			["x = 1 // t\n", { compress: {}, format: { comments: "all" } }, "x=1;// t"],
			["#!/usr/bin/env node\n/* a */ x()", { compress: {}, format: { comments: "all" } }, "#!/usr/bin/env node\n/* a */x();"],
			["#!/usr/bin/env node\n/* a */ x()", { compress: {}, format: { comments: "all", shebang: false } }, "/* a */x();"],
			["#!/usr/bin/env node\nfoo()", {}, "#!/usr/bin/env node\nfoo();"],
			["/* a */ x()", { compress: {}, format: { comments: "all", preamble: "/* pre */\r\nline" } }, "/* pre */\nline\n/* a */x();"],
			// `ascii_only` escapes what is past ASCII, as the edition and engine allow
			["x = 'é\\u{1F600}\\u0100'; y = /é/; var é = 1; z = { é: 1 }", { format: { ascii_only: true } }, "x=\"\\xe9\\ud83d\\ude00\\u0100\";y=/\\xe9/;var \\u00e9=1;z={\"\\xe9\":1};"],
			["x = 'é\\u{1F600}\\u0100'; y = /é\\u{1F600}/u", { ecma: 2015, format: { ascii_only: true } }, "x=\"\\xe9\\u{1f600}\\u0100\";y=/\\xe9\\u{1F600}/u;"],
			["x = 'é\\u{1F600}'", { ecma: 2015, format: { ascii_only: true, safari10: true } }, "x=\"\\xe9\\ud83d\\ude00\";"],
			// A lone surrogate is escaped, a pair left as it is
			["x = '\\uD800' + '\\uDC00x' + '\\u{1F600}'", {}, "x=\"\\ud800\"+\"\\udc00x\"+\"😀\";"],
			// A name past Unicode 8 is escaped, which older engines read
			["var 𞤀 = 1; o.𞤀a = 𞤀; var a𞤀 = 2; o.x = a𞤀", {}, "var \\u{1e900}=1;o[\"𞤀a\"]=\\u{1e900};var a\\u{1e900}=2;o.x=a\\u{1e900};"],
			// Escapes, and the quotes each `quote_style` picks
			["x = ['\\n\\r\\t\\b\\f\\v\\u2028\\u2029\\ufeff\\0 \\x001\\\\', \"a'\", 'b\"', \"'\\\"\\\"\"]", {}, "x=[\"\\n\\r\\t\\b\\f\\v\\u2028\\u2029\\ufeff\\0 \\x001\\\\\",\"a'\",'b\"','\\'\"\"'];"],
			["x = ['\\v', \"a'\", 'b\"', \"'\\\"\\\"\"]", { format: { ie8: true, quote_style: 1 } }, "x=['\\x0B','a\\'','b\"','\\'\"\"'];"],
			["x = [\"a'\", 'b\"', \"'\\\"\\\"\", 'c', \"d\"]", { format: { quote_style: 2 } }, "x=[\"a'\",\"b\\\"\",\"'\\\"\\\"\",\"c\",\"d\"];"],
			["x = [\"a'\", 'b\"', \"'\\\"\\\"\", 'c', \"d\"]", { format: { quote_style: 3 } }, "x=[\"a'\",'b\"',\"'\\\"\\\"\",'c',\"d\"];"],
			// Without `semicolons`, a statement ends in a line break where the next allows
			["a()\n(b)()\n[c]\nd`x`", { format: { semicolons: false } }, "a()(b)()[c]\nd`x`\n"],
			["a(); b(); c\n+d", { format: { semicolons: false } }, "a()\nb()\nc+d\n"],
			// An edition given by its number counts from 2015
			["x = { a: a, b: function () {} }", { ecma: 6, compress: {} }, "x={a,b:function(){}};"],
			["x = { a: a, b: function () {} }", { ecma: 5, compress: {} }, "x={a:a,b:function(){}};"],
			// A long string's tabs are written raw
			[`x = 'a\\tb\\tc ${"abc ".repeat(30)}'`, {}, `x="a\tb\tc ${"abc ".repeat(30)}";`],
			// A regular expression's flags print in order
			["x = [/a/ig, /b/ymgsid]", {}, "x=[/a/gi,/b/dgimsy];"],
			// A pattern's NUL is escaped, its `</script` too, and a backslash before a letter past ASCII goes.
			[
				"x = /a\u0000b/; y = /\\\u0000/; z = /[</script>]/; w = /\\é\\d\\\\/",
				{},
				"x=/a\\0b/;y=/\\0/;z=/[<\\/script>]/;w=/é\\d\\\\/;"
			],
			["x = RegExp('</script'); y = '<!--' + '\\\\<!--' + '</script>' + '-->'", { compress: {} }, "x=RegExp(\"</script\"),y=\"\\x3c!--\\\\\\x3c!--<\\/script>--\\x3e\";"],
		];
		for (const [source, options, expected] of cases) {
			expect(minifyOnePass(source, options).code).toBe(expected);
		}
	});

	it("should refuse an option it does not know, and a module statement off the top level", () => {
		expect(() => minifyOnePass("x", { mangle: /** @type {EXPECTED_ANY} */ ({ nope: 1 }) })).toThrow(
			"`nope` is not a supported option"
		);
		expect(() => minifyOnePass("x", { format: /** @type {EXPECTED_ANY} */ ({ nope: 1 }) })).toThrow(
			"`nope` is not a supported option"
		);
		// A script reads module syntax anywhere, which the scopes then refuse.
		expect(() =>
			minifyOnePass("function f(){\n  import a from 'b' }", { mangle: true })
		).toThrow(
			expect.objectContaining({
				name: "SyntaxError",
				message: '"Import" statement may only appear at the top level',
				line: 2,
				col: 2,
				pos: 16
			})
		);
	});

	// Each source printed, whichever of these it is read with, is a program
	// that parses as what it was read as.
	for (const [name, options] of Object.entries({
		"names mangled": { mangle: true },
		"every comment, compressed": {
			compress: {},
			mangle: true,
			format: { comments: "all" }
		},
		// ECMAScript 5 spells no name past the BMP in ASCII, as terser has it.
		"quoting options": {
			compress: {},
			mangle: false,
			ecma: 2015,
			format: {
				comments: "all",
				quote_style: 3,
				keep_quoted_props: true,
				keep_numbers: true,
				ascii_only: true
			}
		},
		"wrapping options": {
			mangle: true,
			format: {
				comments: "all",
				wrap_iife: true,
				wrap_func_args: true,
				webkit: true,
				semicolons: false,
				preserve_annotations: true,
				ie8: true,
				safari10: true,
				preamble: "/* p */"
			}
		},
		"ECMAScript 2020": {
			compress: {},
			mangle: true,
			ecma: 2020,
			format: { comments: "/!/" }
		}
	})) {
		it(`should print each source, with ${name}`, () => {
			/** @type {string[]} */
			const printed = [];
			for (const source of [...SOURCES, ...PRINTED_SOURCES]) {
				/** @type {"script" | "module"} */
				let sourceType = "script";
				try {
					acorn.parse(source, {
						ecmaVersion: "latest",
						allowHashBang: true,
						allowImportExportEverywhere: true
					});
				} catch (_err) {
					sourceType = "module";
				}
				/** @type {string} */
				let code;
				try {
					({ code } = minifyOnePass(source, {
					.../** @type {Record<string, EXPECTED_ANY>} */ (
						JSON.parse(JSON.stringify(options))
					),
						sourceType
					}));
				} catch (err) {
					// A source a module refuses, as `export default` twice.
					printed.push(`throws ${/** @type {Error} */ (err).message}`);
					continue;
				}
				expect(() =>
					acorn.parse(code, {
						ecmaVersion: "latest",
						sourceType,
						allowHashBang: true,
						allowImportExportEverywhere: sourceType === "script"
					})
				).not.toThrow();
				// The source spelling line breaks densely prints a line per string.
				printed.push(
					code.length > 2000 ? `${code.split("\n").length} lines` : code
				);
			}
			expect(printed.join("\n\n")).toMatchSnapshot();
		});
	}

	it("should drop declarations only each other reads, and classes nothing reads", () => {
		const cases = [
			// Each reads the other, and nothing printed reads either.
			["(function(){class A{m(){return new B}} class B{m(){return new A}} g()})()", "g();"],
			["(function(){class A{static x(){return A}} g()})()", "g();"],
			["(function(){var a=function(){return b()},b=function(){return a()}; g()})()", "g();"],
			// What a kept read reaches stays.
			["(function(){function a(){return b()} function b(){return a()} g(a)})()", "!function(){function a(){return a()}g(a)}();"],
			// A class running code as it is made stays.
			["(function(){class A{static{h()}} class B{[h()](){}} g()})()", "!function(){class A{static{h()}}class B{[h()](){}}g()}();"],
			// `null && K` never reads `K`.
			["(function(){class K{} class C extends (null && K){} g()})()", "g();"],
			["(function(){var x = /a/ && h(), y = 1 || h(), z = 0 ?? h(); g()})()", "h();g();"],
			[
				"(function(){var x = /a/ || h(), y = null ?? h(); g()})()",
				"h();g();"
			],
			["(function(){var x = /a/ ?? h(); g()})()", "g();"],
			// A class extending one made before it, and never set since, makes nothing happen.
			["(function(){class K{} class C extends K{} g()})()", "g();"],
			// Extending what may be no constructor throws, so the class stays.
			[
				"(function(){var f = () => {}; class C extends f{} g()})()",
				"!function(){var f=()=>{};class C extends f{}g()}();"
			],
			[
				"(function(){var f = () => {}; var C = class extends f{}; g()})()",
				"!function(){var f=()=>{};(class extends f{});g()}();"
			],
			// A class a variable is set to before, and never again, constructs.
			[
				"(function(){var B = class {}; var C = class extends B{}; g()})()",
				"g();"
			],
			[
				"(function(){var B = class {}; B = h(); var C = class extends B{}; g()})()",
				"!function(){var B=class{};B=h();(class extends B{});g()}();"
			],
			[
				"(function(){var C = class extends B{}; var B = class {}; g()})()",
				"!function(){(class extends B{});var B=class{};g()}();"
			],
			[
				"(function(){class C extends K{} class K{} g()})()",
				"!function(){class C extends K{}class K{}g()}();"
			],
			[
				"(function(){class K{} K = h(); class C extends K{} g()})()",
				"!function(){class K{}K=h();class C extends K{}g()}();"
			],
			[
				"(function(){class C extends (f(), K){} g()})()",
				"!function(){class C extends(f(),K){}g()}();"
			],
			[
				"(function(){class A{m(){return new B}} class B{m(){return new A}} class C{m(){return new D}} class D{m(){return new C}} g(A)})()",
				"!function(){class A{m(){return new B}}class B{m(){return new A}}g(A)}();"
			],
			// A class held inside another is read once, from either side.
			["(function(){class A{m(){class B{n(){return A}} return new B}} g()})()", "g();"],
			[
				"(function(){class A{m(){class B{n(){return A}} return new B}} g(A)})()",
				"!function(){class A{m(){class B{n(){return A}}return new B}}g(A)}();"
			],
			// A function moved to a read that goes goes with what it reads.
			[
				"(function(){var a; function f(){return a} function u(){return f()} g()})()",
				"g();"
			],
			// One a comment keeps where it is keeps what it reads.
			[
				"(function(){var a={}; /*! keep */ function f(){return a} function u(){return f()} g()})()",
				"!function(){var a={};/*! keep */function f(){return a}g()}();"
			],
			[
				"(function(){var o={m(){return p}}, p={m(){return o}}; g(p)})()",
				"!function(){var o={m(){return p}},p={m(){return o}};g(p)}();"
			],
			// A comment after what goes prints before what follows, as terser has it.
			["(function(){function a(){} /*! keep */ function b(){} g(b)})()", "!function(){/*! keep */function b(){}g(b)}();"],
			["(function(){function a(){} /*! keep */ g()})()", "/*! keep */g();"]
		];
		for (const [source, expected] of cases) {
			expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
				expected
			);
		}
	});

	it("should forget what the last one-pass print found", () => {
		const source =
			"(()=>{function f(){return [g(1),g(2)]} class K{} it(()=>f())})()";
		const unmangled = () =>
			minifyOnePass(source, { compress: {}, mangle: false }).code;
		const first = unmangled();
		minifyOnePass(source, {
			compress: { side_effects: false },
			mangle: {}
		});
		expect(unmangled()).toBe(first);
		expect(first).toBe("it(()=>[g(1),g(2)]);");
	});

	it("should keep a name a dropped function sets where it is read", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, { compress: {}, mangle: {}, module: true }).code;
		expect(print("var a = 5; function reset() { a = 6 } console.log(a);")).toBe(
			"var a=5;console.log(a);"
		);
		expect(print("var a = 5; function reset() { a = 6 } export { a };")).toBe(
			"var a=5;export{a};"
		);
		// Set and never read, it goes with what sets it.
		expect(print("var a = 5; function reset() { a = 6 }")).toBe("");
	});

	it("should keep the parentheses a binary takes under a `!` of `!!`", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(e,t,g){return[${source}]}`, {
				compress: {},
				mangle: false
			}).code.slice(25, -2);
		for (const [source, expected] of [
			["!!!(e&6)", "!(e&6)"],
			["!!(!(e+t))", "!(e+t)"],
			["!!!(e===t)", "!(e===t)"],
			["!!!(e&6)?t:g", "e&6?g:t"],
			// Read only for its truth elsewhere, `!!x` still prints as `x`.
			["!!(e&6)?t:g", "e&6?t:g"]
		]) {
			expect(print(source)).toBe(expected);
		}
		for (const [source, value] of [
			["!!!(e&6)", [false, true]],
			["!!(!(e+t))", [false, true]]
		]) {
			const { code } = minifyOnePass(`function f(e,t){return ${source}}`, {
				compress: {},
				mangle: false
			});
			expect([
				vm.runInNewContext(`${code}f(2,0)`),
				vm.runInNewContext(`${code}f(0,0)`)
			]).toEqual(value);
		}
	});

	it("should fold what `+` adds to a string", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(b,c){return[${source}]}`, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code.slice(23, -2);
		for (const [source, expected] of [
			// An array of constants adds as its items joined, a bigint as its digits.
			["[]+0", '"0"'],
			["[1,null,2]+\"\"", '"1,,2"'],
			["[1,undefined,2]+\"\"", '"1,,2"'],
			// A hole reads the prototypes at its index.
			["[1,,2]+\"\"", '[1,,2]+""'],
			["[-0,true]+\"\"", '"0,true"'],
			["\"\"+123n", '"123"'],
			["1n+[]", '"1"'],
			// A bigint added to no string throws; an item not known stays.
			["1n+1", "1n+1"],
			["[1n]+\"\"", '[1n]+""'],
			["[{}]+\"\"", '[{}]+""'],
			["[b]+\"\"", '[b]+""'],
			["[...b]+\"\"", '[...b]+""'],
			// Nothing added to a string gives the string back.
			["\"\"+typeof b", "typeof b"],
			["`${b}`+[]", "`${b}`"],
			["(typeof b+\"x\")+\"\"", 'typeof b+"x"'],
			["(b+\"x\")+\"\"", 'b+"x"'],
			["(typeof b+c)+\"\"", "typeof b+c"],
			["(c+typeof b)+\"\"", "c+typeof b"],
			["(c+b)+\"\"", 'c+b+""'],
			// What may be no string, or needs the parentheses `+` gave it, stays.
			["\"\"+b", '""+b'],
			["\"\"+/x/", '""+/x/'],
			["\"\"+(b+\"x\")", '""+(b+"x")'],
			["(\"\"+typeof b)**2", '(""+typeof b)**2'],
			["-(\"\"+typeof b)", '-(""+typeof b)'],
			["(\"\"+typeof b).length", '(""+typeof b).length'],
			["c+(\"\"+typeof b)", 'c+(""+typeof b)'],
			["c||\"\"+typeof b", 'c||""+typeof b'],
			["\"\"+({}+\"x\")", '""+({}+"x")'],
			["\"\"/*! k */+typeof b", '""/*! k */+typeof b'],
			// A conditional or assignment would keep the parentheses `+` gave it.
			["(b?\"x\":\"y\")+\"\"", '(b?"x":"y")+""'],
			["\"\"+(b.c=\"x\")", '""+(b.c="x")']
		]) {
			expect(print(source)).toBe(expected);
		}
		// An array joins only while the program writes neither its `toString` nor its `join`.
		for (const [source, expected] of [
			[
				'Array.prototype.toString=()=>"!";a=[1,2]+"";b=typeof c+[]',
				'Array.prototype.toString=()=>"!",a=[1,2]+"",b=typeof c+[];'
			],
			['Array.prototype.join=f;a=[1]+""', 'Array.prototype.join=f,a=[1]+"";'],
			[
				'Array.prototype.valueOf=()=>7;a=[1]+""',
				'Array.prototype.valueOf=()=>7,a=[1]+"";'
			],
			[
				'Object.prototype.valueOf=()=>7;a=[1]+""',
				'Object.prototype.valueOf=()=>7,a=[1]+"";'
			],
			[
				'const p=Object.prototype;p.valueOf=()=>7;a=[1]+""',
				'const p=Object.prototype;p.valueOf=()=>7,a=[1]+"";'
			],
			[
				'const A=Array;A.prototype.join=()=>"x";a=[1]+""',
				'const A=Array;A.prototype.join=()=>"x",a=[1]+"";'
			],
			['a=[1?/*! keep */null:null]+""', 'a=[/*! keep */null]+"";'],
			['String.prototype.trim=f;a=[1]+""', 'String.prototype.trim=f,a="1";'],
			// A comment kept inside the operand dropped stays.
			[
				"a=typeof c+[1?/*! keep */null:null]",
				"a=typeof c+[/*! keep */null];"
			]
		]) {
			expect(
				minifyOnePass(source, {
					compress: { toplevel: false },
					mangle: false,
					format: { comments: "some" }
				}).code
			).toBe(expected);
		}
		// A name holding a string may be read before it is set, as `undefined`.
		const source =
			'function f(){g();var x="ab";h(x,x,x);function g(){a=""+x}}f()';
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toContain('a=""+x');
		// Kept for size where `unused` is off, the same read keeps its name.
		for (const [kept, expected] of [
			["[x]+\"\"", "[x]+\"\""],
			['x+"y"', 'x+"y"']
		]) {
			const printed = minifyOnePass(
				`function f(){g();var x="ab";function g(){a=${kept}}}f()`,
				{ compress: { unused: false }, mangle: false }
			).code;
			expect(printed).toContain(`a=${expected}`);
		}
		expect(
			minifyOnePass(
				'function f(){var value="abc";g();function g(){a=value+" y"}}f()',
				{ compress: { unused: false }, mangle: false }
			).code
		).toContain('a="abc y"');
	});

	it("should fold the conversions `Boolean`, `Number` and `String`", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: false,
				format: { comments: "some" }
			}).code;
		for (const [source, expected] of [
			// On constants each answers its value; `Number(undefined)` answers no finite one.
			[
				'a=[Boolean(),Number(),Number(-123),Number(!1),Number(null),String("x"),String(1),Number(" 0x1f "),Number(void 0),Number({})]',
				'a=[!1,0,-123,0,0,"x","1",31,Number(void 0),Number({})];'
			],
			// `Boolean(x)` is `!!x`, or `x` where that is a boolean already.
			[
				"a=Boolean(b);f(Boolean(!b));x={k:Boolean(b?c>0:c<0)};y=[Boolean((b|+c)!==0)];function g(){return Boolean(b in c)}var z=Boolean(b?!0:!1);Boolean(b?1:!1);u=[Boolean(c?true:false),Boolean(delete b.c),Boolean((b>1))]",
				"a=!!b,f(!b),x={k:b?c>0:c<0},y=[(b|+c)!=0];function g(){return b in c}var z=!!b;b?1:!1,u=[!!c,delete b.c,b>1];"
			],
			// Anywhere else, with no lone argument, spread, optional, replaced or shadowed, it stays.
			[
				"a=Boolean(b)?1:2;c=Boolean(b).x;d=Boolean(b)+1;e=Boolean(b,c);g=Boolean(...b);h=Boolean?.(b);k=Boolean((b,c));Boolean({}.x);l=new Boolean(b);m=Boolean(b)(1);n=Boolean(/*! k */b)",
				"a=Boolean(b)?1:2,c=Boolean(b).x,d=Boolean(b)+1,e=Boolean(b,c),g=Boolean(...b),h=Boolean?.(b),k=Boolean((b,c)),l=new Boolean(b),m=Boolean(b)(1),n=Boolean(/*! k */b);"
			],
			["function f(Boolean,Number){a=[Boolean(b),Number(1)]}", "function f(Boolean,Number){a=[Boolean(b),Number(1)]}"],
			["Boolean=f;Number=g;a=[Boolean(b),Number(1)]", "Boolean=f,Number=g,a=[Boolean(b),Number(1)];"]
		]) {
			expect(print(source)).toBe(expected);
		}
	});

	it("should print the value an object literal holds at a known key", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(x,g){return[${source}]}`, {
				compress: {},
				mangle: false
			}).code.slice(23, -2);
		for (const [source, expected] of [
			["({a:1,a:2}).a", "2"],
			['({b:1,c:2})["b"]', "1"],
			['({1:"one"})["1"]', '"one"'],
			["({['k'+1]:3}).k1", "3"],
			["({a:x}).a", "x"],
			["({x}).x", "x"],
			["({a:g()}).a", "g()"],
			['({["__proto__"]:5}).__proto__', "5"],
			["({a:1}).a+1", "2"],
			["({a:1})?.a+1", "{a:1}.a+1"],
			["({b:g(),a:1}).a+1", "{b:g(),a:1}.a+1"],
			["({a:{b:1}}).a.b+1", "2"],
			["({a:{b:2}}).a.b*3", "6"],
			['({ab:1})["a"+"b"]', "1"],
			// A key or read not known, or a name `let` opens a declaration with.
			["({[g()]:1}).a", "{[g()]:1}.a"],
			["({[x]:1}).a", "{[x]:1}.a"],
			["({[null]:1}).a", "{null:1}.a"],
			["({a:1})[x]", "{a:1}[x]"],
			["({a:let}).a", "{a:let}.a"],
			["({a:{b:1,c:g()}}).a.b+1", "{a:{b:1,c:g()}}.a.b+1"],
			["x.a.b+1", "x.a.b+1"],
			// What else it holds runs, a getter runs, `__proto__:` is the prototype.
			["({b:g(),a:1}).a", "{b:g(),a:1}.a"],
			["({get a(){return 1}}).a", "{get a(){return 1}}.a"],
			["({__proto__:{p:1}}).p", "{__proto__:{p:1}}.p"],
			["({a:1}).b", "{a:1}.b"],
			// A call takes `this` from the object, `delete` deletes off it.
			["({f:g}).f()", "{f:g}.f()"],
			["delete ({a:1}).a", "delete{a:1}.a"],
			// A `void` a `return` ending its function drops prints it alone.
			["void ({a:g()}).a", "void{a:g()}.a"],
			// `true` prints as `!0`, which `.` or `**` would not read whole.
			["({a:true}).a.x", "{a:!0}.a.x"],
			["[true][0].x", "[!0][0].x"],
			['[false][0]["y"]', "[!1][0].y"],
			["({a:true}).a**x", "{a:!0}.a**x"],
			["x**({a:true}).a", "x**!0"],
			["!({a:true}).a", "!1"],
			// A number read with `[]` is read whole, and a key printing as `.x` spaces it.
			["({0:1})[0][1]+1", "1[1]+1"],
			['[1][0]["x"]', "1..x"],
			["[1][0].x", "[1][0].x"]
		]) {
			expect(print(source)).toBe(expected);
		}
		// Opening a statement, the object keeps the parentheses it took.
		expect(
			minifyOnePass("({a:g()}).a;", { compress: {}, mangle: false }).code
		).toBe("({a:g()}).a;");
		// A key read before a hoisted call sets it is not known yet.
		for (const source of [
			'(function(){console.log(f());var k="a";function f(){var v={[k]:1}.a;g(v);return v+v}function g(){}})()',
			'(function(){console.log(f());var k="a";function f(){var v={a:1}[k];g(v);return v+v}function g(){}})()',
			'(function(){console.log(f());var k="a";function f(){if({[k]:1}.a)return 2;return 3}})()',
			'(function(){var k="a";console.log(f());function f(){var v={a:1}[k];g(v);return v+v}function g(){}})()',
			// A value in parentheses prints, a private name is never a key.
			"function g(){return 7}console.log(({a:(g()),b:1}).a)",
			"class C{#x;static t(){try{return({x:1}).#x}catch(e){return e.constructor.name}}}console.log(C.t())"
		]) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: false });
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should print a conditional with a sequence or conditional branch as `||` or `&&`", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(x,y,g){return[${source}]}`, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code.slice(25, -2);
		for (const [source, expected] of [
			["x===y?!0:(g(),!1)", "x===y||(g(),!1)"],
			["x===y?!0:y===g?(g(),!0):!1", "x===y||y===g&&(g(),!0)"],
			["x===y?!1:y===g?!0:!1", "x!==y&&y===g"],
			// A `?:` branch reads more than its truth.
			["x===y?!0:y?y.a():!1", "x===y?!0:y?y.a():!1"],
			["x?!1:y?y||g:!0", "x?!1:!y||y||g"],
			// A folded conditional joins as the branch it keeps.
			["x===y?!0:1?(g(),!0):!1", "x===y||(g(),!0)"],
			["x===y?!0:1?y?!0:g:!1", "x===y?!0:y?!0:g"],
			// A comment kept at an edge keeps the conditional.
			["x===y?!0:/*! c */(g(),!0)", "x===y?!0:(/*! c */g(),!0)"]
		]) {
			expect(print(source)).toBe(expected);
		}
		expect(
			minifyOnePass("f(x===y?!0:1?(g(),!0):!1)", {
				compress: { dead_code: false },
				mangle: false
			}).code
		).toBe("f(x===y?!0:1?(g(),!0):!1);");
	});

	it("should compare two booleans loosely", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(x,y,g){return[${source}]}`, {
				compress: {},
				mangle: false
			}).code.slice(25, -2);
		for (const [source, expected] of [
			["!x===!y", "!x==!y"],
			["x<1!==y>2", "x<1!=y>2"],
			["x instanceof g===!y", "x instanceof g==!y"],
			// Either side may be another value, or `!!x` read as `x`.
			["!x===y", "!x===y"],
			["!!x===!y", "!!x===!y"]
		]) {
			expect(print(source)).toBe(expected);
		}
	});

	it("should print an `if` whose branches print alike as its test and one branch", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code;
		for (const [source, expected] of [
			// A local name runs nothing, a global may throw.
			["function f(v){if(v===1)g();else if(v===2)g();else g()}", "function f(v){g()}"],
			["if(y)f();else f()", "y,f();"],
			["function f(y){var x;if(y)x=1+1;else x=2;return x}", "function f(y){var x;return x=2,x}"],
			["function f(){var x;if(c())x=1;else x=1;return x}", "function f(){var x;return x=(c(),1),x}"],
			["if(a)x=b?1:2;else if(c)f();else f()", "a?x=b?1:2:(c,f());"],
			// Returned alike, the `return` prints the test where it runs anything.
			["function f(y){if(y)return 1;else return 1}", "function f(y){return 1}"],
			["function f(y){if(g())return 1;else return 1}", "function f(y){return g(),1}"],
			["function f(y){if(y)return 1;else return 2}", "function f(y){return y?1:2}"],
			// An item of a sequence takes a sequence or assignment bare, a function parenthesized.
			["function f(y){var n=0;if((n++,y))g();else g();return n}", "function f(y){var n=0;return n++,y,g(),n}"],
			["function f(y){var n;if(n=y)g();else g();return n}", "function f(y){var n;return n=y,g(),n}"],
			["if(function(){h()}())g();else g()", "(function(){h()}()),g();"],
			// After a `:` a returned sequence would close on its semicolon.
			["function f(a,b){if(a)return 1;else if(g(b))return 2;else return 2}", "function f(a,b){return a?1:g(b)?2:2}"],
			["function f(a,b){if(a)return 1;else if(b)return 2;else return 2}", "function f(a,b){return a?1:2}"],
			["function f(a,b){if(a){if(g(b))return 2;else return 2}return 3}", "function f(a,b){if(a)return g(b),2;return 3}"],
			// Comments both branches keep would print once.
			["if(y)f(/*! c */1);else f(/*! c */1)", "y?f(/*! c */1):f(/*! c */1);"],
			// A comment kept or branches printing otherwise keep the `?:`.
			["if(y)f();else/*! c */f()", "if(y)f();else/*! c */f();"],
			["if(y)f();else g()", "y?f():g();"],
			// A dropped test keeps a comment it holds, and a branch alone opening the statement takes no `{` or `class`.
			["function f(t){if(t/*! c */)return g();else return g()}", "function f(t){return t/*! c */?g():g()}"],
			["function f(t){if(t/*! c */)g();else g()}", "function f(t){t/*! c */?g():g()}"],
			["function f(v){if(v)({}).a();else({}).a()}", "function f(v){v?{}.a():{}.a()}"],
			["function f(v){if(v)(class{}).a();else(class{}).a()}", "function f(v){v?class{}.a():class{}.a()}"],
			["function f(v){var x;if(v)x=(class{}).a;else x=(class{}).a;return x}", "function f(v){var x;return x=class{}.a,x}"],
			// A shared sequence takes no parentheses after the test's comma or alone, but assigned or opening ambiguously.
			["function f(c){if(c){g(),h()}else{g(),h()}}", "function f(c){g(),h()}"],
			["function f(c,d){if(d)k();else if(c())g(),h();else g(),h()}", "function f(c,d){d?k():(c(),g(),h())}"],
			["function f(c){var x;if(c)x=(g(),h());else x=(g(),h());return x}", "function f(c){var x;return x=(g(),h()),x}"],
			["function f(c){if(c){({}).a(),h()}else{({}).a(),h()}}", "function f(c){({}.a(),h())}"]
		]) {
			expect(print(source)).toBe(expected);
		}
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		// Printed from its text, the shared sequence still maps where it came from.
		const mapped =
			/** @type {{ code: string, map: { mappings: string, names: string[] } }} */ (
				new SourceProcessor().process(
					"function f(c){if(c){g(),h()}else{g(),h()}}",
					{ mode: "minify", compress: {}, mangle: false, source: "a.js" }
				)
			);
		expect(mapped.code).toBe("function f(c){g(),h()}");
		expect(mapped.map.names).toEqual(expect.arrayContaining(["g", "h"]));
	});

	it("should end a returned `if` whose branches print alike as its `return`", () => {
		for (const source of [
			"function f(a){if(g(a))return 1;else return 1;h()}",
			"function f(a,b){if(a)return 1;else if(b)return 2;else return 2;h()}",
			"function f(a,b){if(a)return 1;else if(g(b))return 2;else return 2;h()}"
		]) {
			const program = `${source}function g(x){return x}function h(){}console.log(f(0,0),f(1,0),f(0,1))`;
			const { code } = minifyOnePass(program, {
				compress: { dead_code: false },
				mangle: false
			});
			expect(runProgram(code)).toBe(runProgram(program));
		}
	});

	it("should print a `switch` whose every case falls into its last as what it tests and that case's expressions", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code;
		for (const [source, expected] of [
			["var a=1,b=2;switch(a--){default:b++}", "var a=1,b=2;a--,b++;"],
			['switch(id(123)){case 1:case 2:case 3:default:console.log("PASS")}', 'id(123),console.log("PASS");'],
			["switch(x()){default:g();break;h()}", "x(),g();"],
			["function f(v){switch(v){case 1:default:g()}}", "function f(v){g()}"],
			["if(c)switch(q()){default:g()}", "if(c)q(),g();"],
			// A test that runs anything, a case with statements, no `default`, a
			// `break` before the end, a declaration or a comment keep the `switch`.
			["switch(x()){case 1:case y():default:g()}", "switch(x()){case 1:case y():default:g()}"],
			["switch(x()){case 1:case 2:g()}", "switch(x()){case 1:case 2:g()}"],
			["switch(x()){default:if(a)break;g()}", "switch(x()){default:if(a)break;g()}"],
			["switch(x()){default:var v=1;g(v)}", "switch(x()){default:var v=1;g(v)}"],
			["switch(x()){default:g();break;function q(){}}", "switch(x()){default:g();break;function q(){}}"],
			["switch(x()){/*! c */default:g()}", "switch(x()){/*! c */default:g()}"],
			["switch(x()){default:g();break;/*! c */h()}", "switch(x()){default:g();break;/*! c */h()}"],
			["function f(x){switch(x/*! c */){default:g()}}", "function f(x){switch(x/*! c */){default:g()}}"]
		]) {
			expect(print(source)).toBe(expected);
		}
	});

	it("should keep a test of `0` a boolean where a conditional gives its value", () => {
		for (const source of [
			"function f(x){return 0!==(x&4)?!0:!1}console.log(f(4),f(0))",
			"function f(x){if(0!==(x&4))return!0;return!1}console.log(f(4),f(0))",
			'function f(x,y){return 0!==(x&4)?!0:y}console.log(f(4,"y"),f(0,"y"))',
			'function f(x,y){return 0!==(x&4)?y:!1}console.log(f(4,"y"),f(0,"y"))',
			"function f(x){return(x&4)!=0?!1:!0}console.log(f(4),f(0))"
		]) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: false });
			expect(runProgram(code)).toBe(runProgram(source));
		}
		// Read only for its truth, it still prints the integer.
		expect(
			minifyOnePass("if(0!==(x&4))g()", { compress: {}, mangle: false }).code
		).toBe("if(x&4)g();");
	});

	it("should print a `+` adding to a template, or a template within one, as one template", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(x,y,g){return[${source}]}`, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code.slice(25, -2);
		for (const [source, expected] of [
			["`a${x}`+'b'", "`a${x}b`"],
			["1+`a${x}`", "`1a${x}`"],
			["`a${x}`+`b${y}`", "`a${x}b${y}`"],
			["`a${x}`+1+true", "`a${x}1`+!0"],
			["`a${x}`+'b'+'c'", "`a${x}bc`"],
			["(`a${x}`+1)+'b'+'c'", "`a${x}1bc`"],
			["1+2+`a${x}`", "`3a${x}`"],
			// A template printing as a string adds as one.
			["`a${1}`+`b${x}`", "`a1b${x}`"],
			["(`a${x}`+1).length", "`a${x}1`.length"],
			["`a${`b${x}c`}d`", "`ab${x}cd`"],
			["`a${`b${x}`+1}c`", "`ab${x}1c`"],
			// A `$` and a `{` joined would open a substitution.
			["'a$'+`{${x}}`", '"a$"+`{${x}}`'],
			["`${x}a$`+'{b}'", '`${x}a$`+"{b}"'],
			["`${x}$`+`{${y}}`", "`${x}$`+`{${y}}`"],
			["`${x}$`+'b'+'{c}'", "`${x}$b{c}`"],
			["`${x}$`+'{b}'+'c'", '`${x}$`+"{b}c"'],
			["`a$${`{${x}}`}`", "`a$${`{${x}}`}`"],
			["`${`${x}$`}{y}`", "`${`${x}$`}{y}`"],
			// `\\0` then a digit would read as an octal escape.
			["`a${x}\\0`+'1'", '`a${x}\\0`+"1"'],
			["`a${`b${x}\\0`}1`", "`a${`b${x}\\0`}1`"],
			["`a${x}\\0`+'b'", "`a${x}\\0b`"],
			// A NUL a literal holds prints as `\\0` too, and a part printing empty keeps what printed before it.
			["'\\0'+`1${x}`", '"\\0"+`1${x}`'],
			["`\\0${`1${x}`}`", "`\\0${`1${x}`}`"],
			["`${`\\0`}${`1${x}`}`", "`\\0${`1${x}`}`"],
			["`${`a${x}$`}${`{b${x}}`}`", "`a${x}$${`{b${x}}`}`"],
			// Another operand, a comment kept or a tag keep the `+` or the template.
			["`a${x}`+y", "`a${x}`+y"],
			["`a${x}`+null", "`a${x}`+null"],
			["`a${x}`-1", "`a${x}`-1"],
			["`a${x}`+/*! c */'b'", "`a${x}`+/*! c */\"b\""],
			["/*! c */`a${x}`+'b'+'c'", "/*! c */`a${x}`+\"bc\""],
			["x+'b'+'c'", 'x+"bc"'],
			["g`a${`b${x}`}c`", "g`a${`b${x}`}c`"],
			["`a${/*! c */`b${x}`}c`", "`a${/*! c */`b${x}`}c`"]
		]) {
			expect(print(source)).toBe(expected);
		}
		// What the joined templates printed maps to where it was read.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const mapped = new SourceProcessor().process(
			"f(`a${x}`+`b${y}`, `c${`d${z}`}e`)",
			{ mode: "minify", compress: {}, mangle: false, source: "in.js" }
		);
		expect(mapped.code).toBe("f(`a${x}b${y}`,`cd${z}e`);");
		expect(mapped.map).toEqual(
			expect.objectContaining({
				mappings: "AAAAA,EAAE,IAAIC,CAAI,IAAIC,IAAK,CAAI,IAAIC"
			})
		);
		// A name kept for its size stays a name, a short one folds.
		expect(
			minifyOnePass(
				'function h(x){const K="a long string the printer keeps";return[`a${x}`+K,K,K]}',
				{ compress: {}, mangle: false }
			).code
		).toBe(
			'function h(x){let K="a long string the printer keeps";return[`a${x}`+K,K,K]}'
		);
	});

	it("should keep a `switch` on a known value whose case holds a comment that prints", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code;
		expect(print("function f(){switch(1){/*! keep */case 1:a()}}f()")).toBe(
			"function f(){switch(1){/*! keep */case 1:a()}}f();"
		);
		expect(print("function f(){switch(1){/* drop */case 1:a()}}f()")).toBe(
			"function f(){a()}f();"
		);
	});

	it("should read `global_defs` before the global `NaN` and `Infinity`", () => {
		const print = (/** @type {EXPECTED_OBJECT} */ compress) =>
			minifyOnePass("if (!(1 < Infinity)) t(); g(!NaN);", {
				compress,
				mangle: false
			}).code;
		expect(print({})).toBe("g(!0);");
		expect(print({ global_defs: { Infinity: 0, NaN: 1 } })).toBe("t();g(!1);");
	});

	it("should drop an unread call to an export `#__NO_SIDE_EFFECTS__` marks", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, { compress: {}, mangle: {}, module: true }).code;
		expect(
			print("/*#__NO_SIDE_EFFECTS__*/ export function f() { g(); } f();")
		).toBe("export function f(){g()}");
		expect(
			print("/*#__NO_SIDE_EFFECTS__*/ export const f = () => g(); f();")
		).toBe("export const f=()=>g();");
		expect(
			print("export /*#__NO_SIDE_EFFECTS__*/ const f = () => g(); f();")
		).toBe("export const f=()=>g();");
		expect(
			print(
				"/*#__NO_SIDE_EFFECTS__*/ export default function f() { g(); } f();"
			)
		).toBe("export default function f(){g()}");
		// An export of names declares no function the comment could mark.
		expect(
			print("/*#__NO_SIDE_EFFECTS__*/ export { f }; function f() { g(); } f();")
		).toBe("export{f};function f(){g()}f();");
	});

	it("should print what runs the same for names, `delete` and pure callees", () => {
		for (const [source, options] of /** @type {[string, EXPECTED_OBJECT][]} */ ([
			// A dropped `var` frees its name for the catch parameter sharing it.
			[
				'"aaaaaaaa";var a=1,b="FAIL";try{throw 1}catch(c){try{throw 0}catch(a){if(c)b="PASS"}}console.log(b);',
				{ toplevel: true }
			],
			[
				'"aaaaaaaa";var a=1,b="FAIL";try{throw 1}catch(c){try{throw 0}catch(a){if(c)b="PASS"}}console.log(b);',
				{ toplevel: true, mangle: { keep_fnames: true } }
			],
			// Sloppy code ignores a function expression setting its own name.
			[
				"console.log(typeof function c(){c=6;return c}(),function c(){c=6;return typeof c}())",
				{ compress: {} }
			],
			// Moved into a function moved itself, a read stays the outer name's.
			[
				'!function(){function foo(x){console.log("foo",x);if(x)bar(x-1)}function bar(x){console.log("bar",x);if(x)qux(x-1)}function qux(x){console.log("qux",x);if(x)foo(x-1)}qux(4)}();',
				{ compress: {} }
			],
			[
				"console.log(delete undefined,delete void 0,delete Infinity,delete NaN);var x=1;console.log(delete x)",
				{}
			],
			// The annotation inside a parenthesis marks only what it holds.
			[
				"let count=0;function invoke(){count+=1}function id(v){return v}(/* @__PURE__ */ id(invoke))();(/* @__PURE__ */ id(invoke)).call();console.log(count)",
				{}
			],
			// A member read where a call binds `this` stays the value it was set to.
			[
				"var o={get(){return this===o}};function h(t){const y=t.get;return y()}console.log(h(o))",
				{}
			],
			// An indirect `eval` reads no local name: called directly, it would.
			[
				"var o={h(){var e=eval;return e('this')===o}};console.log(o.h())",
				{}
			],
			[
				"function f(){var x=123;var z=0;z=x&&(z=2);return z}console.log(f())",
				{}
			],
			// A branch's earlier assignment, collapsed into the one the `?:` hoists, stays.
			[
				"function f(o,t,k){var v,d;if(o.d){d=Object.getOwnPropertyDescriptor(t,k);v=d&&d.value}else v=t[k];return v}console.log(f({d:1},{a:1},'a'),f({},{a:2},'a'))",
				{}
			],
			// Declared after its read and reading a function moved into it, a
			// function stays in place, so its call is no longer its value.
			[
				"!function(){var p=function(o){return isS(o)?1:2};function isO(v){return v>1}function isS(v){return v&&isO(v)}console.log(p(0),p(3))}()",
				{}
			],
			// Trailing arguments nothing reads go; a literal argument prints at its read.
			[
				"!function(){function g(a,b){return a}console.log(g(1,2),g(3),g(4,5,6))}();(function(o){o.a++;console.log(o.a,Object.keys(o))})({a:1,b:[2]})",
				{}
			],
			// A default reading `arguments` reads arguments past the parameters.
			[
				"!function(){function*g(x=arguments[2],y=arguments[3],z){yield[x,y,z]}console.log(g(void 0,void 0,'third','fourth').next().value.join(),g().next().value.join())}()",
				{}
			],
			[
				"!function(){var x=1;x=x+2;x=x<<1;x=x-(1-3);console.log(x);(function(o,p){console.log(p,o.length)})([1,2],[3])}()",
				{}
			]
		])) {
			const { code } = minifyOnePass(source, {
				compress: {},
				mangle: true,
				module: false,
				...options
			});
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should print folded values where they are read as reading back the same", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, { compress: {}, mangle: true, module: true }).code;
		for (const [source, expected] of [
			// A name printing as a number takes a `.` before a member's.
			["var a = 1; a.toString();", "1..toString();"],
			["var a = /1/; a.test(1);", "/1/.test(1);"],
			// A folded `await` or `new` without arguments takes no parentheses.
			[
				"export async function f(){ const r = await g(1); h(r) }",
				"export async function f(){h(await g(1))}"
			],
			[
				"export async function f(){ const r = await g(1); return r.x }",
				"export async function f(){return(await g(1)).x}"
			],
			["export function f(){ const r = new C; h(r) }", "export function f(){h(new C)}"],
			// What a value folds to, or the call it prints as, takes its own parentheses.
			["export const f = l => { var m = 42 + l; return m; };", "export const f=r=>42+r;"],
			[
				"export function g(){ var x = import.meta; x.url() }",
				"export function g(){import.meta.url()}"
			],
			[
				"export function g(){ var x = new Error(); return x.stack }",
				"export function g(){return Error().stack}"
			],
			["f((new Error()).stack);", "f(Error().stack);"],
			["f(new (new Error())(1));", "f(new(Error())(1));"],
			[
				"export function g(){ (function(){ return c ? 1 : 2 })() }",
				"export function g(){c?1:2}"
			],
			[
				"export class A extends (this === undefined ? B : B) {}",
				"export class A extends B{}"
			],
			[
				"export const f = (a, b, c = (x ? false : !!b.d)) => g(a, b, c);",
				"export const f=(a,b,c=!x&&!!b.d)=>g(a,b,c);"
			],
			[
				"export const s = (\"a b \" + \"c d\").split(\" \");",
				'export const s="a b c d".split(" ");'
			],
			["export const n = ~(1 | 2);", "export const n=-4;"],
			["export async function f(){ await (4 ** 2) }", "export async function f(){await 16}"],
			[
				'export const h = (e, t) => { const y = t?.get("type"); y && (o = o.push(1)) };',
				'export const h=(t,e)=>{e?.get("type")&&(o=o.push(1))};'
			],
			['export function f(o){ if (!!("a" in o)) g() }', 'export function f(o){if("a"in o)g()}'],
			["export const t = [(l, c) => g(l, c)];", "export const t=[(c,l)=>g(c,l)];"],
			[
				'export function f(){ const c = (n, U) => g(n, U); return c("file", h) }',
				'export function f(){return(c=>g("file",c))(h)}'
			],
			[
				"export function f(e){ if (a) b(); else (function(e){ g(e) })(e) }",
				"export function f(e){a?b():g(e)}"
			],
			// Bare, the function would be a declaration, hoisted.
			["export default (function(){});", "export default(function(){});"],
			["export default function(){}", "export default function(){}"],
			[
				"export function f(){ const r = new C; return r() }",
				"export function f(){return(new C)()}"
			],
			// A test known folds to the name, member or call it keeps.
			["export class C extends (true ? A : B) {}", "export class C extends A{}"],
			["g(a * (1 ? b : c), (1 ? x : y).z)", "g(a*b,x.z);"],
			["g(new (1 ? a.b() : c))", "g(new(a.b()));"],
			// An arrow returning an object folded in keeps it in parentheses.
			["f(() => { var o = {}; return o.a + 1 })", "f(()=>({}.a+1));"],
			["define(() => { var w = 42; return w + l })", "define(()=>42+l);"],
			// A `do` body prints in braces, as terser prints it.
			["do x(); while (y)", "do{x()}while(y);"]
		]) {
			expect(print(source)).toBe(expected);
		}
		// The names handed out hang on what prints, not on how a source spells it.
		const source =
			"function f(alpha,beta){var delta=alpha+beta;g(delta,delta*7,6,5,4,3,2,1)}g(f)";
		expect(print(source.replace(/\b([1-7])\b/g, "0x$1"))).toBe(print(source));
		expect(print(source.replace(/\bdelta\b/g, "\\u0064elta"))).toBe(
			print(source)
		);
	});

	it("should keep a `Number` constant a pattern or assignment writes", () => {
		const { code } = minifyOnePass(
			"[Number.POSITIVE_INFINITY]=[7];({v:Number.NEGATIVE_INFINITY}={v:1});[...Number.POSITIVE_INFINITY]=[7];for([Number.POSITIVE_INFINITY] of [[7]]);Number.NaN++;let v;({[Number.POSITIVE_INFINITY]:v=Number.NEGATIVE_INFINITY}={});g(Number.NaN)",
			{ compress: {}, mangle: {} }
		);
		// Written, each stays; read, a key, a default and an argument fold.
		expect(code).toBe(
			"[Number.POSITIVE_INFINITY]=[7],({v:Number.NEGATIVE_INFINITY}={v:1}),[...Number.POSITIVE_INFINITY]=[7];for([Number.POSITIVE_INFINITY]of[[7]]);Number.NaN++;let v;({[1/0]:v=-1/0}={}),g(NaN);"
		);
	});

	it("should keep a call whose class reads the function's `new.target` where it is defined", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, { compress: {}, mangle: {}, module: true }).code;
		expect(
			print(
				"it(function () { g((function () { return class { [new.target]() {} }; })()); });"
			)
		).toBe("it(function(){g(function(){return class{[new.target](){}}}())});");
		expect(
			print(
				"it(function () { g((function () { return class extends (new.target || Object) {}; })()); });"
			)
		).toBe(
			"it(function(){g(function(){return class extends(new.target||Object){}}())});"
		);
		// A method's `this` is its own: the class is the call's value.
		expect(
			print(
				"it(function () { g((function () { return class { m() { return this.x } }; })()); });"
			)
		).toBe("it(function(){g(class{m(){return this.x}})});");
	});

	it("should read terser's compress options that name calls, globals and names", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, unknown>} */ compress = {}
		) => minifyOnePass(source, { compress, mangle: false }).code;
		// `drop_debugger` drops them unless turned off, where no list holds one too.
		expect(print("debugger;f();")).toBe("f();");
		expect(print("if(a)debugger;f();")).toBe("a;f();");
		expect(print("debugger;f();", { drop_debugger: false })).toBe(
			"debugger;f();"
		);
		// `drop_console` drops a call whole, what its arguments run with it.
		expect(print("console.log(f());g();", { drop_console: true })).toBe(
			"g();"
		);
		expect(
			print("(function(){var a=f();console.info(a);g()})()", {
				drop_console: true
			})
		).toBe("f();g();");
		expect(
			print("console.log(1);console.warn(2);g();", { drop_console: ["log"] })
		).toBe("console.warn(2),g();");
		expect(
			print("console[m](1);c.console.log(1);", { drop_console: true })
		).toBe("console[m](1),c.console.log(1);");
		expect(
			print("var console=k;console.log(1);", { drop_console: true })
		).toBe("var console=k;console.log(1);");
		// Where no list holds it, it prints as the `undefined` it returns.
		expect(
			print("if(a)console.log(f());for(;;)console.log(1);x=console.log(2);", {
				drop_console: true
			})
		).toBe("if(a);for(;;);x=void 0;");
		// Where a unary cannot stand, it is grouped.
		expect(
			print(
				"x=console.log()**2;y=console.log().a;z=console.log()();w=new(console.log());",
				{ drop_console: true }
			)
		).toBe("x=(void 0)**2,y=(void 0).a,z=(void 0)(),w=new(void 0);");
		// So is one called through `call` or `apply`.
		expect(
			print("console.log.call(console,a);console.log.apply(console,b);g();", {
				drop_console: true
			})
		).toBe("g();");
		// `pure_funcs` marks the calls it names pure, by how the callee is written.
		expect(
			print("foo(1);a.b.c(2);a.b.d(3);a[b].c(4);(0,foo)(5);", {
				pure_funcs: ["foo", "a.b.c"]
			})
		).toBe("a.b.d(3),a[b].c(4),foo(5);");
		expect(print("var x=foo(1);h(x);", { pure_funcs: ["foo"] })).toBe(
			"var x=foo(1);h(x);"
		);
		// `global_defs` replaces a global nothing sets with a primitive value.
		const defs = {
			global_defs: { DEBUG: false, VERSION: "1.2", "@code": "x", O: {} }
		};
		expect(print("if(DEBUG)x();g(VERSION,O);", defs)).toBe('g("1.2",O);');
		expect(print("DEBUG=1;g(DEBUG);", defs)).toBe("DEBUG=1,g(DEBUG);");
		expect(print("(function(DEBUG){g(DEBUG)})(h)", defs)).toBe(
			"!function(DEBUG){g(DEBUG)}(h);"
		);
		// A shorthand prints its key and the value.
		expect(
			minifyOnePass("g({DEBUG,VERSION});", {
				compress: defs,
				mangle: false,
				ecma: 2015
			}).code
		).toBe('g({DEBUG:!1,VERSION:"1.2"});');
		// A key with dots names what is read off a global.
		const nested = {
			global_defs: { "process.env.NODE_ENV": "production", "env.DEBUG": 0 }
		};
		expect(
			print(
				'if(process.env.NODE_ENV!=="production")x();g(env.DEBUG,a.env.DEBUG,delete env.DEBUG);',
				nested
			)
		).toBe("g(0,a.env.DEBUG,delete env.DEBUG);");
		expect(print("var env={};g(env.DEBUG);", nested)).toBe(
			"var env={};g(env.DEBUG);"
		);
		// A number a sign or point would join to what is around it is grouped.
		expect(
			print("g(V.toString(),-V,typeof V);", { global_defs: { V: -1 } })
		).toBe('g((-1).toString(),1,"number");');
		expect(print("g(1/V);", { global_defs: { V: -0 } })).toBe("g(1/(-0));");
		// `top_retain` keeps the top-level names it lists, a pattern or a test keeps.
		const top = "var foo=1,bar=2;";
		expect(print(top, { toplevel: true })).toBe("");
		expect(print(top, { toplevel: true, top_retain: "foo, bar" })).toBe(
			"var foo=1,bar=2;"
		);
		expect(print(top, { toplevel: true, top_retain: ["bar"] })).toBe(
			"var bar=2;"
		);
		expect(print(top, { toplevel: true, top_retain: /^f/g })).toBe(
			"var foo=1;"
		);
		expect(
			print(top, {
				toplevel: true,
				top_retain: (/** @type {{ name: string }} */ definition) =>
					definition.name === "bar"
			})
		).toBe("var bar=2;");
		// It implies `toplevel` where that is not given, and keeps a name inlined.
		expect(print(top, { top_retain: "foo" })).toBe("var foo=1;");
		expect(print(top, { top_retain: "foo", toplevel: false })).toBe(
			"var foo=1,bar=2;"
		);
		expect(
			print("var foo=1;foo;g(foo);", { toplevel: true, top_retain: "foo" })
		).toBe("var foo=1;g(foo);");
		// `keep_infinity` prints `Infinity` as written.
		expect(print("x(Infinity);")).toBe("x(1/0);");
		expect(print("x(Infinity);", { keep_infinity: true })).toBe(
			"x(Infinity);"
		);
	});

	it("should keep what terser's `unused` and `inline` turned off keep", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, unknown>} */ compress = {}
		) => minifyOnePass(source, { compress, mangle: false }).code;
		const unread = "(function(){var a=1;function u(){}g(a)})()";
		expect(print(unread)).toBe("g(1);");
		expect(print(unread, { unused: false })).toBe(
			"!function(){var a=1;function u(){}g(a)}();"
		);
		expect(print("(function(a){g(a)})(1)", { unused: false })).toBe(
			"!function(a){g(a)}(1);"
		);
		expect(print("(function(){var a=f();g(a)})()", { unused: false })).toBe(
			"!function(){var a=f();g(a)}();"
		);
		const called = "(function(){function f(){return g()}h(f())})()";
		expect(print(called)).toBe("h(g());");
		expect(print(called, { inline: false })).toBe(
			"!function(){function f(){return g()}h(f())}();"
		);
		const moved = "function f(x){var g=()=>C;if(x)return;class C{}return g()}";
		expect(print(moved)).toBe("function f(x){if(x)return;class C{}return C}");
		expect(print(moved, { inline: false })).toBe(
			"function f(x){var g=()=>C;if(x)return;class C{}return g()}"
		);
		expect(print("h((function(){return 1})())", { inline: 0 })).toBe(
			"h(function(){return 1}());"
		);
	});

	it("should keep what may throw or run code in the one pass, as test262 reads it", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, unknown>} */ compress = {}
		) => minifyOnePass(source, { compress, mangle: {} }).code;
		// A `using` binding is disposed of, read or not.
		expect(print("function g(){ using x = f(); } g();")).toBe(
			"function g(){using g=f()}g();"
		);
		expect(print("async function g(){ await using x = f(); } g();")).toBe(
			"async function g(){await using n=f()}g();"
		);
		// Comparing or keying by an object converts it, under `pure_conversions: false`.
		const compares =
			"var y = {}; t(function () { 0 == y; y < 1; y === 1; null == y; });";
		expect(print(compares)).toBe("var y={};t(function(){});");
		expect(print(compares, { pure_conversions: false })).toBe(
			"var y={};t(function(){0==y,y<1});"
		);
		const keys = "var k = {}; t(function () { ({ get [k]() {} }); });";
		expect(print(keys)).toBe("var k={};t(function(){});");
		expect(print(keys, { pure_conversions: false })).toBe(
			"var k={};t(function(){({get[k](){}})});"
		);
		// A bound `undefined` may be an object; a computed read converts its key.
		const bound =
			"t(function (undefined, x) { undefined == x; null == x; void 0 == x; });";
		expect(print(bound)).toBe("t(function(n,d){});");
		expect(print(bound, { pure_conversions: false })).toBe(
			"t(function(n,d){n==d});"
		);
		const reads = 't(function (k) { (0)[k]; o[1]; o["a"]; });';
		expect(print(reads)).toBe("t(function(k){o[1],o.a});");
		expect(print(reads, { pure_conversions: false })).toBe(
			"t(function(k){(0)[k],o[1],o.a});"
		);
		// Setting a class's or a strict function expression's own name throws.
		expect(
			print("t(function () { new (class C { m() { C = 1; } })().m(); });")
		).toBe("t(function(){(new class n{m(){n=1}}).m()});");
		expect(
			print("t(function () { new (function f() { 'use strict'; f = 1; })(); });")
		).toBe('t(function(){new function n(){"use strict";n=1}});');
		// Setting a `let` in its dead zone throws; set after, it may go.
		expect(print("{ function f() { x = 1; } t(f); let x; }")).toBe(
			"{function f(){n=1}t(f);let n}"
		);
		expect(print("function g() { let x; x = 1; } g();")).toBe(
			"function g(){}g();"
		);
		// A derived constructor's `this` throws before `super()`.
		expect(
			print(
				"class C extends B { constructor() { t(() => { this; }); super(); } }"
			)
		).toBe("class C extends B{constructor(){t(()=>{this}),super()}}");
		expect(print("class C { constructor() { t(() => { this; }); } }")).toBe(
			"class C{constructor(){t(()=>{})}}"
		);
		// An async generator awaits what it returns, a tick a bare `return` skips.
		expect(
			print(
				"async function* g() { return undefined; } async function h() { return void 0; } t(g, h);"
			)
		).toBe("async function*g(){return void 0}async function h(){}t(g,h);");
		// The global `Infinity` nothing writes folds, as terser's `evaluate` reads it;
		// written, it may be anything.
		expect(print("if (!(1 < Infinity)) t();")).toBe("");
		expect(print("Infinity = 0; if (!(1 < Infinity)) t();")).toBe(
			"if(!(1<(Infinity=0)))t();"
		);
	});

	it("should print constant keys, `new` targets and enumerations shorter in the one pass", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, unknown>} */ options = {}
		) =>
			minifyOnePass(source, {
				compress: {},
				mangle: {},
				module: true,
				...options
			}).code;
		// A computed key of a constant prints as its name, but where that means
		// something else, and for a `NaN` some scope binds.
		expect(
			print(
				'export const o={["a"]:1,[1]:2,["b c"]:3,["__proto__"]:4,["__proto__"](){}}; export class C{["m"](){} static ["x"]=1; ["constructor"](){} static ["prototype"](){} ["#constructor"]=1; ["#x"](){} [NaN](){return 1} get [null](){return 2}} export function f({["k"]:v,["__proto__"]:p,[NaN]:n,[null]:u}){return [v,p,n,u]} export function g(NaN){return {[NaN]:1}}'
			)
		).toBe(
			'export const o={a:1,1:2,"b c":3,["__proto__"]:4,__proto__(){}};export class C{m(){}static x=1;["constructor"](){}static["prototype"](){}["#constructor"]=1;["#x"](){}NaN(){return 1}get null(){return 2}}export function f({k:t,__proto__:r,NaN:n,null:u}){return[t,r,n,u]}export function g(t){return{[t]:1}}'
		);
		expect(
			print('export const o={["a"]:1};', {
				compress: { computed_props: false }
			})
		).toBe('export const o={["a"]:1};');
		// `RegExp` of a primitive builds as `new RegExp` does; of an expression, it may hand it back.
		expect(
			print(
				"export function b(r){return [new RegExp(10n), new RegExp(-10n), new RegExp(`x`), new RegExp(), new RegExp(/a/), new RegExp(r)]}"
			)
		).toBe(
			"export function b(e){return[RegExp(10n),RegExp(-10n),RegExp(`x`),RegExp(),new RegExp(/a/),new RegExp(e)]}"
		);
		// `new` reads no `this` from a sequence, so what runs nothing before it goes.
		expect(
			print(
				"export function f(log,k){return [new (0, a.b)(2), new (0, a)(), new (log.push(1), a)(), new (0, a.b().c)(), new (0, a[k])(1), new (0, a?.b)(), (0, a.b)(1), new (0,this.x)]}"
			)
		).toBe(
			"export function f(n,e){return[new a.b(2),new a,new(n.push(1),a),new(0,a.b().c),new a[e](1),new(0,a?.b),(0,a.b)(1),new this.x]}"
		);
		// A read in its dead zone throws and keeps the name; the reads after fold.
		expect(
			print(
				"export function late(g){ function first(){return limit} const limit = 3; g(first); return [first(), limit*2, limit] }"
			)
		).toBe(
			"export function late(t){function i(){return r}let r=3;t(i);return[i(),6,r]}"
		);
		// `Object.keys`, `values` and `entries` of a string or of an array of what
		// runs nothing print as the array they make.
		expect(
			print(
				'export function e(g,l){return [Object.keys([10,,30]),Object.values([10,,30]),Object.entries([10,,30]),Object.keys("ab"),Object.entries("a"),Object.keys([g()]),Object.keys([...l]),Object.keys?.([1])]} export function s(Object){return Object.keys([1])}'
			)
		).toBe(
			'export function e(t,c){return[["0","2"],[10,30],[["0",10],["2",30]],["0","1"],[["0","a"]],Object.keys([t()]),Object.keys([...c]),Object.keys?.([1])]}export function s(t){return t.keys([1])}'
		);
		// A method the program writes stays a call, and every one once `Object` goes elsewhere.
		const replaced = [
			[
				'export function r(){Object.keys=()=>["k"];[Object.values]=[()=>1];return[Object.keys([1]),Object.values("a"),Object.entries("a")]}',
				'export function r(){Object.keys=()=>["k"],[Object.values]=[()=>1];return[Object.keys([1]),Object.values("a"),[["0","a"]]]}'
			],
			[
				'export function r(){delete Object["entries"];Object.keys.call;return[Object.keys([1]),Object.entries("a")]}',
				'export function r(){delete Object.entries,Object.keys.call;return[["0"],Object.entries("a")]}'
			],
			[
				'export function r(g){g(Object);return[Object.keys([1]),typeof Object,g instanceof Object]}',
				"export function r(e){e(Object);return[Object.keys([1]),typeof Object,e instanceof Object]}"
			],
			[
				'export function r(g){Object[g]=1;return Object.keys([1])}',
				"export function r(e){return Object[e]=1,Object.keys([1])}"
			]
		];
		for (const [source, expected] of replaced) {
			expect(print(source)).toBe(expected);
		}
		// A private member nothing reads goes, a field only where its value runs nothing.
		const members = [
			[
				"export class C{#a(){return 1}#b=2;#c=g();get #d(){return 1}set #d(v){}static #e(){}#f;m(){return this.#f}}",
				"export class C{#r=g();#c;m(){return this.#c}}"
			],
			[
				'export class C{#a(){return 1}m(){return eval("this.#a()")}}',
				'export class C{#a(){return 1}m(){return eval("this.#a()")}}'
			],
			[
				"export class C{#a(){}m(o){return #a in o}}",
				"export class C{#a(){}m(a){return#a in a}}"
			],
			[
				"export class C{#a(){}m(){class D{f(o){return o.#a}}return D}}",
				"export class C{#r(){}m(){class r{f(r){return r.#r}}return r}}"
			],
			["export class C{#a(){}}", "export class C{}"],
			["export class C{/*! keep */#a(){}}", "export class C{/*! keep */#a(){}}"]
		];
		for (const [source, expected] of members) {
			expect(print(source)).toBe(expected);
		}
		// A statement calling a function expression prints the call after `!`.
		expect(
			print(
				"(function(){for(;;)g()})();(function(){for(;;)g()})(),h();h(),(function(){for(;;)g()})()"
			)
		).toBe(
			"!function(){for(;;)g()}(),function(){for(;;)g()}(),h(),h(),function(){for(;;)g()}();"
		);
		expect(
			print("(function(){for(;;)g()})();h()", { compress: { negate_iife: false } })
		).toBe("(function(){for(;;)g()})();h();");
		expect(
			print("(function(){for(;;)g()})();h()", { format: { wrap_iife: true } })
		).toBe("(function(){for(;;)g()})();h();");
		// An empty function called where nothing reads it runs only its arguments.
		expect(
			print(
				"(function(){})(a(),b());x(),(()=>{})(...a),y();if(c)(function(a){})(...a);else d();z=(function(){})(a());(function({a}){})(b);(function(a=g()){})(b);(async function(){})(b)"
			)
		).toBe(
			"a(),b(),x(),[...a],y(),c?[...a]:d(),z=function(){}(a()),function({a:n}){}(b),function(n=g()){}(b),b;"
		);
		// Branches printing alike print once, after the test where it runs anything.
		expect(
			print(
				'export function q(x,o){return[x?o["read"]():o.read(),1+(g(x)?o.read():o.read()),f(g(x)?o.r:o.r),(x?o.f:o.f)(),delete(x?o.f:o.f),typeof(x?y:y)]}export function s(x,o){x?o.f():o.f();g(x)?o.f():o.f()}'
			)
		).toBe(
			"export function q(o,x){return[x.read(),1+(g(o),x.read()),f((g(o),x.r)),(0,x.f)(),delete(o?x.f:x.f),typeof(o?y:y)]}export function s(o,f){f.f(),g(o),f.f()}"
		);
		expect(
			print("export function q(x,o){return x?o.read():o.read()}", {
				compress: { side_effects: false }
			})
		).toBe("export function q(o,r){return o,r.read()}");
		// What a function called where nothing reads its call returns goes, where it runs nothing.
		expect(
			print(
				"(function(){try{throw 1}finally{return 2}})();x=(function(){try{g()}finally{return 2}})();(function(){if(g())return 1;for(;;)h()})();(async function(){g();return 1})();(function(){g();return h()})();a(),(()=>{g();return 2})(),b();(function*(){return 1})().next()"
			)
		).toBe(
			"!function(){try{throw 1}finally{return}}(),x=function(){try{g()}finally{return 2}}(),function(){if(g())return;for(;;)h()}(),async function(){return g(),1}(),function(){return g(),h()}(),a(),(()=>{g()})(),b();(function*(){return 1})().next();"
		);
		// A method's value is the method's, read whatever the call around its class.
		expect(
			print(
				"(()=>{class K{a(){return 1}get b(){return 2}static c(){return 3}}g(K,{m(){return 4},get n(){return 5}})})()"
			)
		).toBe(
			"(()=>{class r{a(){return 1}get b(){return 2}static c(){return 3}}g(r,{m(){return 4},get n(){return 5}})})();"
		);
		// A program only calling a function prints as its statements, where they
		// declare nothing, return nothing and read nothing the call gives them.
		for (const [source, expected] of [
			["(()=>{it(1);it(2)})()", "it(1),it(2);"],
			["(function(){if(x){let y=g();h(y)}})()", "if(x)h(g());"],
			["(()=>{var a=1;g(a)})()", "g(1);"],
			["(()=>{g(this,()=>{return 1})})()", "g(this,()=>1);"],
			["(()=>{let a=g();h(a);h(a)})()", "(()=>{let a=g();h(a),h(a)})();"],
			["(()=>{class A{}g(A,A)})()", "(()=>{class A{}g(A,A)})();"],
			["(()=>{if(x){function f(){}g(f,f)}})()", "(()=>{if(x){function f(){}g(f,f)}})();"],
			["(()=>{for(;;){var a=g();h(a,a)}})()", "(()=>{for(;;){var a=g();h(a,a)}})();"],
			['(()=>{"use strict";g()})()', '(()=>{"use strict";g()})();'],
			["(()=>{if(x)return;g()})()", "x||g();"],
			["(()=>{eval(x)})()", "(()=>{eval(x)})();"],
			["(function(){g(this)})()", "!function(){g(this)}();"],
			["(function(){g(arguments)})()", "!function(){g(arguments)}();"],
			["(function(a){g(a)})(1)", "g(1);"],
			["x=(a=>a*2)(4);y=((a,b)=>a+b)(4,5)", "x=8,y=9;"],
			["(function(a){g(a,a,a)})(\"a long string\")", "!function(a){g(a,a,a)}(\"a long string\");"],
			["function x(){if(c){k();return 1}else{h();return 2}}function y(){if(c){k();return function(){if(a)b()}}else if(d){k();return 3}else g()}", "function x(){if(c)return k(),1;return h(),2}function y(){if(c)return k(),function(){if(a)b()};if(d)return k(),3;g()}"],
			["function f(v){if(v===void 0)return;if(c())return v;return d(v)}function g(x){if(x){a();if(b)return 1;return 2}}", "function f(r){if(r!==void 0)return c()?r:d(r)}function g(r){if(r)return a(),b?1:2}"],
			["for(;;){if(a){{f()}}}if(a){{b()}}else d();if(a){{if(b)c()}}else d()", "for(;;)if(a)f();if(a)b();else d();if(a){if(b)c()}else d();"],
			["(()=>{g()})();h()", "g(),h();"]
		]) {
			expect(print(source, { module: false })).toBe(expected);
		}
		expect(print("g()", { enclose: true })).toBe("!function(){g()}();");
		// A `var` and the statement setting its last name read as one; a `let`
		// stays apart, its dead zone lasting while the value runs.
		expect(
			print(
				"export function f(r){var h;h=x=>x+1;r.add([h])}export function g(r){var a,b;b=r();return[a,b]}export function h(){var h;h=h||1;return h}export function k(r){let a;a=r();switch(r){case 1:var c;c=r();r(c,c)}return[a,a]}"
			)
		).toBe(
			"export function f(r){r.add([r=>r+1])}export function g(r){var t;return[t,r()]}export function h(){var r;return r=r||1}export function k(r){let t;t=r();if(r===1){var a;r(a=r(),a)}return[t,t]}"
		);
		// A `let` nothing reads loses the writes of closures made once it is set,
		// not of one made before it, of a function declaration, or a closure that reads it.
		expect(
			print(
				"export function a(v){let s,k=function(x){s=x;g(x)};v.forEach(x=>{s=x});v.forEach(k)}export function b(r){const w=()=>{p=r};w();let p;w()}export function c(r){function w(){p=r}let p;w()}export function d(v){let s;v.forEach(x=>{s=x});return()=>s}"
			)
		).toBe(
			"export function a(t){t.forEach(t=>{}),t.forEach(function(t){g(t)})}export function b(t){let n=()=>{o=t};n();let o;n()}export function c(t){let n;(function(){n=t})()}export function d(t){let n;t.forEach(t=>{n=t});return()=>n}"
		);
		// A value running nothing moves past what runs nothing, not past what may.
		expect(
			print(
				'export function r(j){const i=/*#__PURE__*/j("i",[]);return /*#__PURE__*/j("d",[/*#__PURE__*/j("b",[]),i])}export function s(j,l){const i=/*#__PURE__*/j("i",[]);return j("d",[l("b"),i])}'
			)
		).toBe(
			'export function r(i){return i("d",[i("b",[]),i("i",[])])}export function s(i,n){let t=i("i",[]);return i("d",[n("b"),t])}'
		);
		// What follows a statement always leaving its list goes, but what it declares.
		expect(
			print(
				"export function a(){return 1;g()}export function b(){if(1)return 7;g()}export function c(){return x;var x}export function d(){return h;function h(){}}export function e(){for(;;){if(a)break;else continue;h()}}"
			)
		).toBe(
			"export function a(){return 1}export function b(){return 7}export function c(){return n;var n}export function d(){return function(){}}export function e(){for(;!a;);}"
		);
		// A constant passed to a function called once is its parameter's value.
		expect(
			print(
				'export const r=[function(a,b,c){return a+b+c}(1,g(),"s"),(x=>x*2)(3),function(x){x=2;return x}(1),function(x){return arguments[0]+x}(1),function f(x){return f.length+x}(1),function(x){return x}(1,2),function(x,y){return x+y}(...a)];export function m(){function n(y){return h(y,y)}return n(1)}'
			)
		).toBe(
			"export const r=[function(t){return 1+t+\"s\"}(g()),6,function(n){return 2}(1),function(n){return arguments[0]+n}(1),function n(t){return n.length+t}(1),function(){return 1}(2),function(n,t){return n+t}(...a)];export function m(){return h(1,1)}"
		);
		// A function called where nothing reads the call prints as what it runs.
		expect(
			print(
				"export function u(y,r){(function(x){if(x)return 3;r(x)})(y);(()=>{if(r(1))return 4;r(2)})();(function(x){r(x);r(1)})(y);(function(){if({}.a)return;r()})();(function(x){if(x)return;r(x,()=>x)})(y)}export function v(y,r){(function(x){if(x=y)return;r(x)})(y)}export function w(y,r){(function(x){if(x)return y=1;r(x)})(y)}"
			)
		).toBe(
			"export function u(r,n){r||n(r),n(1)||n(2),n(r),n(1),function(){if(!{}.a)n()}(),function(r){if(!r)n(r,()=>r)}(r)}export function v(r,n){!function(t){if(!(t=r))n(t)}(r)}export function w(r,n){!function(t){if(t)return r=1;n(t)}(r)}"
		);
		// A constant passed on as a name folds where it is read, after what
		// always returns, and through `new`.
		expect(
			print(
				"export function t(r){return(function(y){let a=(function(x){if(x)return 7;r(x)})(y);let c=new function(x){if(x)return{b:9};this.b=0}(y);return[a,c]})(1)}"
			)
		).toBe(
			"export function t(n){return[function(){return 7}(),new function(){return{b:9}}()]}"
		);
		// A conditional giving a boolean on one side prints as `&&` or `||`.
		expect(
			print(
				"export function f(a,l){return a?false:l(1)}export function g(a,l,b,c){if(a?true:l(1))l(2);if(a?l(3):false)l(4);if(a?l(5):true)l(6);return a?false:b||c}"
			)
		).toBe(
			"export function f(l,a){return!l&&a(1)}export function g(l,a,e,r){if(l||a(1))a(2);if(l&&a(3))a(4);if(!l||a(5))a(6);return l?!1:e||r}"
		);
		// An array read at a known index prints as that element, kept where
		// written, deleted, called or its others run anything.
		expect(
			print(
				"export function p(e,o,f){[e][0]=2;o[['a'][0]]=3;return[[1,e][1],[f][0](),[2][0],{[['b'][0]]:e},[...[[2,3]][0]],[e,f()][0],delete[e][0]]}"
			)
		).toBe(
			"export function p(e,f,o){return[e][0]=2,f.a=3,[e,[o][0](),2,{b:e},[...[2,3]],[e,o()][0],delete[e][0]]}"
		);
		// A bare `return` after an `if` returning ends the function anyway.
		expect(
			print("export function s(n){if(n)return n;else return}")
		).toBe("export function s(n){if(n)return n}");
		// Where every string spells as a template, strings print as templates.
		expect(
			print(
				"export const q=[\"a\",'b\"'];g(\"d'\");import(\"x\")",
				{ ecma: 2020 }
			)
		).toBe("export const q=[`a`,`b\"`];g(`d'`),import(\"x\");");
		expect(print('export const q=["a","c`"]', { ecma: 2020 })).toBe(
			'export const q=["a","c`"];'
		);
		// `if`s next to each other returning values written alike test either.
		expect(
			print(
				'export function q(a,b,v){if(a)return{kept:v};if(b)return{"kept":v};if(v)return v.x;if(a)return v.y}'
			)
		).toBe(
			"export function q(r,t,e){if(r||t)return{kept:e};if(e)return e.x;if(r)return e.y}"
		);
		expect(
			print(
				'export function q(a,b,v){if(a)return{kept:v};if(b)return{"kept":v}}',
				{ format: { keep_quoted_props: true } }
			)
		).toBe(
			'export function q(t,e,r){if(t)return{kept:r};if(e)return{"kept":r}}'
		);
		// `Object.keys` of an object literal prints its keys, and `.join` of
		// constants the string it makes.
		expect(
			print(
				'export const a=["a","b"].join(),b=Object.keys("ab").join("-"),c=Object.keys({x:1,y:2,1:3,0:4,x:5}),d=Object.keys([1,,2]).join(),e=[1,null,,void 0,"x"].join(""),f=Object.keys({[NaN]:5,[null]:6}).join(),g=Object.keys({__proto__:1,a:2}),h=[x].join(),i=Object.keys({a:f()}),j=[1.5,true].join(void 0),k=Object.keys({get a(){},b(){},["__proto__"]:1})'
			)
		).toBe(
			'export const a="a,b",b="0-1",c=["0","1","x","y"],d="0,2",e="1x",f="NaN,null",g=Object.keys({__proto__:1,a:2}),h=[x].join(),i=Object.keys({a:f()}),j="1.5,true",k=["a","b","__proto__"];'
		);
		// A separator not known stays a call; a key past the last array index
		// keeps its place.
		expect(
			print(
				'export function f(s){return["a","b"].join(s)}export const k=Object.keys({b:1,4294967295:2,4294967294:3}),j=[1,void 0].join(void 0)'
			)
		).toBe(
			'export function f(o){return["a","b"].join(o)}export const k=["4294967294","b","4294967295"],j="1,";'
		);
		// `undefined` folded in reads `void 0`, held in parentheses; `-0` keeps
		// its sign; a member stays a value when called; a derived class keeps
		// private members a base constructor's object would take again.
		expect(
			print(
				"export function f(p){var b=undefined;return[b[p],1]}export function g(p){var b=undefined;return b(p)}export const h=+(-0)"
			)
		).toBe(
			"export function f(n){return[(void 0)[n],1]}export function g(n){return(void 0)(n)}export const h=-0;"
		);
		expect(
			print(
				"export function f(o){var e;o.a();e=o.test;e()}export class C extends B{#x;#m(){}}"
			)
		).toBe(
			"export function f(e){var o;e.a(),(o=e.test)()}export class C extends B{#e;#o(){}}"
		);
		// Values fold in order, past no read folded already; a `const` set
		// still throws; a function that may call itself keeps its return; an
		// unread call whose body opens with a function stays a call.
		expect(
			print(
				"export function f(){var i=0;var log=g;var x=i++;var y=i++;log(y,x)}export function k(){const a=1;a=2;return a}export function m(i){var x=i++;return x**2}"
			)
		).toBe(
			"export function f(){var r=0,n=g,o=r++;n(r++,o)}export function k(){const r=1;return r=2}export function m(r){return(r++)**2}"
		);
		expect(
			print(
				"export var c;(function f(){(a--&&f()).p;return{get p(){c=1}}})();(function(){(function(a){a=a&&(c=2)})()})()"
			)
		).toBe(
			"export var c;!function n(){return(a--&&n()).p,{get p(){c=1}}}(),function(){!function(n){n=n&&(c=2)}()}();"
		);
		// A name set only for its one read keeps the assignment where the
		// name alone would be a direct `eval` or read by `typeof`, or the
		// write throws in its dead zone.
		expect(
			print(
				'export function run(f){"use strict";f=eval;return f("this")}export function t(f){g();f=missing;return typeof f}export function d(){g();x=1;return x;let x}',
				{ mangle: false }
			)
		).toBe(
			'export function run(f){return(f=eval)("this")}export function t(f){return g(),typeof(f=missing)}export function d(){return g(),x=1;let x}'
		);
		// A call printing as what it runs, unread last in a sequence or under
		// `void` or `!`, prints bare.
		expect(
			print(
				"export function u(y,t){t(5),function(e){if(e)return e;t(e)}(y);void function(e){if(e)return t;t(6)}(y);!function(e){if(e)return;t(7)}(y);x=void function(e){t(e)}(y)}"
			)
		).toBe(
			"export function u(t,e){e(5),t||e(t),t||e(6),t||e(7),x=void function(t){e(t)}(t)}"
		);
		// A literal of functions and constants is made where its one read is.
		expect(
			print(
				"export function f(r){var t;t={d:x=>x*2,e:[function(){return 1}]};r.add(t)}export function g(r){var t={a:()=>1};for(;;)r.add(t)}"
			)
		).toBe(
			"export function f(r){r.add({d:r=>r*2,e:[function(){return 1}]})}export function g(r){var t={a:()=>1};for(;;)r.add(t)}"
		);
		expect(
			print("export function f(r){var h;h=r();g(h,h)}", {
				compress: { join_vars: false }
			})
		).toBe("export function f(h){var r;g(r=h(),r)}");
		// Moved to its one read, a function keeps the name `keep_fnames` keeps.
		expect(
			print("(()=>{function spread(a){h(a);return a}g(()=>spread([]))})()", {
				keep_fnames: true
			})
		).toBe("g(()=>function spread(a){return h(a),a}([]));");
	});

	it("should keep a named function a direct eval in a class or function it returns reads", () => {
		const sources = [
			'result = (function f() { return class { static value = eval("typeof f") } })().value;',
			'result = (function f() { return new (class { m() { return eval("typeof f") } })().m() })();',
			'result = (function f() { return function () { return eval("typeof f") } })()();'
		];
		for (const source of sources) {
			/** @type {{ result?: unknown }} */
			const context = {};
			vm.runInNewContext(
				minifyOnePass(source, { compress: {}, mangle: {} }).code,
				context
			);
			expect(context.result).toBe("function");
		}
	});

	it("should wrap or enclose the source, mapping what it printed of it", () => {
		const options = { compress: {}, mangle: {} };
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const wrapped = /** @type {{ code: string, map: EXPECTED_ANY }} */ (
			new SourceProcessor().process(
				"var longName = 1;\nexports.a = longName + g();",
				{ mode: "minify", ...options, wrap: "lib", source: "a.js" }
			)
		);
		expect(wrapped.code).toBe(
			'!function(e){e.a=1+g()}(typeof lib>"u"?lib={}:lib);'
		);
		// Only the source's own names map, from its second line.
		expect(wrapped.map.names).toEqual(["exports", "longName", "g"]);
		expect(wrapped.map.mappings).toBe("aACAA,IAAYC,EAAWC");
		expect(
			minifyOnePass("var x = 1; window.v = x + y;", {
				...options,
				enclose: "y:7"
			}).code
		).toBe("!function(){window.v=8}();");
		expect(
			minifyOnePass("window.v = y;", { ...options, enclose: true }).code
		).toBe("!function(){window.v=y}();");
		// `enclose` goes around `wrap`; a hashbang, no longer first, goes.
		const bare = { compress: false, mangle: false };
		expect(
			minifyOnePass("exports.x = undefined;", {
				...bare,
				wrap: "lib",
				enclose: "window,undefined:window"
			}).code
		).toBe(
			'(function(window,undefined){(function(exports){exports.x=undefined})(typeof lib=="undefined"?lib={}:lib)})(window);'
		);
		expect(
			minifyOnePass("#!/usr/bin/env node\r\nfoo();", { ...bare, enclose: true })
				.code
		).toBe("(function(){foo()})();");
		expect(
			minifyOnePass("#!/usr/bin/env node", { ...bare, wrap: "lib" }).code
		).toBe('(function(exports){})(typeof lib=="undefined"?lib={}:lib);');
	});

	it("should print alone the comments it keeps, however they are chosen", () => {
		const bare = { compress: false, mangle: false };
		const print = (/** @type {string} */ source, /** @type {EXPECTED_OBJECT} */ format) =>
			minifyOnePass(source, { ...bare, format }).code;
		expect(print("/*! a */ f(); /* b */ g();", {})).toBe("/*! a */f();g();");
		expect(print("f(); /*! late */ g();", {})).toBe("f();/*! late */g();");
		expect(print("/* plain */ f();", {})).toBe("f();");
		expect(print("/*! a */ f();", { comments: false })).toBe("f();");
		expect(
			print("/*#__PURE__*/ f(); /* x */ g();", {
				comments: false,
				preserve_annotations: true
			})
		).toBe("/*#__PURE__*/f();g();");
		// A callback is asked only as each comment prints.
		/** @type {string[]} */
		const asked = [];
		expect(
			print("/* keep */ f(); /* drop */ g(); /* keep2 */ h();", {
				comments: (/** @type {unknown} */ _node, /** @type {{ value: string }} */ comment) => {
					asked.push(comment.value);
					return /keep/.test(comment.value);
				}
			})
		).toBe("/* keep */f();g();/* keep2 */h();");
		expect(asked).toEqual([" drop ", " keep2 ", " keep "]);
		// A global pattern is tested only as each prints, its `lastIndex` moving.
		const pattern = /keep/g;
		expect(
			print("/* keep */ f(); /* keep */ g();", { comments: pattern })
		).toBe("f();/* keep */g();");
		expect(pattern.lastIndex).toBe(0);
		expect(
			print("/* keep */ f(); /* keep */ g();", { comments: /keep/y })
		).toBe("f();g();");
		expect(print("  /*! a */ /*! b */", {})).toBe("/*! a */ /*! b */");
		expect(print("/* keep */ f(); /* x */ g();", { comments: "/keep/g" })).toBe(
			"/* keep */f();g();"
		);
		expect(() => print("f();", { nonsense: 1 })).toThrow(
			"`nonsense` is not a supported option"
		);
	});

	it("should keep the names a global pattern keeps, however often it is asked", () => {
		const pattern = /keep/g;
		const { code } = minifyOnePass(
			"function keepMe(){} function keepToo(){} function dropMe(){} g(keepMe, keepToo, dropMe)",
			{ compress: {}, mangle: { keep_fnames: pattern }, keep_fnames: pattern, toplevel: true }
		);
		expect(code).toBe(
			"function keepMe(){}function keepToo(){}function e(){}g(keepMe,keepToo,e);"
		);
		expect(pattern.lastIndex).toBe(0);
	});

	it("should keep a `let` read before its declaration, from any function", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, { compress: {}, mangle: {} }).code;
		// The read throws: it may not print as the value.
		expect(
			print(
				"function f(){ try { g(() => later) } catch (e) {} let later = 1; return later } it(f())"
			)
		).toBe("function f(){try{g(()=>t)}catch(t){}let t=1;return t}it(f());");
		// Read after it, it folds.
		expect(
			print("function f(){ let later = 1; g(() => later); return later } it(f())")
		).toBe("function f(){return g(()=>1),1}it(f());");
	});

	it("should print `Infinity`, `Number` constants and booleans as values reading the same", () => {
		expect(
			minifyOnePass(
				"console.log(Infinity, Number.POSITIVE_INFINITY, -Number.NEGATIVE_INFINITY, Infinity(), new Number.NEGATIVE_INFINITY, delete Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY(), Infinity``)",
				{ compress: {}, mangle: true }
			).code
		).toBe(
			"console.log(1/0,1/0,-(-1/0),(1/0)(),new(-1/0),delete Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY(),(1/0)``);"
		);
		const inFunction = (/** @type {string} */ body) =>
			`function f(b,c,d){${body}}console.log(f(1,2,3),f(0,'',null),f('1',[],{}))`;
		for (const source of [
			"try{Infinity()}catch(e){console.log(e.name)}try{new Infinity}catch(e){console.log(e.name)}console.log(Infinity.toString(), typeof Infinity)",
			"try{Number.POSITIVE_INFINITY()}catch(e){console.log(e.name)}try{new Number.NEGATIVE_INFINITY}catch(e){console.log(e.name)}console.log(Number.POSITIVE_INFINITY.toString(), -Number.NEGATIVE_INFINITY)",
			"try{Infinity``}catch(e){console.log(e.name)}try{class A extends Infinity{}}catch(e){console.log(e.name)}try{(class extends Number.POSITIVE_INFINITY{})}catch(e){console.log(e.name)}",
			"console.log(delete Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)",
			"var x;x=Number.POSITIVE_INFINITY;for(var k in Number.NEGATIVE_INFINITY);console.log(x)",
			// terser's `booleans`: `==` reads a boolean as its number.
			inFunction("return b == true"),
			inFunction("return b != false"),
			inFunction("return b ? true : false"),
			inFunction("return b ? false : true"),
			inFunction("if (b ? true : false) return 1")
		]) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: true });
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should print `Object.keys`, `values` and `entries` of a literal only where nothing writes or hands out `Object`", () => {
		const calls =
			"console.log(Object.keys({a:1,b:2}).join(), Object.values({a:3}).join(), Object.entries({c:4}).join());";
		for (const [source, options] of /** @type {[string, EXPECTED_OBJECT?][]} */ ([
			// Each of these reads `Object` without handing it anywhere.
			[`console.log(typeof Object);${calls}`],
			[`console.log([] instanceof Object);${calls}`],
			[`console.log(Object(1) instanceof Number);${calls}`],
			// These hand it out or may write its methods.
			[`console.log(String(Object).length > 0);${calls}`],
			[`console.log(!Object);${calls}`],
			[`var o={v:Object.keys};console.log(o.v({z:1}).join());${calls}`],
			[`var o={[Object.keys]:1};console.log(Object.keys(o).length);${calls}`],
			[`({v:Object.keys}={v:function(){return ['w']}});${calls}`],
			[`[Object.values]=[function(){return ['w']}];${calls}`],
			[`for (Object.keys of [function(){return ['z']}]);${calls}`],
			[`delete Object.keys;try{${calls}}catch(e){console.log(e.name)}`],
			[`console.log(delete Object.zz);${calls}`],
			[`Object.keys++;try{${calls}}catch(e){console.log(e.name)}`],
			// A literal's keys are known unless a key or value is unknown.
			[
				"console.log(Object.keys(/*c*/{a:1}).join(), Object.keys({a:1}/*d*/).length)",
				{ format: { comments: "all" } }
			],
			["console.log(Object.keys([1,2]).join(), Object.keys('ab').join(), Object.keys(5).length)"],
			["console.log(Object.keys({...{a:1}}).join(), Object.keys({get a(){return 1}}).join(), Object.keys({a(){}}).join())"],
			["console.log(Object.keys({[1+1]:1, [-1]:2, [f()]:3}).join());function f(){return 'q'}"],
			["console.log(Object.keys({[Infinity]:1, [NaN]:2}).join())"]
		])) {
			const { code } = minifyOnePass(source, {
				compress: {},
				mangle: true,
				...options
			});
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should print an unread call's body, a string array split and names given by use, running alike", () => {
		const calls = (/** @type {string} */ body) =>
			`var log=[];function b(){log.push('b')}function c(){log.push('c')}function g(a){${body}}g(0);g(1);g(null);console.log(log.join())`;
		const names = (/** @type {number} */ count, /** @type {string} */ prefix) =>
			Array.from({ length: count }, (_, i) => `${prefix}${i}`);
		const busy = names(70, "longName");
		const many = names(60, "q");
		const strings = (/** @type {(i: number) => string} */ element) =>
			`[${Array.from({ length: 120 }, (_, i) => element(i)).join(",")}]`;
		for (const [source, options] of /** @type {[string, EXPECTED_OBJECT?][]} */ ([
			// An unread call prints its first `if`'s test, then `||` and the rest.
			[calls("(function(){if(a)return;b();c()})()")],
			[calls("(function(){if(a)return})()")],
			[calls("(function(){if(a)return;'x';b()})()")],
			[calls("(function(){if(a){return}b()})()")],
			[calls("(function(){if(a=a)return;b()})()")],
			[calls("(function(){if(a??0)return;b()})()")],
			[calls("(function(){if(a)return;0,b()})()")],
			// A function a call returns from prints as its value.
			[
				"function f(){var t=function(){return {a:1}};t().a++}f();console.log(1)"
			],
			[
				"function f(){var t=function(){return 1};++t().a}try{f()}catch(e){console.log(e.name)}"
			],
			// A `var` set after the call that reads it is no constant there.
			["function h(){g();var v=1;function g(){console.log(v)}console.log(v)}h()"],
			["try{new RegExp('a', 5)}catch(e){console.log(e.name)}"],
			// Enough strings print as one split, on a delimiter none holds.
			[
				`var a = ${strings((i) => `'${String.fromCharCode(65 + (i % 26))}'`)}; console.log(a.length, a[5])`
			],
			[
				`var a = ${strings((i) => `'w${i}'`).slice(0, -1)}, 1]; console.log(a.length, a[5])`
			],
			[
				`var a = ${strings((i) => `'w${i}'`).slice(0, -1)}, b]; var b; console.log(a.length, a[5])`
			],
			// The busiest names take the shortest, where that saves enough.
			[
				`function f(p){var ${busy.map((x, i) => `${x}=p+${i}`).join(",")};return [${busy.map((x) => `${x},${x},${x},${x},${x}`).join(",")}].join()}console.log(f(1))`
			],
			// A private name a direct `eval` reads is kept, and taken by no other.
			[
				`class A{${[..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$"]
					.map((letter, i) => `#${letter}=${i};`)
					.join(
						""
					)}m(){return eval('this.#e')}}class B{#veryLong=1;get(){return this.#veryLong}}console.log(new A().m(), new B().get())`
			],
			// An array read at a known index prints as the element only where it reads alike.
			[
				"console.log([1][0].toString(), [this][0] === this, [function(){return 2}()][0].toFixed())"
			],
			["var a, b; console.log(0 || ([a] = [1]), a, 1 && ({b} = {b:2}), b)"],
			["function f(a,c){return c?a/*x*/:a}console.log(f(1,1))", { format: { comments: "all" } }],
			// `??` mixed with `&&` or `||` keeps its parentheses.
			["function f(b,c,d){var t=b??c;return t&&d}console.log(f(1,2,3),f(null,0,1))"],
			["function f(b,c,d){var t=b&&c;return t??d}console.log(f(1,2,3),f(0,null,1))"],
			["function f(){function g(s){return s[0]}return g`x`}console.log(f())"],
			// A function expression's name is its scope's under ie8.
			["var f=function g(a,b){return typeof g};console.log(f())", { ie8: true }],
			[
				`var x = (function(){ var ${many.map((x, i) => `${x}=${i}`).join(",")}; return function g(z){return z + ${many.join("+")} + typeof g}})(); console.log(x(1))`
			]
		])) {
			const { code } = minifyOnePass(source, {
				compress: {},
				mangle: true,
				...options
			});
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should keep a comment before a value from breaking the line after `return` or `throw`", () => {
		const all = { compress: {}, mangle: true, format: { comments: "all" } };
		for (const [source, expected] of [
			// An `if` printing as `return t?a:b` parenthesizes a test comments precede.
			[
				"function h(c){if(//c\nc){return 1}else{return 2}}console.log(h(0),h(1))",
				"function h(e){return(//c\ne)?1:2}console.log(h(0),h(1));"
			],
			[
				"function h(c){if(/*c\n*/c.x)return c;return 2}console.log(h({x:1}).x,h({}))",
				"function h(c){return(\n/*c\n*/\nc.x)?c:2}console.log(h({x:1}).x,h({}));"
			],
			// A `new` printing as a call opens with its callee, whose comments go first.
			["throw ( new //c\n Error ( 'x' ) )", '//c\nthrow Error("x");'],
			[
				"function f(){return new //c\nError('x')}console.log(f().message)",
				'function f(){//c\nreturn Error("x")}console.log(f().message);'
			]
		]) {
			const { code } = minifyOnePass(source, all);
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		// A license comment is kept by default, so it breaks the line alike.
		const source =
			"function h(c){if(//@license\nc){return 1}else{return 2}}console.log(h(0),h(1))";
		expect(
			runProgram(minifyOnePass(source, { compress: {}, mangle: true }).code)
		).toBe("2 1");
	});

	it("should print as `quote_keys`, `inline_script`, `inlinesNames` and import phases ask", () => {
		for (const [source, options, expected] of /** @type {[string, EXPECTED_OBJECT, string][]} */ ([
			["var o={a:1};console.log(o.a)", { format: { quote_keys: true } }, 'var o={"a":1};console.log(o.a);'],
			// A shorter exponent moves the fraction's digits before it.
			["console.log(1.5e-7, 2.25e30)", {}, "console.log(15e-8,2.25e30);"],
			[
				"import defer * as ns from './x.js'; console.log(ns)",
				{ module: true },
				'import defer*as o from"./x.js";console.log(o);'
			],
			[
				"console.log(import.defer('./x'), import.source('./y'))",
				{ module: true },
				'console.log(import.defer("./x"),import.source("./y"));'
			],
			// A directive spelled with escapes stays as written.
			["'\\x75se strict';console.log(1)", { format: { inline_script: false } }, "'\\x75se strict';console.log(1);"],
			// An escaped `\\<` gives its backslash up to the `\\x3c` replacing it.
			["'\\<!--';console.log(1)", {}, "'\\x3c!--';console.log(1);"],
			// A reserved list may be a set, as terser reads it; anything else reserves nothing.
			["function f(aaa){return aaa}f(1)", { mangle: { reserved: new Set(["a"]) } }, "function f(f){return f}f(1);"],
			["function f(aaa){return aaa}f(1)", { mangle: { reserved: "a" } }, "function f(a){return a}f(1);"],
			// Names printed in their parents' text, as a walk that skips them asks.
			[
				"var a = (b), c = d.e; f(a, (g), new (h)); (i)`x`",
				{ compress: undefined, mangle: undefined, inlinesNames: true },
				"var a=b,c=d.e;f(a,g,new h);i`x`;"
			]
		])) {
			expect(
				minifyOnePass(source, { compress: {}, mangle: true, ...options }).code
			).toBe(expected);
		}
		// Each name printed so is mapped, as its parent prints it.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const inlinesNames = /** @type {EXPECTED_OBJECT} */ ({ inlinesNames: true });
		const mapped = /** @type {{ code: string, map: EXPECTED_ANY }} */ (
			new SourceProcessor().process("a ( b )", {
				mode: "minify",
				...inlinesNames,
				source: "in.js"
			})
		);
		expect(mapped.map).toEqual(expect.objectContaining({ names: ["a", "b"] }));
	});

	describe("mangling properties in one pass", () => {
		const PROPERTY_SOURCES = [
			'var o = { zAlpha: 1, "zGamma": 3, 4: "four", zNested: { zDeep: 5 } }; o.zDelta = o.zAlpha + 1; o["zEpsilon"] = 6; console.log(o.zAlpha, o.zGamma, o[4], o.zNested.zDeep, o.zDelta, o.zEpsilon, "zDelta" in o, "zZeta" in o);',
			'class Base { constructor(v) { this.zValue = v; } get zDoubled() { return this.zValue * 2; } set zDoubled(v) { this.zValue = v / 2; } zMethod() { return this.zValue + 1; } static zCreate(v) { return new Base(v); } } class Child extends Base { zField = 3; static zCount = 0; ["zComputed"]() { return this.zField; } #zSecret = 4; get zBoth() { return this.#zSecret + this.zField; } } const c = new Child(4); c.zDoubled = 20; console.log(c.zValue, c.zDoubled, c.zMethod(), c.zComputed(), Child.zCount, Base.zCreate(2).zMethod(), c.zBoth);',
			"function f({ zFirst, zSecond: renamed, zThird = 3, ...rest }) { return [zFirst, renamed, zThird, rest.zFourth]; } const { zFirst, zSecond } = { zFirst: 1, zSecond: 2 }; let a, b; ({ zA: a, zB: b = 5 } = { zA: 7 }); console.log(f({ zFirst: 1, zSecond: 2, zFourth: 4 }).join(), zFirst, zSecond, a, b);",
			"(function () { var zAlpha = 1, zBeta = { zAlpha: 2 }; function h({ zAlpha = 3, zBeta: g }) { return zAlpha + g; } var o = { zAlpha, zBeta, zSum() { return this.zAlpha; } }; console.log(o.zAlpha, o.zBeta.zAlpha, o.zSum(), h({ zAlpha: 4, zBeta: 5 }), h({ zBeta: 6 })); })();",
			'var conf = { "zQuoted": 1, zPlain: 2 }; conf["zQuoted"] += 1; conf.zPlain += conf["zQuoted"]; console.log(conf["zQuoted"], conf.zPlain);',
			'var o = { toString() { return "custom"; }, valueOf() { return 42; }, length: 3, zLen: 4, innerHTML: 5 }; var base = { zInherited: 1 }; var p = { __proto__: base, zOwn: 2 }; console.log(String(o), o + 1, o.length, o.zLen, o.innerHTML, [1, 2].map(function (v) { return v * 2; }).join(), p.zInherited, p.zOwn, Object.getPrototypeOf(p) === base);',
			'var o = { /*@__MANGLE_PROP__*/ zMarked: 1, zUnmarked: 2, _zUnder: 3 }; Object.defineProperty(o, "zDefined", { value: 4, enumerable: true }); console.log(o.zMarked, o.zUnmarked, o._zUnder, o["_zUnder"], o.zDefined, "zDefined" in o);',
			'var o = { zA: { zB: 1 } }; function* g() { yield o.zA; yield (yield).zA; } var it = g(); var t = function () { return o; }; class P { #zP = 1; static zHas(x) { return #zP in x; } } var x = 0; console.log(o.zA?.zB, (o).zA.zB, it.next().value.zB, typeof o.zA, t`a`.zA.zB, void o.zA, -o.zA.zB, ++x.zN, [o][0].zA.zB, new P().zP, (1, o).zA.zB, /*@__MANGLE_PROP__*/ o.zA.zB, /*@__MANGLE_PROP__*/ t().zA, /*@__MANGLE_PROP__*/ o["zA"], P.zHas(new P()), "zA" in o, o[/*@__KEY__*/ "zA"].zB, typeof globalThis.zG, o.zA["zB"], /* plain */ o.zA.zB, (o?.zA).zB, [, o.zA][1].zB, o[(0, "zA")].zB, Q.zS); switch (x) { case o.zA: break; } class Q { static ["zS" + "t"] = 1; static get zS() { return Q.zSt; } }',
			'var o = {}; Object.defineProperty(o, "zDef", { value: 1 }); Object["defineProperty"](o, "zIdx", { value: 2 }); console.defineProperty = function () {}; console.defineProperty(o, "zNot"); Object?.defineProperty(o, "zOpt", { value: 3 }); (async function () { return (await o).zDef; })(); console.log(o.zDef, o.zIdx, o.zOpt, o["zIdx"], o?.zIdx, o[0 ? "zDef" : "zIdx"]);',
			'var k = "zDyn"; var o = { ["zLit"]: 1, [k]: 2, ["zA" + "zB"]: 3 }; o.zLit2 = o["zLit"]; function pick(c) { return o[c ? "zLit" : "zLit2"]; } console.log(o.zLit, o.zLit2, o.zAzB, o["zA" + "zB"], pick(true), pick(false), o?.["zLit"], globalThis.zGlobal);'
		];
		/** @type {{ keep_quoted?: boolean | "strict", reserved?: string[], regex?: RegExp | string, debug?: boolean | string, undeclared?: boolean, only_annotated?: boolean }[]} */
		const PROPERTY_OPTIONS = [
			{},
			{ keep_quoted: true },
			{ keep_quoted: "strict" },
			{ reserved: ["zAlpha", "zValue"] },
			{ regex: /^_/ },
			{ regex: "^(zAlpha|zLit|zValue)$" },
			{ debug: true },
			{ debug: "S" },
			{ undeclared: true },
			{ only_annotated: true },
			{ only_annotated: true, regex: /^zU/ }
		];

		it("should rename properties and run alike", () => {
			for (const source of PROPERTY_SOURCES) {
				for (const given of PROPERTY_OPTIONS) {
					const { code } = minifyOnePass(source, {
						compress: {},
						mangle: { properties: { ...given, cache: { props: new Map() } } }
					});
					// Strictly, a name read quoted and bare is the source's to keep
					// apart, which these do not.
					if (given.keep_quoted !== "strict") {
						expect(runProgram(code)).toBe(runProgram(source));
					}
				}
			}
		});

		it("should read a `defineProperty` call with no name as no name", () => {
			const { code } = minifyOnePass(
				"var o = read(); Object.defineProperty(o); sink(o.zKey);",
				{ compress: {}, mangle: { properties: {} } }
			);
			expect(code).toBe("var o=read();Object.defineProperty(o),sink(o.o);");
		});

		it("should print a key renamed apart from the name its shorthand reads", () => {
			const { code } = minifyOnePass(
				"var zKey = read(); var { zOther } = zKey; sink({ zKey, zOther });",
				{ compress: {}, mangle: { properties: {} } }
			);
			expect(code).toBe("var zKey=read(),{K:zOther}=zKey;sink({h:zKey,K:zOther});");
			const shorthand = minifyOnePass(
				"function f({ zKey, zOther = 1 }, zLast) { return { zKey, zOther, zLast }; } sink(f({ zKey: 1 }, 2).zLast);",
				{ ecma: 2020, compress: {}, mangle: { properties: {} } }
			).code;
			expect(shorthand).toBe(
				"function f({t:zKey,K:zOther=1},z){return{t:zKey,K:zOther,L:z}}sink(f({t:1},2).L);"
			);
		});

		it("should keep a computed key kept quoted together with its reads", () => {
			const { code } = minifyOnePass(
				'class A { ["zKept"]() { return 1; } zRenamed() { return 2; } } var a = new A(); console.log(a.zKept(), a.zRenamed());',
				{ compress: {}, mangle: { properties: { keep_quoted: true } } }
			);
			expect(code).toContain('["zKept"]()');
			expect(code).toContain("a.zKept()");
			expect(code).not.toContain("zRenamed");
			expect(runProgram(code)).toBe("1 2");
		});

		it("should read and write the property names a name cache holds", () => {
			const nameCache = { props: { props: { $zFooBar: "x" } } };
			const codes = [
				"var o = { zFooBar: 1, zBazQux: 2 }; console.log(o.zFooBar, o.zBazQux);",
				"var p = { zBazQux: 3, zOther: 4 }; console.log(p.zBazQux, p.zOther);"
			].map(
				(source) =>
					minifyOnePass(source, {
						nameCache,
						compress: {},
						mangle: { cache: null, properties: {} }
					}).code
			);
			expect(codes[0]).toContain("{x:1,");
			expect(nameCache).toEqual({
				props: { props: { $zFooBar: "x", $zBazQux: "o", $zOther: "p" } }
			});
			expect(codes.map(runProgram)).toEqual(["1 2", "3 4"]);
		});

		it("should rename a property the cache hands another, and keep to the cache where asked", () => {
			const source = "var o={zFoo:1,zQux:2};console.log(o.zFoo,o.zQux)";
			for (const [options, expected] of /** @type {[EXPECTED_OBJECT, string][]} */ ([
				// The name the cache hands `zFoo` is renamed where the source has it.
				[
					{ mangle: { properties: {} }, nameCache: { props: { props: { $zFoo: "zQux" } } } },
					"var o={zQux:1,o:2};console.log(o.zQux,o.o);"
				],
				[
					{ mangle: { properties: { only_cache: true } }, nameCache: { props: { props: { $zFoo: "q" } } } },
					"var o={q:1,zQux:2};console.log(o.q,o.zQux);"
				],
				// A debug name taken already is no debug name.
				[
					{ mangle: { properties: { debug: true, reserved: ["_$zFoo$_"] } } },
					"var o={o:1,_$zQux$_:2};console.log(o.o,o._$zQux$_);"
				],
				// What the cache holds under a key not written as its own is not read.
				[
					{ mangle: { properties: {} }, nameCache: { props: { props: { zFoo: "x" } } } },
					"var o={o:1,l:2};console.log(o.o,o.l);"
				],
				[
					{ mangle: { properties: true }, nameCache: { vars: {} } },
					"var o={o:1,l:2};console.log(o.o,o.l);"
				]
			])) {
				const { code } = minifyOnePass(source, { compress: {}, ...options });
				expect(code).toBe(expected);
				expect(runProgram(code)).toBe("1 2");
			}
		});
	});
});

describe("JavaScript SourceProcessor printing", () => {
	const { SourceProcessor } = require("../../../lib/javascript/syntax");

	it("should print the whole source while visitors skip and stop", () => {
		/** @type {string[]} */
		const seen = [];
		const result = new SourceProcessor()
			.use({
				[NodeType.FunctionDeclaration]: {
					enter: (path) => {
						seen.push(`function ${path.name(path.field(0, Field.id))}`);
						path.skipChildren();
					}
				},
				[NodeType.Identifier]: (path) => {
					seen.push(path.name());
					if (path.name() === "stop") path.stop();
				}
			})
			.process(
				"function f(a) { return a + 1 } g(f); stop(); function h() { b }",
				{ mode: "minify" }
			);
		expect(seen).toEqual(["function f", "g", "f", "stop"]);
		expect(result).toEqual({
			code: "function f(a){return a+1}g(f);stop();function h(){b}",
			map: undefined
		});
	});

	it("should refuse a walk a visitor starts while another runs", () => {
		const {
			parsedTree,
			walkSyntaxTree
		} = require("../../../lib/javascript/syntax-parser");
		expect(() =>
			new SourceProcessor()
				.use({
					[NodeType.CallExpression]: (path) => {
						walkSyntaxTree(
							/** @type {import("../../../lib/javascript/syntax-parser").SyntaxTree} */ (
								parsedTree()
							),
							path.node,
							"f()",
							[],
							undefined
						);
					}
				})
				.process("f()", {})
		).toThrow("process() is already running");
	});

	it("should print one source after another, and a source anew after a parse error", () => {
		const processor = new SourceProcessor();
		expect(processor.process("a ( 1 )", { mode: "minify" }).code).toBe(
			"a(1);"
		);
		expect(() => processor.process("a(", { mode: "minify" })).toThrow(
			/Unexpected token/
		);
		expect(
			processor.process("let  x = [ 1 , 2 ]", { mode: "minify" }).code
		).toBe("let x=[1,2];");
	});

	it("should map each node's output to the source's", () => {
		const result = new SourceProcessor().process("a ( 1 )", {
			mode: "minify",
			source: "in.js"
		});
		expect(result.code).toBe("a(1);");
		// `a` at 0:0, named, and `1` from column 4 to column 2.
		expect(result.map).toEqual(
			expect.objectContaining({
				sources: ["in.js"],
				names: ["a"],
				mappings: "AAAAA,EAAI"
			})
		);		// A name read twice is given once.
		expect(
			new SourceProcessor().process("a ( a, b )", {
				mode: "minify",
				source: "in.js"
			}).map
		).toEqual(
			expect.objectContaining({
				names: ["a", "b"],
				mappings: "AAAAA,EAAIA,EAAGC"
			})
		);
	});

	it("should beautify: each statement, member and case on a line of its own", () => {
		const source =
			"function f(a,b){if(a){return b in a}for(;;)x()} class A{m(){}} switch(x){case 1:y();break;case 2:w();break;default:z()} const o={a:1,b:[2,3]};";
		const print = (/** @type {object} */ options) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(source, {
					mode: "beautify",
					...options
				})
			).code;
		expect(print({})).toBe(
			"function f(a, b) {\nif (a) {\nreturn b in a;\n}\nfor (;;) x();\n}\nclass A {\nm() {}\n}\nswitch (x) {\ncase 1:\ny();\nbreak;\ncase 2:\nw();\nbreak;\ndefault:\nz();\n}\nconst o = {a: 1, b: [ 2, 3 ]};"
		);
		// Minified as it is beautified, the layout is the same.
		expect(print({ compress: {}, mangle: {} })).toBe(
			"function f(a, c) {\nif (a) return c in a;\nfor (;;) x();\n}\nclass A {\nm() {}\n}\nswitch (x) {\ncase 1:\ny();\nbreak;\ncase 2:\nw();\nbreak;\ndefault:\nz();\n}\nconst o = {a: 1, b: [ 2, 3 ]};"
		);
	});

	it("should print an event handler's body without the semicolon its brace closes", () => {
		const print = (/** @type {string} */ source) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(source, {
					mode: "minify",
					sourceType: "event-handler"
				})
			).code;
		expect(print("x(); return new.target")).toBe("x();return new.target");
		expect(print("for (;;);")).toBe("for(;;);");
	});
});

describe("JavaScript minifier reading an event handler's body", () => {
	it("should compress a body inside its function in one pass", () => {
		const source = "var v = 5; value = v; return value == null ? undefined : v";
		const onePass = minifyOnePass(source, {
			compress: {},
			mangle: {},
			sourceType: "event-handler"
		});
		expect(onePass.code).toBe("var v=5;return(value=v)==null?void 0:v");
	});
});

describe("JavaScript minifier mangling a SyntaxTree", () => {
	it("should move catch parameters to their function under ie8 or safari10 in the one pass", () => {
		const source =
			"function t(a, b) { try { a() } catch (e) { b(e) } var c = b; return c }";
		expect(minifyOnePass(source, { compress: {}, mangle: {} }).code).toBe(
			"function t(c,t){try{c()}catch(c){t(c)}return t}"
		);
		for (const options of [
			{ ie8: true },
			{ safari10: true },
			{ mangle: { ie8: true } },
			{ mangle: { safari10: true } }
		]) {
			expect(
				minifyOnePass(source, { compress: {}, mangle: {}, ...options }).code
			).toBe("function t(c,t){try{c()}catch(a){t(a)}return t}");
		}
	});

	it("should keep a loop's names off its function's under safari10 in the one pass", () => {
		const shadowing =
			"function f(a) { var s = 0; for (let a = 0; a < 3; a++) s += a; for (const k of [1, 2]) s += k; return s + a }";
		expect(minifyOnePass(shadowing, { compress: {}, mangle: {} }).code).toBe(
			"function f(a){var f=0;for(let a=0;a<3;a++)f+=a;for(let a of[1,2])f+=a;return f+a}"
		);
		for (const options of [{ safari10: true }, { mangle: { safari10: true } }]) {
			expect(
				minifyOnePass(shadowing, { compress: {}, mangle: {}, ...options }).code
			).toBe(
				"function f(a){var f=0;for(let o=0;o<3;o++)f+=o;for(let o of[1,2])f+=o;return f+a}"
			);
		}
		// The block around the loop prints without braces, so the loop is the function's.
		const unbraced =
			"function f(a, list) { a = g(a); if (list) { for (const s of list) h(s) } return a }";
		expect(minifyOnePass(unbraced, { compress: {}, mangle: {} }).code).toBe(
			"function f(s,t){s=g(s);if(t)for(let s of t)h(s);return s}"
		);
		expect(
			minifyOnePass(unbraced, { compress: {}, mangle: {}, safari10: true }).code
		).toBe("function f(s,t){s=g(s);if(t)for(let f of t)h(f);return s}");
	});

	it("should keep the global names ie8 keeps, and print as ie8 and safari10 ask, in the one pass", () => {
		const source =
			"x = [undefined, Infinity, o.default, '\\v']; if (a) do b(); while (c); else d(); async function f(x) { return !await x }";
		expect(minifyOnePass(source, { compress: {}, mangle: {} }).code).toBe(
			'x=[void 0,1/0,o.default,"\\v"];if(a)do{b()}while(c);else d();async function f(n){return!await n}'
		);
		expect(
			minifyOnePass(source, { compress: {}, mangle: {}, ie8: true }).code
		).toBe(
			'x=[undefined,Infinity,o["default"],"\\x0B"];if(a){do{b()}while(c)}else d();async function f(n){return!await n}'
		);
		expect(
			minifyOnePass(source, { compress: {}, mangle: {}, safari10: true }).code
		).toBe(
			'x=[void 0,1/0,o.default,"\\v"];if(a)do{b()}while(c);else d();async function f(n){return!(await n)}'
		);
	});

	it("should keep a sloppy block's function in its block where a lexical name would clash, in the one pass", () => {
		const source = [
			"function t1(){ let f = 1; { function f() { return 2 } } return typeof f }",
			"function t2(){ { let f = 1; { function f(){} } return typeof f } }",
			"function t3(x){ switch (x) { case 1: let g = 1; { function g(){} } return typeof g } }",
			"function t4(){ for (let h of [1]) { { function h(){} } return typeof h } }",
			"function t5(){ for (let i = 0; i < 1; i++) { { function i(){} } return typeof i } }",
			"function t6(){ for (const j in {a: 1}) { { function j(){} } return typeof j } }",
			"function t7(){ try { throw { a: [1, 2] } } catch ({ a: [b = 1, ...c], d: e }) { { function c(){} } return typeof c } }",
			"function t8(){ try { throw 1 } catch (e) { let k = 1; { function k(){} } return typeof k } }",
			"function t9(p) { { function p(){} } return typeof p }",
			"function t10({ q }) { { function q(){} } return typeof q }",
			"function t11() { { function s(){} } return typeof s }",
			"function t12() { class u {} { function u(){} } return typeof u }",
			"function t13([v = 1]) { { function v(){} } return typeof v }",
			"function t14(...w) { { function w(){} } return typeof w }",
			"function t15(){ for (;;) { { function z(){} } return typeof z } }",
			"function t16(x){ switch (x) { case 1: let o; break; case 2: { function g2(){} } return typeof g2 } }",
			"function t17(){ for (var k in {a: 1}) { { function k2(){} } return typeof k2 } }",
			"function t18(){ try { throw 1 } catch (e) { { function e2(){} } return typeof e2 } }",
			"function t19(){ try { throw 1 } catch (e) { var e = 2; return e } }",
			"function t20(){ try { throw [1, 2] } catch ([, h]) { { function h(){} } return typeof h } }",
			"function t21(){ try { throw {} } catch ({ ...r }) { { function r(){} } return typeof r } }",
			"function t22(){ var o = {a: 1}, p = {b: 2}, a = 0, b = 0; with (o) { with (p) { return a + b } } }",
			"console.log(t1(), t2(), t3(1), t4(), t5(), t6(), t7(), t8(), t9(1), t10({}), t11(), t12(), t13([]), t14(), t15(), t16(2), t17(), t18(), t19(), t20(), t21(), t22());"
		].join("\n");
		expect(runProgram(source)).toBe(
			"number number number number number string object number number undefined function function number object function function function function 2 number object 3"
		);
		for (const options of [
			{ compress: {}, mangle: true },
			{ compress: false, mangle: true },
			{ compress: {}, mangle: false }
		]) {
			expect(runProgram(minifyOnePass(source, options).code)).toBe(
				runProgram(source)
			);
		}
	});

	it("should keep the names asked for, and give the busiest names the shortest, in the one pass", () => {
		expect(
			minifyOnePass(
				"function outer(){ function inner(){} function other(){} class K {} class L {} var keepFn = function(){}, dropFn = () => 1, named = function n(){}, [d] = [], u; let KCls = class {}, LCls = class {}, M = class N {}, y = 1; return [inner, other, K, L, keepFn, dropFn, named, d, u, KCls, LCls, M, y] } outer()",
				{ compress: false, mangle: { keep_fnames: /inner|keepFn/, keep_classnames: /K/ } }
			).code
		).toBe(
			"function outer(){function inner(){}function n(){}class K{}class e{}var keepFn=function(){},s=()=>1,o=function n(){},[r]=[],t;let KCls=class{},c=class{},l=class n{},u=1;return[inner,n,K,e,keepFn,s,o,r,t,KCls,c,l,u]}outer();"
		);
		expect(
			minifyOnePass("function outer(){ var a = 1, b = 2; return a + b } outer()", {
				compress: false,
				mangle: { reserved: ["n", "t"] }
			}).code
		).toBe("function outer(){var r=1,u=2;return r+u}outer();");
		// Past the one-letter names, the name read most takes one of them.
		const names = Array.from({ length: 70 }, (_, i) => `v${i}`);
		const source = `function g(i) { return i } function h(...a) { console.log(a.length, a[a.length - 1]) } function f(){ var ${names
			.map((name, i) => `${name}=g(${i})`)
			.join(",")}; h(${names.join(",")}); h(${Array(300).fill("v69").join(",")}); } f()`;
		const { code } = minifyOnePass(source, { compress: {}, mangle: true });
		expect(code).toMatch(/h\(([\w$])(?:,\1){299}\)/);
		expect(runProgram(code)).toBe(runProgram(source));
		expect(runProgram(code)).toBe("70 69\n300 69");
	});

	it("should run as the source runs under ie8 or safari10 in the one pass", async () => {
		const sources = [
			"var out = []; function f(a) { try { throw a + 1 } catch (e) { out.push(e); var g = function () { return e } } return g() } var x = 5; out.push(f(x), x); result = out.join();",
			"result = (function () { var n = 4; function h() { var a = 1, b = 2; try { null.x } catch (err) { return typeof err + a + b + n } } return h() })();",
			"result = (function () { var e = 'outer'; function q() { try { throw 'in' } catch (e) { return e } } return q() + e })();",
			"result = (function () { var o = []; try { throw 1 } catch (e) { try { throw 2 } catch (f) { o.push(e, f) } } return o.join() })();",
			"result = (function () { function k() { var longName = 1; try { throw 2 } catch (other) { var inner = other + longName } return inner } return k() })();",
			"result = (function () { try { throw [1, 2] } catch ({ length: n, 0: z }) { return n + z } })();",
			// Moved into the catch, the arrow would read the catch's `e`.
			"result = (function () { function k() { let e = 1; const g = () => e; try { throw 2 } catch (e) { return g() } } return k() })();",
			"result = (function () { var fns = []; for (let i = 0; i < 3; i++) { const j = i * 2; fns.push(() => i + j) } return fns.map(f => f()).join() })();",
			"result = (function (a) { var s = 0; for (let a = 0; a < 3; a++) s += a; for (const k of [1, 2]) s += k; for (let p in { x: 1 }) s += p; return s + a })(10);",
			"result = (async function () { var s = []; for (let i = 0; i < 3; i++) { s.push(await Promise.resolve(i)) } for (const v of [4, 5]) { await null; s.push(() => v) } return s.map(x => typeof x === 'function' ? x() : x).join() })();",
			"result = (function () { function w(p) { var acc = []; for (let i = 0; i < p.length; i++) { let v = p[i]; acc.push(function () { return v + i }) } try { throw acc } catch (z) { return z.map(function (f) { return f() }).join() } } return w([3, 4, 5]) })();"
		];
		/**
		 * @param {string} code a script setting `result`
		 * @returns {Promise<unknown>} what it sets `result` to, awaited
		 */
		const run = async (code) => {
			/** @type {{ result: unknown, Promise: PromiseConstructor }} */
			const context = { result: undefined, Promise };
			vm.runInNewContext(code, context);
			return await context.result;
		};
		for (const options of [
			{ ie8: true },
			{ safari10: true },
			{ mangle: { ie8: true, safari10: true } }
		]) {
			for (const source of sources) {
				const expected = await run(source);
				const printed = minifyOnePass(source, {
					compress: {},
					mangle: {},
					...options
				});
				expect(await run(printed.code)).toEqual(expected);
			}
		}
	});

	it("should not read an outer name where a catch parameter of its name shadows it, in the one pass", () => {
		const sources = [
			"function k(e) { let a = e; try { throw 2 } catch (e) { return a } } result = k(1);",
			"function k(e) { let a = e; try { throw 2 } catch (e) { return a + e } } result = k(1);",
			"function k(e) { let a = e, b = a; try { throw 2 } catch (e) { return b + e } } result = k(1);",
			"function k(e) { let a = e; g(a); try { throw 2 } catch (e) { return a } } function g() {} result = k(1);",
			"function k(e) { const f = function () { return e }; try { throw 2 } catch (e) { return f() + e } } result = k(1);"
		];
		for (const source of sources) {
			/** @type {{ result?: unknown }} */
			const expected = {};
			vm.runInNewContext(source, expected);
			for (const mangle of [{}, false]) {
				/** @type {{ result?: unknown }} */
				const context = {};
				vm.runInNewContext(
					minifyOnePass(source, { compress: {}, mangle }).code,
					context
				);
				expect(context.result).toBe(expected.result);
			}
		}
	});

	it("should refuse a node its scope analysis cannot read", () => {
		const tree = new SyntaxTree();
		const program = tree.addEstree(
			/** @type {EXPECTED_ANY} */ (WebpackParser.parse("a;", {}))
		);
		const types = Uint8Array.from(tree._types);
		types[tree.field(0, Field.body, program)] = 255;
		expect(() =>
			analyzeMinifierTree(tree, program, types, {}, () => {
				throw new Error("unreachable");
			})
		).toThrow("The minifier's scope analysis cannot read a node of type 255");
	});

	it("should read a `with`, a loop and a catch where no option asks for more", () => {
		const tree = new SyntaxTree();
		const program = tree.addEstree(
			/** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(
					"with(o){a; var b}for(;;)break;while(0);try{}catch(e){e}",
					{ ecmaVersion: "latest" }
				)
			)
		);
		const analysis = analyzeMinifierTree(
			tree,
			program,
			Uint8Array.from(tree._types),
			{},
			() => {
				throw new Error("unreachable");
			}
		);
		expect(analysis.aliases).toBeNull();
		expect(analysis.spelledNames).toBeNull();
		expect([...analysis.globals.keys()]).toEqual(["o", "a"]);
	});
});

const jsMinify = require("../../../lib/javascript/jsMinify");

/** @typedef {import("../../../lib/javascript/jsMinify")} JsMinify */

const SCRIPT = `
/*! @license MIT - keep me */
// a line comment
"use strict";
function unusedHelper(a, b) { return a + b; }
sink(function outer() {
	let list = [1, 2, 3].map((value) => value + 1);
	if (list.length > 0) { console.log(list); } else { console.log("empty"); }
	return list;
});
`;

const MODULE = `
/*! @preserve banner */
import { readFile } from "node:fs/promises";
export async function read(path) {
	let text = await readFile(path, "utf8");
	return text.length > 0 ? text : null;
}
`;

const HANDLER = 'if (window.x) { console.log("clicked", event); } else { alert("no"); }';

const INPUT_MAP = {
	version: 3,
	sources: ["input.js"],
	names: [],
	mappings: ""
};

/**
 * Every comment-selection shape the plugin accepts, paired with the source and
 * production it is exercised against.
 * @type {[string, { [file: string]: string }, import("terser").MinifyOptions & { as?: "script" | "module" | "event-handler" }, EXPECTED_ANY][]}
 */
const MINIFY_CASES = [
	["defaults", { "script.js": SCRIPT }, { compress: {} }, true],
	["extraction off", { "script.js": SCRIPT }, { compress: {} }, false],
	["extract by pattern", { "script.js": SCRIPT }, {}, /@license/],
	["extract by condition", { "script.js": SCRIPT }, {}, { condition: "some" }],
	["extract nothing named", { "script.js": SCRIPT }, {}, { condition: false }],
	["keep every comment", { "script.js": SCRIPT }, { format: { comments: "all" } }, false],
	["keep no comment", { "script.js": SCRIPT }, { format: { comments: false } }, true],
	["deprecated output spelling", { "script.js": SCRIPT }, { output: { comments: "all" } }, false],
	["compress off", { "script.js": SCRIPT }, { compress: false }, true],
	["mangle off", { "script.js": SCRIPT }, { mangle: false }, true],
	["ecma 5", { "script.js": SCRIPT }, { ecma: 5 }, true],
	["module goal", { "module.mjs": MODULE }, { as: "module" }, true],
	["module option", { "module.mjs": MODULE }, { module: true }, true],
	["event handler", { "handler.js": HANDLER }, { as: "event-handler" }, true],
	["script goal", { "script.js": SCRIPT }, { as: "script" }, true],
	["extract every comment named", { "script.js": SCRIPT }, {}, { condition: true }],
	["extract by an object naming no condition", { "script.js": SCRIPT }, {}, {}],
	["keep every comment, as `true`", { "script.js": SCRIPT }, { format: { comments: true } }, false],
	[
		"keep and extract by predicate",
		{ "script.js": SCRIPT },
		{ format: { comments: (_node, comment) => /kept/.test(comment.value) } },
		(/** @type {EXPECTED_ANY} */ _node, /** @type {EXPECTED_ANY} */ comment) =>
			/license/i.test(comment.value)
	],
	[
		"a line comment, and one written twice",
		{ "lines.js": "/*! twice */ a();\n//! line\nb();\n/*! twice */ c();" },
		{},
		true
	],
	["compress on", { "script.js": SCRIPT }, { compress: true }, true],
	["ecma of the compressor's own", { "script.js": SCRIPT }, { ecma: 5, compress: { ecma: 2020 } }, true],
	["mangle options", { "script.js": SCRIPT }, { mangle: { reserved: ["value"] } }, true],
	[
		"an event handler holding runs of `_`",
		{ "handler.js": "__a(_b, ___c);" },
		{ as: "event-handler" },
		true
	],
];

describe("jsMinify", () => {
	for (const [name, input, options, extractComments] of MINIFY_CASES) {
		for (const withMap of [false, true]) {
			const label = withMap ? `${name} (with source map)` : name;

			it(`should minify: ${label}`, async () => {
				const result = await jsMinify(
					input,
					withMap ? INPUT_MAP : undefined,
					{ ...options },
					extractComments
				);

				expect(result.code).toMatchSnapshot();
				expect(result.extractedComments).toMatchSnapshot();
				// It reads back as the production it was printed for.
				expect(() =>
					acorn.parse(result.code, {
						ecmaVersion: "latest",
						sourceType:
							options.as === "module" || options.module ? "module" : "script",
						allowReturnOutsideFunction: options.as === "event-handler"
					})
				).not.toThrow();
				// A handler body is read as the function body it is, so it maps.
				expect(typeof result.map).toBe(withMap ? "object" : "undefined");
			});
		}
	}

	it("should give back an event handler it prints as nothing, as written", async () => {
		const result = await jsMinify({ "handler.js": "void 0;" }, undefined, {
			as: "event-handler"
		});
		expect(result.code).toBe("void 0;");
	});

	it("should report a parse error rather than throwing a different shape", async () => {
		await expect(jsMinify({ "broken.js": "function (" })).rejects.toThrow();
	});

	it("should cache the names it hands out across assets", async () => {
		const nameCache = {};
		const result = await jsMinify(
			{ "cached.js": "var longName = 1; sink(longName);" },
			INPUT_MAP,
			{ toplevel: true, nameCache },
			false
		);
		expect(result.code).toBe("sink(1);");
		expect(typeof result.map).toBe("object");
		expect(nameCache).toEqual({ vars: { props: {} } });
		const shared = {};
		const options = { compress: false, toplevel: true, nameCache: shared };
		const first = await jsMinify(
			{ "first.js": 'var shared = "cached"; sink(shared);' },
			undefined,
			{ ...options },
			false
		);
		const second = await jsMinify(
			{ "second.js": "sink(shared);" },
			undefined,
			{ ...options },
			false
		);
		expect([first.code, second.code]).toEqual([
			'var a="cached";sink(a);',
			"sink(a);"
		]);
		expect(shared).toEqual({ vars: { props: { $shared: "a" } } });
	});

	it("should refuse what reads or prints a tree rather than code", async () => {
		for (const options of [
			{ parse: { spidermonkey: true } },
			{ format: { ast: true } },
			{ format: { spidermonkey: true } },
			{ format: { code: false } }
		]) {
			await expect(
				jsMinify({ "a.js": "a()" }, undefined, options, false)
			).rejects.toThrow(/not supported/);
		}
		// Each turned off, the source minifies as any other.
		const { code } = await jsMinify(
			{ "a.js": "a()" },
			undefined,
			{
				parse: { spidermonkey: false },
				format: { ast: false, spidermonkey: false, code: true }
			},
			false
		);
		expect(code).toBe("a();");
	});

	it("should read a Buffer input as UTF-8", async () => {
		const { code } = await jsMinify({
			"a.js": Buffer.from('console.log( "é" );', "utf8")
		});
		expect(code).toBe('console.log("é");');
	});

	it("should match string comment patterns like RegExp conditions", async () => {
		const input = {
			"comments.js":
				"/*! @license first */ first();\n" +
				"/* ordinary */ second();\n" +
				"/*! @license last */ last();"
		};
		const actual = await jsMinify(
			input,
			INPUT_MAP,
			// Terser accepts string patterns at runtime, but its types exclude them.
			{ format: { comments: /** @type {EXPECTED_ANY} */ ("first|last") } },
			{ condition: /** @type {EXPECTED_ANY} */ ("@license") }
		);
		const expected = await jsMinify(
			input,
			INPUT_MAP,
			{ format: { comments: /first|last/ } },
			{ condition: /@license/ }
		);
		expect(actual).toEqual(expected);
		expect(actual.extractedComments).toHaveLength(2);
	});

	it("should defer invalid comment patterns until a comment is tested", async () => {
		// Exercise a malformed runtime pattern outside the published type union.
		const invalidPattern = /** @type {EXPECTED_ANY} */ ("[");
		const options = { format: { comments: invalidPattern } };
		const input = { "plain.js": "run();" };
		expect(
			await jsMinify(input, undefined, options, { condition: invalidPattern })
		).toEqual(
			await jsMinify(input, undefined, { format: { comments: false } }, false)
		);
		const commented = { "commented.js": "/* comment */ run();" };
		await expect(
			jsMinify(commented, undefined, options, false)
		).rejects.toThrow(SyntaxError);
		await expect(
			jsMinify(commented, undefined, {}, { condition: invalidPattern })
		).rejects.toThrow(SyntaxError);
	});

	it("should claim JavaScript assets only", () => {
		expect(jsMinify.filter("app.js")).toBe(true);
		expect(jsMinify.filter("app.mjs?v=1")).toBe(true);
		expect(jsMinify.filter("app.cjs")).toBe(true);
		expect(jsMinify.filter("styles.css")).toBe(false);
		expect(jsMinify.getTypes()).toEqual(["javascript"]);
		expect(jsMinify.supportsWorkerThreads()).toBe(true);
	});

	it("should report webpack's version, so a cache entry follows it", () => {
		// The printer ships inside webpack, so webpack's own version is what an
		// upgrade of it moves.
		expect(jsMinify.getMinimizerVersion()).toBe(
			require("../../../package.json").version
		);
	});
});

describe("one-pass minify of what may run before it is set", () => {
	it("should keep calls and reads `eval`, `with` or an earlier call can change", () => {
		const cases = [
			// `eval` may set the name, `with` read another for it.
			["function f(){/*#__NO_SIDE_EFFECTS__*/var s=function(){};eval(\"s=g\");s()}", "function f(){var s=function(){};eval(\"s=g\"),s()}"],
			["function f(o){/*#__NO_SIDE_EFFECTS__*/var s=function(){};with(o)s()}", "function f(o){var s=function(){};with(o)s()}"],
			// A function declared there may be called before the name is set.
			["function f(){try{i()}catch(e){return 1}/*#__NO_SIDE_EFFECTS__*/var s=()=>{};function i(){s()}}", "function f(){try{(function(){s()})()}catch(e){return 1}var s=()=>{}}"],
			["function f(x){if(x){/*#__NO_SIDE_EFFECTS__*/var s=()=>{}}s()}", "function f(x){if(x)var s=()=>{};s()}"],
			["function f(){try{return g()}catch(e){return 0}let x=1;function g(){return x}}", "function f(){try{return x}catch(e){return 0}let x=1}"],
			["function f(){try{return g()}catch(e){return 0}let x=1;function g(){return x+x}}", "function f(){try{return x+x}catch(e){return 0}let x=1}"],
			// Nothing calls it first where nothing before the declarator calls anything.
			["function f(){/*#__NO_SIDE_EFFECTS__*/var s=()=>{};function i(){s()}i()}", "function f(){}"],
			["function f(){const x=2;function g(){return x}return g()}", "function f(){return 2}"]
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, { compress: {}, mangle: false }).code
			).toBe(expected);
		}
	});
});

describe("one-pass minify of what runs nothing", () => {
	it("should drop a call that runs nothing and fold a test it leaves known", () => {
		const cases = [
			["function f(){(function(){})()}", "function f(){}"],
			["function f(x,g){if(x){void function(){0}();g()}}", "function f(f,i){if(f)i()}"],
			["f=b=>{(function(){})();return b}", "f=n=>n;"],
			["function f(){return!function(){return 1}()?c:d}", "function f(){return d}"],
			["function f(a){return!(a,0)?c:d}", "function f(n){return c}"],
			// What runs something stays.
			["function f(a){return!(g(),0)?c:d}", "function f(n){return!(g(),0),c}"],
			["function f(){return(function(x){return 1})(g())?c:d}", "function f(){return function(n){return 1}(g())?c:d}"]
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, {
					compress: { toplevel: false },
					mangle: { toplevel: false }
				}).code
			).toBe(expected);
		}
	});
});

describe("one-pass minify of unread values", () => {
	/**
	 * @param {[string, string][]} cases each source and what it prints as
	 */
	const expectPrints = (cases) => {
		for (const [source, expected] of cases) {
			expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
				expected
			);
		}
	};

	it("should drop a read a `typeof` test shows bound", () => {
		expectPrints([
			['typeof x!=="undefined"&&x', ""],
			['typeof x=="undefined"||x', ""],
			['"u"<=typeof x||x', ""],
			['typeof x==="object"&&x', ""],
			['typeof x>"u"||x', ""],
			['typeof x<="u"&&x', ""],
			['"u">typeof x&&x', ""],
			['"u"<typeof x||x', ""],
			['typeof x==="undefined"?0:x', ""],
			['"undefined"!=typeof x?x:0', ""],
			// The read runs where the name may be unbound, or another name is read.
			['typeof x==="undefined"&&x', 'typeof x>"u"&&x;'],
			['typeof x!=="undefined"||x', 'typeof x<"u"||x;'],
			['"u">=typeof x||x', '"u">=typeof x||x;'],
			['typeof x!=="undefined"?0:x', 'typeof x<"u"||x;'],
			['typeof x!=="undefined"&&y', 'typeof x<"u"&&y;'],
			['typeof x!=="undefined"&&x.y', 'typeof x<"u"&&x.y;'],
			["function f(y){typeof x===y&&x}", "function f(y){typeof x===y&&x}"],
			['typeof x+"u"&&x', 'typeof x+"u"&&x;'],
			['typeof x!=="undefined"??x', 'typeof x<"u";'],
			// A `typeof` of a name in its dead zone throws, a `with` object answers any.
			['x;typeof y<"u"&&y;let y', 'x,typeof y<"u"&&y;let y;'],
			['with(o)typeof x<"u"&&x', 'with(o)typeof x<"u"&&x;']
		]);
	});

	it("should drop a class whose static blocks run nothing and whose keys are literals", () => {
		expectPrints([
			[
				"(class{static{[1];let x;const y=1;var z;function f(){}(function(){});()=>{};;class D{}}})",
				""
			],
			['(class{["x"]=alert(1);static["y"]=2;[1](){}static[1n];[null](){}})', ""],
			['(class{["prototype"](){}})', ""],
			// A static member named `prototype` throws, a statement may run code.
			[
				'(class{static["prototype"](){}})',
				'(class{static["prototype"](){}});'
			],
			["(class{static[/a/]})", "(class{static[/a/]});"],
			["(class{[a](){}})", "(class{[a](){}});"],
			["(class{static{f()}})", "(class{static{f()}});"],
			["(class{static{let{a}={}}})", "(class{static{let{a:a}={}}});"],
			["(class{static{let a=b}})", "(class{static{b}});"],
			[
				"(class{static{class D extends f(){}}})",
				"(class{static{class D extends(f()){}}});"
			],
			["(class{static{if(1);}})", "(class{});"]
		]);
	});

	it("should drop a conversion of an array or object literal that runs only built-ins", () => {
		expectPrints([
			['+[],-{},""+{},({}+1),0-[],`${[]}`,+{foo:0},+[1,[2],{}],""=={}', ""],
			["+{...[]},+{...'s'},+{...`s${1}`},+{...{a:1}}", ""],
			["+{...{toString(){}}}", "+{...{toString(){}}};"],
			["+{...a}", "+{...a};"],
			["+{...null}", "+{};"],
			// Its own methods, a prototype it sets, a bigint or a replaced built-in run.
			["+{toString(){}}", "+{toString(){}};"],
			["+{valueOf:f}", "+{valueOf:f};"],
			["+{__proto__:p}", "+{__proto__:p};"],
			["+{[k]:1}", "+{[k]:1};"],
			["+[a]", "+[a];"],
			["+[1n]", "+[1n];"],
			["+[,1]", "+[,1];"],
			["[]-1n", "[]-1n;"],
			["Math.sin(...{})", "Math.sin(...{});"],
			["Object.prototype.toString=f;+{}", "Object.prototype.toString=f,+{};"],
			["Object.prototype.valueOf=f;+{}", "Object.prototype.valueOf=f,+{};"],
			["Array.prototype.join=f;+[]", "Array.prototype.join=f,+[];"],
			["Array.prototype.toString=f;+[]", "Array.prototype.toString=f,+[];"],
			[
				"Object.prototype[Symbol.toPrimitive]=f;+[]",
				"Object.prototype[Symbol.toPrimitive]=f,+[];"
			]
		]);
	});

	it("should drop built-in calls and reads that run nothing", () => {
		expectPrints([
			["Object(),new Object,new Object({}),new Object(...[1])", ""],
			["RegExp(),new RegExp", ""],
			[
				"Object.prototype.hasOwnProperty,Array.prototype.slice,String.prototype.trim",
				""
			],
			[
				'Object.getOwnPropertyDescriptor({},"x"),Object.getOwnPropertyNames({}),Object.create({})',
				""
			],
			['Object.keys({}),Object.keys("s"),Object.values([1,2])', ""],
			// What `Object` takes runs, a replaced built-in or a getter may run.
			["Object(f())", "f();"],
			["window.Object=f;Object()", "window.Object=f,Object();"],
			["new RegExp(/a/)", "new RegExp(/a/);"],
			["Object.prototype.x=f;Object.prototype.x", "Object.prototype.x=f,Object.prototype.x;"],
			[
				'Object.defineProperty(Object.prototype,"y",{get:f});Object.prototype.y',
				'Object.defineProperty(Object.prototype,"y",{get:f}),Object.prototype.y;'
			],
			["Object.prototype[k]", "Object.prototype[k];"],
			["Function.prototype.call", "Function.prototype.call;"],
			["Object.create({},{a:1})", "Object.create({},{a:1});"],
			["Object.create(null)", "Object.create(null);"],
			["Object.create(...[{}])", "Object.create({});"],
			["Object.getPrototypeOf(a)", "Object.getPrototypeOf(a);"],
			["Object.getPrototypeOf()", "Object.getPrototypeOf();"],
			["Object.getOwnPropertyDescriptor({},a)", "Object.getOwnPropertyDescriptor({},a);"],
			["Object.entries([f()])", "Object.entries([f()]);"],
			["Object.keys=g;Object.keys([])", "Object.keys=g,Object.keys([]);"]
		]);
	});

	it("should drop collections of nothing and what their arguments leave", () => {
		const cases = [
			["new Set(null),new Map(void 0),new Set(undefined)", ""],
			["new Set([foo(),bar()])", "foo(),bar();"],
			["new Map([[foo(),bar()]])", "foo(),bar();"],
			["/*#__PURE__*/f([g(),1],{a:h()})", "g(),h();"],
			["Boolean(obj),new Boolean(f())", "obj,f();"],
			// What iterates or is read stays.
			["new Set(a)", "new Set(a);"],
			["new Map([1])", "new Map([1]);"],
			["Set(null)", "Set(null);"],
			["new Set(null,f())", "new Set(null,f());"],
			["var undefined=1;new Set(undefined)", "var undefined=1;new Set(undefined);"],
			[
				"Array.prototype[Symbol.iterator]=f;new Set([1])",
				"Array.prototype[Symbol.iterator]=f,new Set([1]);"
			],
			["Boolean=g;Boolean(1)", "(Boolean=g)(1);"],
			["x=/*#__PURE__*/f([g()])", "x=f([g()]);"]
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, {
					compress: { builtinsEcma: 2015 },
					mangle: false
				}).code
			).toBe(expected);
		}
	});

	it("should drop a call of a function that runs nothing when called", () => {
		expectPrints([
			[
				"((...a)=>{})(),(async()=>{})(),(function*(){f()})(),(async function(){})()",
				""
			],
			["((x,...r)=>{})(a,b)", "a,b;"],
			["(function(){function t(){}return t})(),(function(...r){return r})()", ""],
			// A default runs, an async function settles with what it returns.
			["(function*(a=f()){})()", "!function*(a=f()){}();"],
			["(async function(){return 1})()", "!async function(){return 1}();"],
			["(async()=>1)()", "(async()=>1)();"],
			["(async()=>{f()})()", "(async()=>{f()})();"],
			["x=(function*(){})()", "x=function*(){}();"]
		]);
	});

	it("should print what an unread template's parts run and convert", () => {
		expectPrints([
			["`stuff ${x?1:2} ${y}`", "x,`${y}`;"],
			["`4${c}${+a}`", "`${c}`,+a;"],
			["`${a()===b}`", "a(),b;"],
			["`${{a:f()}}`", "f();"],
			["`a${1}${2}`", ""],
			// A part converting by its methods stays in a template, in order.
			["`${f()}`", "`${f()}`;"],
			["`${[f()]}`", "`${[f()]}`;"],
			["`${function(){}}`", "`${function(){}}`;"],
			["x=`${f()}`", "x=`${f()}`;"],
			["f`${a}`", "f`${a}`;"],
			["`${/*c*/a}`", "`${a}`;"]
		]);
	});

	it("should drop a private name's `in` of a literal object", () => {
		expectPrints([
			["(class{#x;static{#x in{};#x in[]}})", ""],
			["(class{#x;static{#x in a}})", "(class{#x;static{#x in a}});"],
			["(class{#x;static{#x in null}})", "(class{#x;static{#x in null}});"],
			["(class{#x;static{#x in{get a(){}}}})", "(class{#x;static{#x in{get a(){}}}});"],
			['"a"in{}', '"a"in{};']
		]);
	});

	it("should drop a spread of a literal that runs no iterator or getter", () => {
		expectPrints([
			["[...[]]", ""],
			['[..."s"]', ""],
			["[...`t${1}`]", ""],
			["Math.sin(...[1]),Math.cos(...`1`)", ""],
			['/*#__PURE__*/f(...[1],..."s")', ""],
			["({...{},...[],...'s',...null,...1,...{set a(v){}}})", ""],
			["[...[], 1][0]", ""],
			// What a spread literal runs prints in its place.
			["[...[i++]]", "i++;"],
			["[f(),...[g(),[...[h()]]],1]", "f(),g(),h();"],
			["({a:f(),...{b:g(),...{c:h()}},...null})", "f(),g(),h();"],
			["[4,...[function(){}],a]", "a;"],
			// An iterator or getter may run, a hole read a prototype, a call convert.
			["[...a]", "[...a];"],
			["[...{}]", "[...{}];"],
			["[...null]", "[...null];"],
			["[...[,1]]", "[...[,1]];"],
			["[...`t${a}`]", "[...`t${a}`];"],
			["({...a})", "({...a});"],
			["({.../a/})", "({.../a/});"],
			["({...{get a(){}}})", "({...{get a(){}}});"],
			["({...{[f()]:1}})", "({[f()]:1});"],
			["[...[f()],...a]", "[f(),...a];"],
			["isNaN(...[1])", "isNaN(1);"],
			["Math.sin(...a)", "Math.sin(...a);"],
			["Math.sin(...1)", "Math.sin(...1);"],
			["Math.sin(...[a])", "Math.sin(a);"],
			[
				"Array.prototype[Symbol.iterator]=f;[...[1]]",
				"Array.prototype[Symbol.iterator]=f,[...[1]];"
			],
			[
				'String.prototype[Symbol.iterator]=f;[..."s"]',
				'String.prototype[Symbol.iterator]=f,[..."s"];'
			]
		]);
	});
});

describe("one-pass minify of statement sequences", () => {
	it("should join expression statements and the `return` after them, as terser's `sequences`", () => {
		const cases = [
			["function f(a){a();b();var x=1;c();d(x)}", "function f(a){a(),b(),c(),d(1)}"],
			["function f(){a();return b}", "function f(){return a(),b}"],
			["function f(c){c?a():b();return d}", "function f(c){return c?a():b(),d}"],
			["function f(){a();b();if(c)return 1;return 2}", "function f(){return a(),b(),c?1:2}"],
			["function f(c){if(c)return;a();return 1}", "function f(n){if(!n)return a(),1}"],
			// A `return` no space follows takes none it would need.
			["function f(){a();return!b}", "function f(){a();return!b}"],
			// A call of a function expression needs no `!` past the first.
			["function f(){k();(function(){var y=g();h(y,y)})()}", "function f(){k(),function(){var n=g();h(n,n)}()}"],
			["function f(){(function(){var y=g();h(y,y)})();return k}", "function f(){return function(){var n=g();h(n,n)}(),k}"],
			// An arrow joins whole only where it prints as what it returns.
			["f(()=>{s?a():b();return x})", "f(()=>(s?a():b(),x));"],
			["f(()=>{a();if(t)return 1;return 2})", "f(()=>{a();return t?1:2});"],
			["f(()=>{if(q)y();a();return b})", "f(()=>{if(q)y();return a(),b});"],
			// One taking parentheses at a statement's start stays a statement.
			["function f(){a();(function(){}).call(1);return b}", "function f(){a();(function(){}).call(1);return b}"],
			// asm.js reads its statements as written.
			['function f(){"use asm";function g(a){a=a|0;b=b|0;return a|0}return g}', 'function f(){"use asm";return function(n){n=n|0;b=b|0;return n|0}}']
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, {
					compress: { toplevel: false },
					mangle: { toplevel: false }
				}).code
			).toBe(expected);
		}
	});

	it("should join only where nothing reads the statements apart", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, EXPECTED_ANY>} */ options
		) =>
			minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false },
				...options
			}).code;
		// A string where directives may be stays a statement of its own.
		expect(
			print('function f(){("x");g();return 1}', {
				compress: { toplevel: false, side_effects: false }
			})
		).toBe('function f(){;"x";return g(),1}');
		// A value folding to a string stays no directive, wherever it prints.
		for (const [source, expected] of [
			['function f(){switch(1){case 1:"use "+"strict"}return this}', 'function f(){;"use strict";return this}'],
			['function f(){if(1){"use "+"strict"}return this}', 'function f(){;"use strict";return this}'],
			['function f(){"use "+"strict";g()}', 'function f(){;"use strict";g()}'],
			['function f(){switch(1){case 1:"use "+"strict";g()}return this}', 'function f(){;"use strict";g();return this}'],
			['function f(){g();"a"+"b";return h}', 'function f(){g();"ab";return h}']
		]) {
			expect(
				print(source, { compress: { toplevel: false, side_effects: false } })
			).toBe(expected);
		}
		// A comment before the `return` stays by it.
		expect(
			print("function f(){a();/*c*/return b}", { format: { comments: "all" } })
		).toBe("function f(){a();/*c*/return b}");
		// A `return` whose value goes unread prints bare, which nothing joins.
		expect(print("(function(){if(c)return;a();return 1})()", {})).toBe(
			"!function(){if(!c){a();return}}();"
		);
		// What prints nothing after the `return` ends the arrow's body too.
		expect(print("f(()=>{a();if(t)return 1;return 2;var z})", {})).toBe(
			"f(()=>{a();return t?1:2});"
		);
		expect(print("f(()=>{if(s)a();else b();return x})", {})).toBe(
			"f(()=>(s?a():b(),x));"
		);
		// A call spreading its arguments folds to no value.
		expect(
			print("function f(){return(function(x){return 1})(...a)?c:d}", {})
		).toBe("function f(){return function(n){return 1}(...a)?c:d}");
		// A statement a dropped `console` call prints nothing leaves the value.
		expect(
			print("f=b=>{console.log(1);return b}", {
				compress: { toplevel: false, drop_console: true }
			})
		).toBe("f=o=>o;");
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		expect(
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(
					"function f(){var x=g();var y=h();a(x,y);b(x);return y}",
					{ mode: "beautify", compress: {} }
				)
			).code
		).toBe("function f() {\nvar r = g(), n = h();\nreturn a(r, n), b(r), n;\n}");
		// Beautified, `if(t)return` keeps the statements after it apart.
		expect(
			/** @type {{ code: string }} */ (
				new SourceProcessor().process("function f(){if(x)return;a();b()}", {
					mode: "beautify",
					compress: {}
				})
			).code
		).toBe("function f() {\nif (x) return;\na(), b();\n}");
	});

	it("should fold a `switch` past the loops and functions its `break`s skip, and spreads of literals", () => {
		const cases = [
			[
				"function s(x){switch(1){case 1:{for(;;)break;while(x)break;do{break}while(x);for(k in x)break;for(k of x)break;switch(x){case 2:break}(function(){});(()=>{});class C{};x()}break}}",
				"function s(e){for(k in e)break;for(k of e)break;e()}"
			],
			["function s(x){switch(1){case 1:return x;case 2:y()}}", "function s(c){return c}"],
			// Running nothing, or what prints as one sequence.
			["function s(x){switch(1){case 2:y()}}", "function s(c){}"],
			["function s(e,t){if(t)return;switch(1){case 1:e.push(1);e.push(2)}}", "function s(e,s){if(!s)e.push(1),e.push(2)}"],
			["function s(x){switch(1){case 1:throw x;case 2:y()}}", "function s(c){throw c}"],
			["f({...{a:1,...b}}, [...[1,...c]])", "f({a:1,...b},[1,...c]);"],
			["f(...[1,...[2,3]])", "f(1,2,3);"],
			// A string it runs could read as a directive where the `switch` was.
			['function f(){switch(1){case 1:"use strict"}return this}', 'function f(){switch(1){case 1:"use strict"}return this}']
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, {
					compress: { toplevel: false },
					mangle: { toplevel: false }
				}).code
			).toBe(expected);
		}
	});

	it("should run what a converging `switch` tests in parentheses", () => {
		for (const [source, expected] of [
			["switch((x())){case 1:default:y()}", "x(),y();"],
			["switch(((x(),a))){default:y()}", "x(),a,y();"]
		]) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
			expect(code).toBe(expected);
			expect(runProgram(`var a=1;function x(){console.log(1)}function y(){console.log(2)}${code}`)).toBe("1\n2");
		}
	});

	it("should fold a labeled `switch` of a known value", () => {
		const cases = [
			[
				"function s(x,y){A:switch(1){case 1:x();for(;;)if(y())break A;y();case 2:x();default:y()}}",
				"function s(a,c){a:{a();for(;;)if(c())break a;c();a();c()}}"
			],
			["function s(x,y){A:switch(1){case 1:x();y();break;case 2:y()}}", "function s(c,s){c(),s()}"],
			// A label needs a statement, and an unlabeled `break` its `switch`.
			["function s(x){A:switch(1){case 2:x();break A}}", "function s(c){c:switch(1){case 2:c();break c}}"],
			["function s(x,y){A:switch(1){case 1:x();if(y())break;if(x())break A;y()}}", "function s(i,a){i:switch(1){case 1:i();if(a())break;if(i())break i;a()}}"]
		];
		for (const [source, expected] of cases) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			});
			expect(code).toBe(expected);
			// `y` alternates, so a loop waiting on it ends.
			for (const call of [
				"var n=0;s(()=>console.log(1),()=>{console.log(2);return n^=1})",
				"var n=1;s(()=>console.log(1),()=>{console.log(2);return n^=1})"
			]) {
				expect(runProgram(`${code}${call}`)).toBe(runProgram(`${source}${call}`));
			}
		}
	});

	it("should fold a `switch` on a sequence known by its last, running the rest first", () => {
		const cases = [
			["function s(w,x,y){switch(w(),42){case 13:x();case 42:y();default:x()}}", "function s(c,s,a){c(),a(),s()}"],
			["function s(w,x,y){switch((w(),x(),42)){case 42:y();break;default:x()}}", "function s(a,c,e){a(),c(),e()}"],
			["function s(w,x,y){A:switch(w(),42){case 42:y();x()}}", "function s(c,s,w){c(),w(),s()}"],
			// A comment on what it tests prints with it.
			["function s(w,x,y){switch(/*! c */w(),42){case 42:y()}}", "function s(c,s,w){/*! c */c(),42,w()}"],
			// What it runs first joins only expressions, before a match it ran
			// a case's test, and running nothing else it stays.
			["function s(w,x,y){switch(w(),42){case 42:if(x)y()}}", "function s(c,i,s){switch(c(),42){case 42:if(i)s()}}"],
			["function s(w,x,y){switch(w(),42){case x():y()}}", "function s(c,s,w){switch(c(),42){case s():w()}}"],
			["function s(w,y){switch(w(),42){case 13:y()}}", "function s(c,s){switch(c(),42){case 13:s()}}"],
			["function s(w,y){switch(w(),y()){case 13:y()}}", "function s(c,s){switch(c(),s()){case 13:s()}}"]
		];
		for (const [source, expected] of cases) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			});
			expect(code).toBe(expected);
			const call =
				"s(()=>console.log(1),()=>{console.log(2);return 13},()=>{console.log(3);return 42})";
			expect(runProgram(`${code}${call}`)).toBe(runProgram(`${source}${call}`));
		}
	});

	it("should drop a loop whose body is a `break`, set up by nothing and testing what runs nothing", () => {
		const cases = [
			["function f(a){for(;;){break}while(1)break;for(;a;f())break;g()}", "function f(a){g()}"],
			["function f(a){switch(a){case 1:while(a)break;g()}}", "function f(a){if(a===1)g()}"],
			["class C{static{for(;;)break;g()}}", "class C{static{g()}}"],
			// What its update read is read no more.
			["function f(){var a=g();for(;;a())break;h()}", "function f(){g();h()}"],
			// A label on it or a comment holds it, only a list drops a statement, and a
			// `var` after the `break` still declares.
			["function f(){L:for(;;)break;for(;;)/*! c */break;for(;;/*! c */g())break;h()}", "function f(){for(;;)break;for(;;)/*! c */break;for(;;/*! c */g())break;h()}"],
			["function f(a){if(a)for(;;)break;else g()}", "function f(f){if(f)for(;;)break;else g()}"],
			["function f(){for(;;){break;var x}return x}", "function f(){for(;;){break;var r}return r}"]
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, {
					compress: { toplevel: false },
					mangle: { toplevel: false }
				}).code
			).toBe(expected);
		}
		expect(
			minifyOnePass("function f(){for(;;)break;h()}", {
				compress: { toplevel: false, dead_code: false },
				mangle: { toplevel: false }
			}).code
		).toBe("function f(){for(;;)break;h()}");
	});

	it("should drop a label nothing names, and one a `break` or `continue` of its own loop names", () => {
		const cases = [
			// The nearest loop's own, a label goes from what jumps; another loop's,
			// a block's or one a `switch` stands between keeps it.
			["for(var i=0;i<4;i++){L:for(var j=0;j<3;j++){if(j==1)continue L;if(j==2)break L;console.log(i,j)}}", "for(var i=0;i<4;i++)for(var j=0;j<3;j++){if(j==1)continue;if(j==2)break;console.log(i,j)}"],
			["L:for(var i=0;i<3;i++){M:for(var j=0;j<3;j++){if(j==1)continue L;if(i==2)break L;console.log(i,j)}}", "i:for(var i=0;i<3;i++)for(var j=0;j<3;j++){if(j==1)continue i;if(i==2)break i;console.log(i,j)}"],
			["A:B:for(var i=0;i<3;i++){if(i==1)continue A;console.log(i)}", "for(var i=0;i<3;i++){if(i==1)continue;console.log(i)}"],
			["L:for(var i=0;i<3;i++){switch(i){case 1:continue L;case 2:break L}console.log(i)}", "i:for(var i=0;i<3;i++){switch(i){case 1:continue;case 2:break i}console.log(i)}"],
			["L:for(var i=0;i<3;i++)switch(i){case 1:break L;default:console.log(i)}", "i:for(var i=0;i<3;i++)switch(i){case 1:break i;default:console.log(i)}"],
			["L:{for(var i=0;i<3;i++){if(i==1)break L;console.log(i)}console.log(\"after\")}", "o:{for(var i=0;i<3;i++){if(i==1)break o;console.log(i)}console.log(\"after\")}"],
			["L:for(var i=0;i<2;i++){(function(){M:for(var j=0;j<3;j++){if(j==1)break M;console.log(i,j)}})()}", "for(var i=0;i<2;i++)!function(){for(var o=0;o<3;o++){if(o==1)break;console.log(i,o)}}();"],
			["U:console.log(\"unused\")", "console.log(\"unused\");"]
		];
		for (const [source, expected] of cases) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		// Without `dead_code`, a block listing nothing prints as `;` bare, which
		// the next pass drops, so its label stays.
		const kept = minifyOnePass("if(a){L:{}b()}", {
			compress: { dead_code: false },
			mangle: {}
		}).code;
		expect(kept).toBe("if(a){a:;b()}");
		expect(
			minifyOnePass(kept, { compress: { dead_code: false }, mangle: {} }).code
		).toBe(kept);
		// A string it labels would read as a directive bare.
		const directive =
			'function f(){L:"use strict";return this}console.log(typeof f())';
		const { code } = minifyOnePass(directive, { compress: {}, mangle: {} });
		expect(code).toBe(
			'function f(){t:"use strict";return this}console.log(typeof f());'
		);
		expect(runProgram(code)).toBe(runProgram(directive));
		expect(
			minifyOnePass("L:for(;;){continue L}U:x()", {
				compress: false,
				mangle: false
			}).code
		).toBe("L:for(;;){continue L}U:x();");
	});

	it("should print the known `switch`, spread and unary values of the config cases", () => {
		const fs = require("fs");
		const path = require("path");
		for (const name of [
			"minify-known-switch",
			"minify-literal-spread",
			"minify-unary-fold"
		]) {
			const source = fs.readFileSync(
				path.resolve(
					__dirname,
					"../../configCases/optimization",
					name,
					"index.js"
				),
				"utf8"
			);
			expect(
				minifyOnePass(source, {
					module: true,
					compress: {},
					mangle: {}
				}).code
			).toMatchSnapshot(name);
		}
	});

	it("should fold the global `NaN` and `Infinity` however spelled", () => {
		// cspell:ignore nfinity
		expect(
			minifyOnePass("f(!\\u0049nfinity,typeof \\u004eaN)", { compress: {} }).code
		).toBe('f(!1,"number");');
	});

	it("should fold a unary to `-0`", () => {
		const source =
			'var a=1;console.log(+-"",1/+-"",a- +-"",a-+-"",-(-0),~-"",typeof +-"")';
		const { code } = minifyOnePass(source, { compress: {} });
		expect(code).toBe(
			'var a=1;console.log(-0,1/-0,a- -0,a- -0,0,-1,"number");'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold the `typeof` of `undefined`", () => {
		const source =
			'console.log(typeof void 0,typeof undefined,typeof void 0<"u",typeof undefined=="undefined");function f(undefined){return typeof undefined}console.log(f(1),typeof void console.log(2),!void 0,-undefined?3:4)';
		const { code } = minifyOnePass(source, { compress: {} });
		expect(code).toBe(
			'console.log("undefined","undefined",!1,!0);function f(e){return typeof e}console.log(f(1),typeof void console.log(2),!void 0,-void 0?3:4);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold a string's character at a known index", () => {
		// Out of range, not an integer, run for something or deleted, it stays.
		const source =
			'console.log("1234"[0]+1,"ab"[1],"ab"[2],"ab"[-1],"ab"[1.5],"ab"[1-1],"ab"[(console.log(0),1)],delete"ab"[0])';
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			'console.log("11","b","ab"[2],"ab"[-1],"ab"[1.5],"a","ab"[console.log(0),1],delete"ab"[0]);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a template with no substitution as a string where shorter", () => {
		const source =
			'console.log(`\\${ beep }`,`a\\${b`,`plain`,`it"s`,`a\\nb`,`x\\`y`,`${1}\\${`)';
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			'console.log("${ beep }","a${b",`plain`,`it"s`,`a\\nb`,"x`y","1${");'
		);
		expect(runProgram(code)).toBe(runProgram(source));
		// One a statement holds stays, as a string there could open a prologue.
		const statement =
			'`a\\${b`;"use strict";var t=function(){return this}();console.log(typeof t)';
		expect(
			minifyOnePass(statement, { compress: { side_effects: false }, mangle: {} })
				.code
		).toBe(
			'`a\\${b`;"use strict";var t=function(){return this}();console.log(typeof t);'
		);
	});

	it("should drop a default of `undefined` in a pattern, but a parameter's own", () => {
		const source =
			"var{c=void 0,d=1}={},[x=void 0]=[];function f(a=void 0,{b=void 0}={}){return[a,b]}console.log(c,d,x,f.length,f())";
		for (const [ecma, expected] of /** @type {[number, string][]} */ ([
			[
				5,
				"var{c:c,d:d=1}={},[x]=[];function f(o=void 0,{b:d}={}){return[o,d]}console.log(c,d,x,f.length,f());"
			],
			[
				2015,
				"var{c,d=1}={},[x]=[];function f(o=void 0,{b}={}){return[o,b]}console.log(c,d,x,f.length,f());"
			]
		])) {
			const { code } = minifyOnePass(source, { ecma, compress: {}, mangle: {} });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		// A method's, accessor's or constructor's own default stays too.
		const methods =
			'class A{constructor(a=void 0){}m(a=void 0){}}var o={m(a=void 0){},set s(a=void 0){}};console.log(A.length,A.prototype.m.length,o.m.length,Object.getOwnPropertyDescriptor(o,"s").set.length)';
		const { code } = minifyOnePass(methods, { compress: {}, mangle: false });
		expect(code).toBe(
			'class A{constructor(a=void 0){}m(a=void 0){}}var o={m(a=void 0){},set s(a=void 0){}};console.log(A.length,A.prototype.m.length,o.m.length,Object.getOwnPropertyDescriptor(o,"s").set.length);'
		);
		expect(runProgram(code)).toBe(runProgram(methods));
		// A comment holds it, and without compressing it prints as written.
		expect(
			minifyOnePass("var[x=/*! c */void 0]=[]", { compress: {}, mangle: {} }).code
		).toBe("var[x=/*! c */void 0]=[];");
		expect(
			minifyOnePass("var[x=void 0]=[]", { compress: false, mangle: false }).code
		).toBe("var[x=void 0]=[];");
	});

	it("should read a hole of an array literal at a known index as `void 0`", () => {
		// Running something, out of range, not an integer, holding a comment,
		// spread, or read off, it stays.
		const source =
			"var a=[];function y(){}console.log([1,2,,3][2],[1,,2][1+0],[,y()][0],[,1][5],[,1][-1],[,1][0.5],[,/*! c */1][0],[,...a][0]);try{[,][0].x}catch(e){console.log(e.name)}";
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			"var a=[];function y(){}console.log(void 0,void 0,[,y()][0],[,1][5],[,1][-1],[,1][.5],[,/*! c */1][0],[,...a][0]);try{[,][0].x}catch(o){console.log(o.name)}"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should read an array, object, function or regular expression made in place as truthy", () => {
		// What runs something stays.
		const source =
			'function x(){console.log("x");return 7}console.log([1]&&2,[]&&x(),/a/||x(),[x()]&&3,(()=>1)&&4,[]||x(),{}&&5)';
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			'function x(){return console.log("x"),7}console.log(2,x(),/a/,[x()]&&3,4,[],5);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a folded `switch` bare in a block keeping its braces", () => {
		// A block that may lose its braces keeps the `switch`'s.
		const source =
			'function x(){console.log("x")}function y(){console.log("y")}function f(a){O:{x();switch(1){case 1:x();if(a)break O;y()}}try{switch(1){case 1:x();if(a)return;y()}}finally{}if(a){switch(1){case 1:x();if(a)return;y()}}}f(0);f(1)';
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			'function x(){console.log("x")}function y(){console.log("y")}function f(c){c:{x();x();if(c)break c;y()}x();if(c)return;y();if(c){x();if(c)return;y()}}f(0),f(1);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a `do` loop forever as `for(;;)` with its body unbraced", () => {
		// A body leaving the loop, or a test not known, keeps the `do`'s braces.
		const source =
			'var n=0;function c(){if(++n>3)throw n}try{do{c()}while(1)}catch(e){console.log(e)}n=0;try{do{c();c()}while(!0)}catch(e){console.log(e)}n=0;try{if(n<1)do{if(c())c()}while(1);else c()}catch(e){console.log(e)}n=0;do{c();if(n>1)break}while(1);do{c()}while(n<2);console.log(n);function g(){do{}while(1);do{break}while(1);do{c()}while(/*! k */1)}';
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			"var n=0;function c(){if(++n>3)throw n}try{for(;;)c()}catch(o){console.log(o)}n=0;try{for(;;)c(),c()}catch(o){console.log(o)}n=0;try{if(n<1)for(;;){if(c())c()}else c()}catch(o){console.log(o)}n=0;for(;;){c();if(n>1)break}do{c()}while(n<2);console.log(n);function g(){for(;;);do{c()}while(/*! k */1)}"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print an `if` known false as the `var` names its branch declares", () => {
		// A function its branch declares keeps the `if`, a branch picked prints before
		// the names; a function's own `var` is not the branch's, and a name nothing reads goes.
		const source =
			'if(0){let foo=6;const bar=12;class Baz{}var qux;(()=>{var z})()}function f(){if(0){var a=g(),{b,c:[,d=g()],...e}=g();for(var i in g());var a}return[typeof a,b,d,e,i].join()}if(0){function h(){}var j}if(1)console.log(typeof j);else var k;function u(){if(0){var gone}if(0){var dead,read}return read}console.log(typeof qux,f(),typeof k,u())';
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			'var qux;function f(){var o,a,e,f,r;return[typeof o,a,e,f,r].join()}if(0){function h(){}var j}console.log(typeof j);var k;function u(){var o;return o}console.log(typeof qux,f(),typeof k,u());'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold a `delete` of a conditional whose test is known and branch runs nothing", () => {
		// A branch reading a member or calling stays.
		const source =
			'var o={p:1};function y(){console.log("y")}console.log(delete(1?void 0:x),delete(0?x:void 0),delete(1?2:x),delete(1?o.p:2),o.p,delete(1?y():2))';
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			'var o={p:1};function y(){console.log("y")}console.log(!0,!0,!0,delete(0,o.p),o.p,delete y());'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold a `delete` of the global `undefined`, `NaN` or `Infinity` to `false`", () => {
		const cases = [
			["console.log(delete undefined,delete NaN,delete Infinity)", "console.log(!1,!1,!1);"],
			// A parameter of the name, or a `with` that may hold one, is not the global.
			["function f(undefined){return delete undefined}console.log(f())", "function f(e){return delete e}console.log(f());"],
			["var o={NaN:1};with(o)console.log(delete NaN)", "var o={NaN:1};with(o)console.log(delete NaN);"]
		];
		for (const [source, expected] of cases) {
			const { code } = minifyOnePass(source, { compress: {} });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should fold an optional chain starting on `null` or `undefined` to `undefined`", () => {
		// Nothing past the start runs; a start that runs code, a parameter named `undefined`, a first link read plainly or a chain `**` or a member reads stays.
		for (const [source, expected] of [
			[
				"var n=0;function f(){n++;return 1}console.log(null?.[f()],(void 0)?.a.b(f()),(null?.a)?.b,typeof null?.a,(1,null)?.a);null?.[f()];console.log(n)",
				"var n=0;function f(){return n++,1}console.log(void 0,void 0,void 0,typeof void 0,void 0),console.log(n);"
			],
			[
				"function f(undefined){return undefined?.a}var o={a:{b:1}};console.log(f({a:2}),(void console.log(3))?.a,(null?.a)**2,o?.a.b)",
				"function f(n){return n?.a}var o={a:{b:1}};console.log(f({a:2}),(void console.log(3))?.a,null?.a**2,o?.a.b);"
			]
		]) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			});
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		expect(
			minifyOnePass("x=(null?.a).b;y=null.a?.b", {
				compress: { toplevel: false }
			}).code
		).toBe("x=(null?.a).b,y=null.a?.b;");
		expect(
			minifyOnePass("x=/* c */null?.a", { format: { comments: "all" } }).code
		).toBe("x=/* c */null?.a;");
	});

	it("should read `?.` after what is never nullish as `.`", () => {
		expect(
			minifyOnePass(
				"function t(g){return[(g(),{})?.b,[1]?.x,(void 0)?.x,null?.x,`a`?.length,(1+a)?.b,(-a)?.b,(void a)?.b,(function(){})?.(),(g(),a)?.b]}",
				{ compress: { toplevel: false }, mangle: { toplevel: false } }
			).code
		).toBe(
			"function t(n){return[(n(),{}).b,[1].x,void 0,void 0,`a`.length,(1+a).b,(-a).b,(void a)?.b,function(){}(),(n(),a)?.b]}"
		);
	});
});

describe("one-pass minify options", () => {
	it("should read the options given without `compress` or `mangle`, compressing and mangling nothing", () => {
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const print = (
			/** @type {string} */ source,
			/** @type {import("../../../lib/javascript/syntax-parser").JavascriptProcessOptions} */ options
		) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(source, { mode: "minify", ...options })
			).code;
		expect(print("/*! a */ var x = 1; f(x)", {})).toBe("var x=1;f(x);");
		expect(
			print("/*! a */ var x = 1; f(x)", { format: { comments: "some" } })
		).toBe("/*! a */var x=1;f(x);");
		expect(print("var x = 1; f(x)", { toplevel: true })).toBe(
			"var x=1;f(x);"
		);
		expect(print("f()", { wrap: "W" })).toBe(
			'(function(exports){f()})(typeof W=="undefined"?W={}:W);'
		);
	});

	it("should read `output` as terser's older name for `format`, never beside it", () => {
		expect(
			minifyOnePass('g("é")', { compress: {}, output: { ascii_only: true } })
				.code
		).toBe('g("\\xe9");');
		expect(() =>
			minifyOnePass("g()", { compress: {}, format: {}, output: {} })
		).toThrow("only one of them");
	});
});

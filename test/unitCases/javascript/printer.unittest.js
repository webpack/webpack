"use strict";

// cspell:ignore binop, fnames, propmangle, fargs, domprops, argnames, nondeferred, loopcontrol, Defun, defun, NOINLINE, Funarg, unmangleable, Unmangleable, thedef, funs
// cspell:ignore fnames
// cspell:ignore argnames, bcatch, bfinally, argname
// cspell:ignore AAAWA MAAH EAAI EAAIA EAAGC ACAA IAAYC EAAWC
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
	it("should minify through `load` as schema-utils' precompile asks", async () => {
		const { load } = require("../../../lib/javascript/syntax").printer;
		const minifier = await load();
		const options = { mangle: true, ecma: 2015, toplevel: true };
		expect(
			(
				await minifier.minify("export function f(a){ return a + 1 }", {
					...options,
					compress: {},
					module: true
				})
			).code
		).toBe("export function f(n){return n+1}");
		expect(
			(await minifier.minify("var a = 1 + 2;", { ...options, compress: false }))
				.code
		).toBe("var a=1+2;");
	});

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
	"var ä = 1, 𐊧 = 2; typeof ä, ä in 𐊧, void 𐊧, new ä(), ä instanceof ä;",
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
				"if (a) { b() } while (a) { a-- } for (;;) { break } l: { c() } with (o) { d() } do { e() } while (a); for (k in o) { f(k) } for (k of o) { f(k) }",
				{},
				"if(a)b();while(a)a--;for(;;)break;o:c();with(o)d();do{e()}while(a);for(k in o)f(k);for(k of o)f(k);"
			],
			// An `else` after a block keeps it where the block ends in an `if` of its own.
			[
				"if (a) { if (b) c(); } else d(); if (a) { for (;;) if (b) c(); } else d(); if (a) { if (b) c(); else e(); } else d(); if (a) { l: if (b) c(); } else d();",
				{},
				"if(a){if(b)c()}else d();if(a){for(;;)if(b)c()}else d();a?b?c():e():d();if(a){e:if(b)c()}else d();"
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
				'import o from"b"with{type:"json"};o();x=`json`;'
			],
			// A `let` takes the value set after it only where that value runs no code.
			[
				"let a; a = [1, , {b: 2, c: function(){}}, () => 3]; let b; b = [x]; let c; c = {[k]: 1}; let d; d = {...e}; let e2; e2 = {b: x}; f(a,b,c,d,e2)",
				{},
				"let a=[1,,{b:2,c:function(){}},()=>3],b;b=[x];let c;c={[k]:1};let d;d={...e};let e2;e2={b:x};f(a,b,c,d,e2);"
			],
			// A known test's branch prints in its place, braced where it is several.
			[
				"if (x) { if (true) { b(); c() } } else d(); if (x) { if (false) { b() } else { c(); e() } } else d(); while (x) { if (1) { b(); c() } }",
				{},
				"if(x){b();c()}else d();if(x){c();e()}else d();while(x){b();c()}"
			],
			[
				"if (a) { let x = h(); f(x, x) } if (a) { const y = h(); f(y, y) } if (a) { var z = 1 } if (a) { class C {} f(C) } if (a) { function g() {} } if (a) {} if (a) { b(); c() }",
				{},
				"if(a){let i=h();f(i,i)}if(a){let n=h();f(n,n)}if(a)var z=1;if(a){class s{}f(s)}if(a){function g(){}}if(a){}if(a){b();c()}"
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
				"f(!0,!1);x=true.toString();y=true**b;z=b**!0;w={a:!1};t=typeof!0;new true;true`x`;v=a(!0)(!1);"
			],
			// `undefined` is `void 0` where it reads the global, not where it is bound or written.
			[
				"function f(a){ return a === undefined ? undefined.x : typeof undefined } function g(undefined) { return undefined } y = { undefined: 1 }; z = o.undefined; w = [undefined]",
				{},
				"function f(n){return n===void 0?undefined.x:typeof void 0}function g(n){return n}y={undefined:1};z=o.undefined;w=[void 0];"
			],
			// Where anything writes it, it stays a name everywhere.
			[
				"x = undefined; undefined = 1; for (undefined in o); undefined++",
				{},
				"x=undefined;undefined=1;for(undefined in o);undefined++;"
			],
			// Strings compare loosely, a name in brackets prints after a `.`, and
			// a `return` of `undefined` from nothing happening is bare.
			[
				'typeof a === "string" && typeof b !== typeof c && a === "s" && "s" === typeof a && "a" !== "b" && typeof a === /*! c */ "s"; o["key"]; o?.["if"]; o["a-b"]; x = 1["k"]; o[/*! c */ "k"]; o[1]; function f(){ return void 0 } function g(){ return undefined } function h(){ return void x() } function k(){ return /*! c */ void 0 }',
				{},
				'"string"==typeof a&&typeof b!=typeof c&&a==="s"&&"s"==typeof a&&!0&&typeof a==/*! c */"s";o.key;o?.if;o["a-b"];x=1..k;o[/*! c */"k"];o[1];function f(){}function g(){}function h(){return void x()}function k(){/*! c */return void 0}'
			],
			// A `const` nothing writes is a `let`, private to the module or where
			// `toplevel` says so, and a loop forever is `for(;;)`.
			[
				'const a = g(), b = 1; const { x, y: [z = 1, ...r] } = a; const c = 1; c = 2; const d = 1; d++; const e = 1; [e] = []; const k = 1; ({ k } = {}); const m = 1; for (m of a); export const ex = 1; for (const i of a) g(i, x, z, r, b, c, d, e, k, m); while (true) g(); while (/*! t */ true) g(); while (a) g()',
				{ module: true },
				'const o=g(),{x:c,y:[t=1,...e]}=o,n=1;n=2;const s=1;s++;const r=1;[r]=[];const a=1;({k:a}={});const i=1;for(i of o);export const ex=1;for(let f of o)g(f,c,t,e,1,n,s,r,a,i);for(;;)g();while(/*! t */!0)g();while(o)g();'
			],
			[
				"const a = 1; function f() { const b = g(); h(b); return b } f(a)",
				{},
				"const a=1;function f(){let n=g();h(n);return n}f(a);"
			],
			// Unmangled, the scopes are still read: what nothing reads goes, names as written.
			[
				"function f(){ const b = 2; var u = 1; return void 0 } f(undefined)",
				{ mangle: false },
				"function f(){}f(void 0);"
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
				'function f(){var e="a",n="b",r="d",f="e",t=/r/,A=-1,B=1n;e;n;delete r;g(f);return[t,A,B,e,n,r,f]}f();'
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
				"function f(c,s,t){g(t.kind,t,{s:t});c.exports=c=>c+t;if(s)var n=()=>1;g(n);switch(s){case 1:var o=()=>2;case 2:g(o)}let r=()=>3;for(;;)g(r);{g(function(){})}}"
			],
			// A `var` is a constant where nothing called before it can read it,
			// nor a read in its own function before it.
			[
				"function f(){ function m(){ return [A, B.x, C] } g(); var A = 1, B = 2, C = 3; y = C; return m } function h(){ var r = D; var D = 4; function k(){ return D } return [r, k] } function j(){ x = 1; var E = 5, F = 6; function q(){ return [E, (F).x, F] } return q }",
				{},
				"function f(){g();var n=2;y=3;return function(){return[1,n.x,3]}}function h(){var n=r,r=4;return[n,function(){return r}]}function j(){x=1;var n=6;return function(){return[5,n.x,n]}}"
			],
			// A function declared and called once prints where it is called,
			// but not into a loop, nor where the call comes before it.
			[
				"function f(a){ function h(x){ return x + a } function k(){ return 1 } function r(n){ return n ? r(n - 1) : 0 } var z = h(2); for (;;) k(); g(z, r); function late(){} late(); return [early()]; function early(){ return 2 } }",
				{},
				"function f(n){function r(){return 1}function t(n){return n?t(n-1):0}var u=function(){return 2+n}();for(;;)r();g(u,t);(function(){})();return[2]}"
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
				'function u(){g();h(function(){return"z1"},function(){return function(){return"v3"}});return function(){return"w2"}}function f(n){let r=()=>this;return[function(r){return r+n},function(){return function(){return this}()},function(){return r()}]}'
			],
			// What a statement sets folds into the next where that reads it first,
			// but not past a compound assignment's read nor a name it may write.
			[
				'function f(e, t, s){ var i; i = e.indexOf("x", t); if (i === -1 || i > s) return 1; let n = g(e); r(n); let o = {a: 1}; o.a; i = 2; while (i) i--; var p = h(); q += p; var u = h(); w(u); w = 1; let m = h(); return [m, 2] } function r(){} var q, w',
				{},
				'function f(i,e,n){var t=i.indexOf("x",e);if(t===-1||t>n)return 1;r(g(i));t=2;while(t)t--;var a=h();q+=a;var u=h();w(u);w=1;return[h(),2]}function r(){}var q,w;'
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
				"function h(n){let e=n;arguments[0]=2;return e}h(1);"
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
				"function f(n){g();({[q]:1});({...o});`${n}`;[g()];(function(){})();for(var t=0;;)break;return n}var top=1;function topFunction(){}"
			],
			[
				"function f(a){ var a = 1; return arguments[0] } function g(){ var b = 1; var b = 2 } function e(){ var x = 1; eval('x') } function w(){ /* keep */ var c = 1 } function l(){ { function inner() {} } var m = -b, n = typeof b }",
				{ format: { comments: /keep/ } },
				'function f(n){var n=1;return arguments[0]}function g(){}function e(){var x=1;eval("x")}function w(){}function l(){{}-b}'
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
			["function f(){ return void a }", { mangle: false }, "function f(){return void a}"],
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
				"function f(a){return[12,0,0,2,3,1,!1,!0,!0,!1,!0,!1,!0,3 in a,~3,3,\"number\",void 3,1,3/2,1,9,6]}"
			],
			[
				"function f(){ const a = 1, z = 0, n = null; return [a && 2, a || 2, a ?? 2, z && a, z || 3, n ?? 4, a ? 5 : 6, z ? 7 : 8] }",
				{},
				"function f(){return[2,1,1,0,3,4,5,8]}"
			],
			[
				"function f(){ const t = true, u = false, n = null; return [t, t, t, u, u, u, !t, n, n, n, n] }",
				{},
				"function f(){let n=null;return[!0,!0,!0,!1,!1,!1,!!0,n,n,n,n]}"
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
				"function f(){g(~3,1,\"number\",\"object\",-1,!0,2,3,5,6,!0,1 instanceof 2,9)}"
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
				"function f(){h({k:function(){}});h(function(){}+1);h({[function(){}]:1})}"
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
				"function f(x){var e=g();switch(e){}(e=g())?1:2;e=g();h(...e);e=g();delete e.y;e=g(),1;({k:e=g()});e=g();({[k]:e});e=g();new x(e=g());e=g();new x(...e);new U(e=g());e=g();[...e];`${e=g()}`;-(e=g());return e}"
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
				"function f(o){const[,c]=o,{b:n}=o,[t]=o;t=1;return c+n+t}"
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
				"function f(){\"use strict\";g()}function h(){x=g();k(x)}"
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
				"function f(o,x){({...o}).x;(o&&{}).x;(o?.p).x;(o+=1).x;(o={}).y;[1][x()];delete o.x;(x?o:{}).x;(()=>1).prototype.x;({}||o).x}"
			],
			// What a value converts as is known through its operators, three levels deep.
			[
				"function g(a, b){ var c = (a < b) - 1, d = (1 >>> 0) - 1, e = (1 + \"s\") - 1, h = (1n + 1n) - 1n, i = (1 + 2) - 1, j = (a + 1) - 1, k = (1n * 1n) - 1n, l = (1 * 2) - 1, m = (a * 1) - 1, n = null - 1, w = `x` - 1, x = 1 - ((((1 + 1) + 1) + 1) + 1), o = (0, /r/) - 1, p = (b++) - 1, q = -(-1n) - 1n, r = -(a + 1), s = 1 - (((1 + 1) + 1) + 1), t = undefined + 1, u = (a ? 1 : \"s\") - 1, v = (a = 1) - 1, y = (a += 1) - 1, z = -\"1\" - 1, aa = -(1 + \"\".length) - 1; }",
				{},
				"function g(n,a){n+1-1;n*1-1;(0,/r/)-1;a++-1;-(n+1);(n?1:\"s\")-1;(n=1)-1;(n+=1)-1;-(1+\"\".length)-1}"
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
				"function w(n){with(n){}}function f(){b}"
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
				"function f(o){o.x;({get x(){}}).x;[...o];({...o});null.x;({...{a:1}}).a;(void 0).x;(o={}).x;(o&&={}).x;o.y.prototype}"
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
				"function f(e,f){e?x():y();(e=f)?x():y();(function(){}())?x():y();e?x():f?y():(x(),y());e?f?x():y():z()}"
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
				"function f(n,r){return n?(r,1):2}function g(n){if(n)return 1}function h(n){if(n)return;return 1}"
			],
			// An `if` whose test is known false goes, and what only it read with it, but not where its body declares a `var` or function or holds a comment kept.
			[
				"function f(a){ var m = 1; if (!1) m = a; if (0) { var v = 1 } if (false) { function q(){} q() } const D = false; if (D) g(); if (!1) x(); else y(); if (0) x(/*! c */ 1); return m + v }",
				{},
				"function f(f){var i=1;if(0)var a=1;if(!1){function n(){}n()}y();if(0)x(/*! c */1);return i+a}"
			],
			[
				"function f(a){ if (0) x() }",
				{ compress: {toplevel: false,dead_code: false} },
				"function f(f){if(0)x()}"
			],
			// A conditional whose test is known prints the branch it picks, but not a name or member `delete`, `typeof` or a call would read differently, nor what opens a statement or drops a comment kept.
			[
				"function f(o){ const T = 1; g(T ? o : 2); g(!T ? 1 : (o, 2)); delete (T ? o.x : 1); (T ? o.f : 1)(); (T ? o.f : 1)``; typeof (T ? u : 1); g(T ? o.f : 1); T ? function(){}() : 1; g(T ? o : h(/*! c */ 2)); return () => T ? {} : 1 }",
				{},
				"function f(o){g(o);g((o,2));delete(1?o.x:1);(1?o.f:1)();(1?o.f:1)``;typeof(1?u:1);g(o.f);1?function(){}():1;g(1?o:h(/*! c */2));return()=>1?{}:1}"
			],
			// So does `&&`, `||` or `??` whose left side is known.
			[
				"function f(o){ const T = 1, N = null; g(T && o.f, T || o, N ?? o, T ?? o); delete (T && o.x); (T && o.f)(); T && function(){}(); g(T || h(/*! c */ 2)) }",
				{},
				"function f(o){g(o.f,1,o,1);delete(1&&o.x);(1&&o.f)();1&&function(){}();g(1||h(/*! c */2))}"
			],
			// A branch that is no expression keeps the `if`, a sequence test is parenthesized, and a dead `if` declaring only in its own scopes goes.
			[
				"function f(a, b){ const T = 1; if (a) for (;;) g(); else y(); if ((a, b)) x(); else y(); if (0) { let w = () => { var z } } g([T ? a : 2]) }",
				{},
				"function f(f,a){if(f)for(;;)g();else y();(f,a)?x():y();g([f])}"
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
				"function f(a){a;g()}"
			],
			// Without mangling it compresses the same, names as written.
			[
				"function f(a){ if (a) x(); else y(); Math.PI; a - 1 }",
				{ mangle: false },
				"function f(a){a?x():y();a-1}"
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
				"async function f(a){h(a,1,this,g());new K(a,g());i(await g());j(a+g());k(a[g()]);l([a,,g()]);o({x:a,y:g()});r((a,g()))}"
			],
			// But not past a spread, shorthand, computed key, getter or template part before it, an optional member, a global the value sets, a name something writes, nor where `eval` may read it.
			[
				"function f(p){ var a = g(); h(...p, a); var b = g(); h({ p, b }); var c = g(); h({ [p]: 1, c }); var d = g(); h({ get x(){}, y: d }); var e = g(); h(`${p}${e}`); var m = g(); h(p?.[m]); var n = (h = g)(); h(n); var q = (h++, g()); h(q); var r = g(); h(p, r); p = 1 } function k(){ var a = g(); h(a); eval(\"\") } function l(){ x = g(); h(x) }",
				{},
				"function f(a){var r=g();h(...a,r);var v=g();h({p:a,b:v});var n=g();h({[a]:1,c:n});var p=g();h({get x(){},y:p});var c=g();h(`${a}${c}`);var e=g();h(a?.[e]);var f=(h=g)();h(f);var t=(h++,g());h(t);var i=g();h(a,i);a=1}function k(){var a=g();h(a);eval(\"\")}function l(){x=g();h(x)}"
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
				"function f(e,a){if(e)return 1;a();if(a){x();return 2}y();z();if(e)throw 1;h(g());while(e){if(a)break;w()}for(;;)if(e)continue;else{/*! c */v()}if(a)return;e?v():u()}for(;;)if(a)break;else b();e:if(a)break e;else b();switch(a){case 1:if(b)break;c()}"
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
				"function b(n){1n/0n;2n**-1n;1n%0n;1n/n}"
			],
			// A `switch` drops a `break` ending it and a `default` doing nothing last, and a value folds into `import()`.
			[
				"function f(c){ switch (c) { case -1: c = 1; break; case 0: c = 2; break; default: break } switch (c) { case 1: x(); break } switch (c) { default: break } switch (c) { case 1: y(); break; default: } a: switch (c) { case 1: z(); break a } switch (c) { case 1: y(); /*! c */ break } var i = r(c); return import(i) }",
				{},
				"function f(c){switch(c){case-1:c=1;break;case 0:c=2}switch(c){case 1:x()}switch(c){default:}switch(c){case 1:y()}c:switch(c){case 1:z();break c}switch(c){case 1:y();/*! c */break}return import(r(c))}"
			],
			// `!!!x` read for its truth folds its innermost `!!` alone.
			[
				"function f(x) { if (!!!x) g(); if (!!!!x) h(); return [!!!x ? 1 : 2, !!!x] }",
				{},
				"function f(x){if(!x)g();if(x)h();return[!x?1:2,!x]}"
			],
			// A parameter `arguments` reads keeps what sets it.
			[
				"function f(a) { a = 1; return arguments[0] } function k(b) { b = 1; return () => arguments } function m(c) { c = 1; return function () { return arguments } }",
				{},
				"function f(n){n=1;return arguments[0]}function k(n){n=1;return()=>arguments}function m(n){return function(){return arguments}}"
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
				"function f(n,t){n=2;return[(n=>n+1)(n),(n=>()=>n)(t),function(){return this}(),function n(){return n}(),(async()=>1)(),(n=>n)(t,t),(()=>1)?.()]}"
			],
			// The assignment every branch of a chain ends in prints once, before its test.
			[
				"function f(e, t) { if (e === 7) t += \"a\"; else if (e === 8) t += \"b\"; else t += e; if (e()) t += 1; else t += 2; return [t, e ? t = 1 : t = 2, e ? t = 1 : t += 2, e ? t = 1 : o.t = 2] }",
				{},
				"function f(e,t){t+=e===7?\"a\":e===8?\"b\":e;e()?t+=1:t+=2;return[t,t=e?1:2,e?t=1:t+=2,e?t=1:o.t=2]}"
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
				"function f(a){var b=0,r=0;b=1;r=a?2:3;return[b,r]}"
			],
			// A global or labelled exit stays; a name nothing mangles prints as written.
			[
				'var t; if (a === 1) t = "x"; else t = "y"; function f(a) { if (a) X = 1; else X = 2; l: for (;;) { if (a) break l; if (!a) break l; g() } }',
				{},
				'var t;t=a===1?"x":"y";function f(a){a?X=1:X=2;a:for(;;){if(a)break a;if(!a)break a;g()}}'
			],
			// A function declaration read once before it prints there, but in a loop.
			[
				"function f(t) { t.exports = u; function u() { return g() } return t } function k(t) { for (var i = 0; i < 2; i++) t.push(v); function v() {} return t } function m(t) { t.a = w; var r = h(); function w(e) { return r(e) } return t }",
				{},
				"function f(t){t.exports=function(){return g()};return t}function k(t){for(var n=0;n<2;n++)t.push(r);function r(){}return t}function m(t){t.a=function(t){return n(t)};var n=h();return t}"
			],
			// One holding a function moved after the read stays, until a reprint.
			[
				"function f(t) { t.e = a; function c() { h(); return g(1) } function a() { return c() } return t }",
				{},
				"function f(n){n.e=t;function t(){return function(){h();return g(1)}()}return n}"
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
				'function f(a,b,o){o.x=b;({a:g()});g(a+b);new G(a-b);o.y=a*b;o[a+b]=1;return[`${a+b}`,...[a],{p:a+b,[a|b]:1},"s",`t${a}`,-a]}'
			],
			[
				"function f() { return [(function () { g() })(), (function () { return })(), (function () { return new.target })(), (function () { return class {} })(), (function n() { return function () { return 1 } })(), (function n() { return function () { return n } })(), (function () { return function () { return 1 } })()] } class A extends B { m() { return (() => super.m())() } } function h(a, b) { throw (() => a + b)() } function k(a, b) { var v = (() => a % b)(); g(v); g(v) }",
				{},
				"function f(){return[function(){g()}(),function(){}(),function(){return new.target}(),class{},function(){return 1},function n(){return function(){return n}}(),function(){return 1}]}class A extends B{m(){return(()=>super.m())()}}function h(n,t){throw n+t}function k(n,t){var r=n%t;g(r);g(r)}"
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
				"function f(c){var a;a=c?1:2;return a}"
			],
			// A call prints as its value only where what it passes prints as named.
			[
				"(function () { var x = 7; function h(k) { return k() } function f(a) { var g = function () { return x }; return h(g) + a } g(f(3)) })(); (function () { function h(k) { return k + 1 } function f(a) { var c = 5; return h(c) + a } g(f(3)) })(); (function () { function h(k) { return k.v } function f(a) { var c = { v: 5 }; return h(c) + a } g(f(3)) })()",
				{},
				"!function(){g(function(){return function(n){return n()}(function(){return 7})+3}())}();!function(){g(function(){return function(){return 6}()+3}())}();!function(){g(function(){return function(n){return n.v}({v:5})+3}())}();"
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
				"function f(){a();b();e();g();h()}"
			],
			// An arrow's chain opening with an object is parenthesized past what goes.
			[
				"g(x => { var u = 1; if ({}.a) return 1; return 2 })",
				{},
				"g(r=>({}.a?1:2));"
			],
			// A value printed where a read opening a statement was keeps its parentheses.
			[
				"function f(){ var c = {}.a ? g() : h(); c, 1; var d = function(){}.call() ? g() : h(); d; (() => ({}.a ? 1 : 2))(), g() }",
				{},
				"function f(){({}.a?g():h()),1;(function(){}.call()?g():h());({}.a?1:2),g()}"
			],
			// A function declared as the branch kept declares it only once that runs.
			[
				"g(function(){ g(typeof f); if (1) function f(){} if (0) ; else function h(){} g(f, h) })",
				{},
				"g(function(){g(typeof f);if(1)function f(){}if(0);else function n(){}g(f,n)});"
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
				"function m(o){var n=function(o,n){this.label=o;this.options=n};return[new n(o,1),new n(o,2)]}"
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
			["function f(a){var b=(a,1);g(b)}", {}, "function f(a){g((a,1))}"],
			["function f(a){var b=(a,1);return b}", {}, "function f(a){return a,1}"],
			["function f(a){var b=(a,1);throw b}", {}, "function f(a){throw a,1}"],
			["function f(a){var b=(a,1);return b,2}", {}, "function f(a){return a,1,2}"],
			["function f(a){var b=(a,1);return b.x}", {}, "function f(a){return(a,1).x}"],
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
			// An empty statement prints nothing, a block of only those as `;`.
			["function f(a){if(a){;}else g()}", {}, "function f(f){if(f);else g()}"],
			["while(a){;}", {}, "while(a);"],
			// A `RegExp` built from constants that parse goes unused; one that throws stays.
			["function m(){f();var rangeChars=\"abcdefghijklmnopq\";new RegExp(\"[\"+rangeChars+\"]\");new RegExp(\"[\"+rangeChars+\"0-9]\",\"g\")}", {}, "function m(){f()}"],
			["function m(){new RegExp(\"[\");RegExp(\"a\",\"q\")}", {}, "function m(){RegExp(\"[\");RegExp(\"a\",\"q\")}"],
			["function m(RegExp){new RegExp(\"a\")}", {}, "function m(e){new e(\"a\")}"],
			// A `var` set after a call folds where its function reads it after the declaration.
			["function m(){f();var greeting=\"hello\";g(greeting+\"!\")}", {}, "function m(){f();g(\"hello!\")}"],
			["function m(){g(greeting+\"!\");var greeting=\"hello\"}", {}, "function m(){g(e+\"!\");var e=\"hello\"}"],
			["function m(){function g(){return greeting}f();var greeting=\"hello\";g(greeting)}", {}, "function m(){f();(function(){return\"hello\"})(\"hello\")}"],
			["function m(){f();var contraction=\"(?:d|ll|m|re|s|t|ve)?\";g(\"x\"+contraction,\"y\"+contraction,contraction)}", {}, "function m(){f();g(\"x(?:d|ll|m|re|s|t|ve)?\",\"y(?:d|ll|m|re|s|t|ve)?\",\"(?:d|ll|m|re|s|t|ve)?\")}"],
			// A fold weighs the operands as printed, a string's run joined.
			["f(x+\"a\"+\"b\"+1)", {}, "f(x+\"ab1\");"],
			// A hundred strings print as one string split on a delimiter none holds.
			["g([\"w0\",\"w1\",\"w2\",\"w3\",\"w4\",\"w5\",\"w6\",\"w7\",\"w8\",\"w9\",\"w10\",\"w11\",\"w12\",\"w13\",\"w14\",\"w15\",\"w16\",\"w17\",\"w18\",\"w19\",\"w20\",\"w21\",\"w22\",\"w23\",\"w24\",\"w25\",\"w26\",\"w27\",\"w28\",\"w29\",\"w30\",\"w31\",\"w32\",\"w33\",\"w34\",\"w35\",\"w36\",\"w37\",\"w38\",\"w39\",\"w40\",\"w41\",\"w42\",\"w43\",\"w44\",\"w45\",\"w46\",\"w47\",\"w48\",\"w49\",\"w50\",\"w51\",\"w52\",\"w53\",\"w54\",\"w55\",\"w56\",\"w57\",\"w58\",\"w59\",\"w60\",\"w61\",\"w62\",\"w63\",\"w64\",\"w65\",\"w66\",\"w67\",\"w68\",\"w69\",\"w70\",\"w71\",\"w72\",\"w73\",\"w74\",\"w75\",\"w76\",\"w77\",\"w78\",\"w79\",\"w80\",\"w81\",\"w82\",\"w83\",\"w84\",\"w85\",\"w86\",\"w87\",\"w88\",\"w89\",\"w90\",\"w91\",\"w92\",\"w93\",\"w94\",\"w95\",\"w96\",\"w97\",\"w98\",\"w99\"])", {}, "g(\"w0.w1.w2.w3.w4.w5.w6.w7.w8.w9.w10.w11.w12.w13.w14.w15.w16.w17.w18.w19.w20.w21.w22.w23.w24.w25.w26.w27.w28.w29.w30.w31.w32.w33.w34.w35.w36.w37.w38.w39.w40.w41.w42.w43.w44.w45.w46.w47.w48.w49.w50.w51.w52.w53.w54.w55.w56.w57.w58.w59.w60.w61.w62.w63.w64.w65.w66.w67.w68.w69.w70.w71.w72.w73.w74.w75.w76.w77.w78.w79.w80.w81.w82.w83.w84.w85.w86.w87.w88.w89.w90.w91.w92.w93.w94.w95.w96.w97.w98.w99\".split(\".\"));"],
			["g([\"w0.,() \",\"w1.,() \",\"w2.,() \",\"w3.,() \",\"w4.,() \",\"w5.,() \",\"w6.,() \",\"w7.,() \",\"w8.,() \",\"w9.,() \",\"w10.,() \",\"w11.,() \",\"w12.,() \",\"w13.,() \",\"w14.,() \",\"w15.,() \",\"w16.,() \",\"w17.,() \",\"w18.,() \",\"w19.,() \",\"w20.,() \",\"w21.,() \",\"w22.,() \",\"w23.,() \",\"w24.,() \",\"w25.,() \",\"w26.,() \",\"w27.,() \",\"w28.,() \",\"w29.,() \",\"w30.,() \",\"w31.,() \",\"w32.,() \",\"w33.,() \",\"w34.,() \",\"w35.,() \",\"w36.,() \",\"w37.,() \",\"w38.,() \",\"w39.,() \",\"w40.,() \",\"w41.,() \",\"w42.,() \",\"w43.,() \",\"w44.,() \",\"w45.,() \",\"w46.,() \",\"w47.,() \",\"w48.,() \",\"w49.,() \",\"w50.,() \",\"w51.,() \",\"w52.,() \",\"w53.,() \",\"w54.,() \",\"w55.,() \",\"w56.,() \",\"w57.,() \",\"w58.,() \",\"w59.,() \",\"w60.,() \",\"w61.,() \",\"w62.,() \",\"w63.,() \",\"w64.,() \",\"w65.,() \",\"w66.,() \",\"w67.,() \",\"w68.,() \",\"w69.,() \",\"w70.,() \",\"w71.,() \",\"w72.,() \",\"w73.,() \",\"w74.,() \",\"w75.,() \",\"w76.,() \",\"w77.,() \",\"w78.,() \",\"w79.,() \",\"w80.,() \",\"w81.,() \",\"w82.,() \",\"w83.,() \",\"w84.,() \",\"w85.,() \",\"w86.,() \",\"w87.,() \",\"w88.,() \",\"w89.,() \",\"w90.,() \",\"w91.,() \",\"w92.,() \",\"w93.,() \",\"w94.,() \",\"w95.,() \",\"w96.,() \",\"w97.,() \",\"w98.,() \",\"w99.,() \"])", {}, "g([\"w0.,() \",\"w1.,() \",\"w2.,() \",\"w3.,() \",\"w4.,() \",\"w5.,() \",\"w6.,() \",\"w7.,() \",\"w8.,() \",\"w9.,() \",\"w10.,() \",\"w11.,() \",\"w12.,() \",\"w13.,() \",\"w14.,() \",\"w15.,() \",\"w16.,() \",\"w17.,() \",\"w18.,() \",\"w19.,() \",\"w20.,() \",\"w21.,() \",\"w22.,() \",\"w23.,() \",\"w24.,() \",\"w25.,() \",\"w26.,() \",\"w27.,() \",\"w28.,() \",\"w29.,() \",\"w30.,() \",\"w31.,() \",\"w32.,() \",\"w33.,() \",\"w34.,() \",\"w35.,() \",\"w36.,() \",\"w37.,() \",\"w38.,() \",\"w39.,() \",\"w40.,() \",\"w41.,() \",\"w42.,() \",\"w43.,() \",\"w44.,() \",\"w45.,() \",\"w46.,() \",\"w47.,() \",\"w48.,() \",\"w49.,() \",\"w50.,() \",\"w51.,() \",\"w52.,() \",\"w53.,() \",\"w54.,() \",\"w55.,() \",\"w56.,() \",\"w57.,() \",\"w58.,() \",\"w59.,() \",\"w60.,() \",\"w61.,() \",\"w62.,() \",\"w63.,() \",\"w64.,() \",\"w65.,() \",\"w66.,() \",\"w67.,() \",\"w68.,() \",\"w69.,() \",\"w70.,() \",\"w71.,() \",\"w72.,() \",\"w73.,() \",\"w74.,() \",\"w75.,() \",\"w76.,() \",\"w77.,() \",\"w78.,() \",\"w79.,() \",\"w80.,() \",\"w81.,() \",\"w82.,() \",\"w83.,() \",\"w84.,() \",\"w85.,() \",\"w86.,() \",\"w87.,() \",\"w88.,() \",\"w89.,() \",\"w90.,() \",\"w91.,() \",\"w92.,() \",\"w93.,() \",\"w94.,() \",\"w95.,() \",\"w96.,() \",\"w97.,() \",\"w98.,() \",\"w99.,() \"]);"],
			// Setting a `const` throws, so the write stays though nothing reads it.
			["function m(){const e=2;e=1;return 3}", {}, "function m(){const n=2;n=1;return 3}"],
			// A `const` set to `undefined` prints as a `let` without it.
			["function f(){const c=undefined;g(c);g(c)}", {}, "function f(){let c;g(c);g(c)}"]
		];
		for (const [source, options, expected] of cases) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false },
				...options
			});
			expect(code).toBe(expected);
		}
		// Every comment kept is still the compressor's to keep.
		const { code } = minifyOnePass("if (a) { b() } /* c */", {
			compress: {},
			mangle: {},
			format: { comments: "all" }
		});
		expect(code).toBe("if(a){b()}/* c */");
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
			["a = ( /* x */ b /* y */ ) ; c = ( // l\n d); e = (\n/* z */ f)", { compress: {}, format: { comments: "all" } }, "a=/* x */b/* y */;c=// l\nd;e=\n/* z */f;"],
			["f(/* a */); g({ /* b */ }); h([ /* c */ ]); function k() { /* d */ } class C { /* e */ }", { compress: {}, format: { comments: "all" } }, "f();g({/* b */});h([]);function k(){/* d */}class C{}"],
			["x = 1 // t\n", { compress: {}, format: { comments: "all" } }, "x=1;// t"],
			["#!/usr/bin/env node\n/* a */ x()", { compress: {}, format: { comments: "all" } }, "#!/usr/bin/env node\n/* a */x();"],
			["#!/usr/bin/env node\n/* a */ x()", { compress: {}, format: { comments: "all", shebang: false } }, "/* a */x();"],
			["#!/usr/bin/env node\nfoo()", {}, "#!/usr/bin/env node\nfoo();"],
			["/* a */ x()", { compress: {}, format: { comments: "all", preamble: "/* pre */\r\nline" } }, "/* pre */\nline\n/* a */x();"],
			// `ascii_only` escapes what is past ASCII, as the edition and engine allow
			["x = 'é\\u{1F600}\\u0100'; y = /é/; var é = 1; z = { é: 1 }", { format: { ascii_only: true } }, "x=\"\\xe9\\ud83d\\ude00\\u0100\";y=/\\xe9/;var \\u00e9=1;z={\"\\xe9\":1};"],
			["x = 'é\\u{1F600}\\u0100'; y = /é\\u{1F600}/u", { ecma: 2015, format: { ascii_only: true } }, "x=\"\\xe9\\ud83d\\ude00\\u0100\";y=/\\xe9\\u{1F600}/u;"],
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
			["x = RegExp('</script'); y = '<!--' + '\\\\<!--' + '</script>' + '-->'", { compress: {} }, "x=RegExp(\"</script\");y=\"\\x3c!--\\\\\\x3c!--<\\/script>--\\x3e\";"],
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
			["(function(){var x = /a/ && h(), y = 1 || h(), z = 0 ?? h(); g()})()", "/a/&&h();g();"],
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
				"(function(){class C extends (0, K){} g()})()",
				"!function(){class C extends(0,K){}g()}();"
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
				"console.log(function c(){c=6;return c}(),function c(){c=6;return typeof c}())",
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
			["export const n = ~(1 | 2);", "export const n=~3;"],
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
			"[Number.POSITIVE_INFINITY]=[7];({v:Number.NEGATIVE_INFINITY}={v:1});[...Number.POSITIVE_INFINITY]=[7];for([Number.POSITIVE_INFINITY]of[[7]]);Number.NaN++;let v;({[1/0]:v=-1/0}={});g(NaN);"
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
		expect(print("if(a)debugger;f();")).toBe("if(a);f();");
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
		).toBe("console.warn(2);g();");
		expect(
			print("console[m](1);c.console.log(1);", { drop_console: true })
		).toBe("console[m](1);c.console.log(1);");
		expect(
			print("var console=k;console.log(1);", { drop_console: true })
		).toBe("var console=k;console.log(1);");
		// Where no list holds it, it prints as the `undefined` it returns.
		expect(
			print("if(a)console.log(f());for(;;)console.log(1);x=console.log(2);", {
				drop_console: true
			})
		).toBe("if(a);for(;;);x=void 0;");
		// `pure_funcs` marks the calls it names pure, by how the callee is written.
		expect(
			print("foo(1);a.b.c(2);a.b.d(3);a[b].c(4);(0,foo)(5);", {
				pure_funcs: ["foo", "a.b.c"]
			})
		).toBe("a.b.d(3);a[b].c(4);(0,foo)(5);");
		expect(print("var x=foo(1);h(x);", { pure_funcs: ["foo"] })).toBe(
			"var x=foo(1);h(x);"
		);
		// `global_defs` replaces a global nothing sets with a primitive value.
		const defs = {
			global_defs: { DEBUG: false, VERSION: "1.2", "@code": "x", O: {} }
		};
		expect(print("if(DEBUG)x();g(VERSION,O);", defs)).toBe('g("1.2",O);');
		expect(print("DEBUG=1;g(DEBUG);", defs)).toBe("DEBUG=1;g(DEBUG);");
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
		).toBe('g((-1).toString(),-(-1),"number");');
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
			"var y={};t(function(){0==y;y<1});"
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
		expect(print(reads)).toBe("t(function(k){o[1];o.a});");
		expect(print(reads, { pure_conversions: false })).toBe(
			"t(function(k){(0)[k];o[1];o.a});"
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
		).toBe("class C extends B{constructor(){t(()=>{this});super()}}");
		expect(print("class C { constructor() { t(() => { this; }); } }")).toBe(
			"class C{constructor(){t(()=>{})}}"
		);
		// An async generator awaits what it returns, a tick a bare `return` skips.
		expect(
			print(
				"async function* g() { return undefined; } async function h() { return void 0; } t(g, h);"
			)
		).toBe("async function*g(){return void 0}async function h(){}t(g,h);");
		// A global read in a test folds nothing, and throws nothing.
		expect(print("if (!(1 < Infinity)) t();")).toBe("if(!(1<1/0))t();");
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
				'export function r(){Object.keys=()=>["k"];[Object.values]=[()=>1];return[Object.keys([1]),Object.values("a"),[["0","a"]]]}'
			],
			[
				'export function r(){delete Object["entries"];Object.keys.call;return[Object.keys([1]),Object.entries("a")]}',
				'export function r(){delete Object.entries;Object.keys.call;return[["0"],Object.entries("a")]}'
			],
			[
				'export function r(g){g(Object);return[Object.keys([1]),typeof Object,g instanceof Object]}',
				"export function r(e){e(Object);return[Object.keys([1]),typeof Object,e instanceof Object]}"
			],
			[
				'export function r(g){Object[g]=1;return Object.keys([1])}',
				"export function r(e){Object[e]=1;return Object.keys([1])}"
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
			"!function(){for(;;)g()}();!function(){for(;;)g()}(),h();h(),function(){for(;;)g()}();"
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
			"[a(),b()];x(),[...a],y();c?[...a]:d();z=function(){}(a());!function({a:n}){}(b);!function(n=g()){}(b);!async function(){}(b);"
		);
		// Branches printing alike print once, after the test where it runs anything.
		expect(
			print(
				'export function q(x,o){return[x?o["read"]():o.read(),1+(g(x)?o.read():o.read()),f(g(x)?o.r:o.r),(x?o.f:o.f)(),delete(x?o.f:o.f),typeof(x?y:y)]}export function s(x,o){x?o.f():o.f();g(x)?o.f():o.f()}'
			)
		).toBe(
			"export function q(o,x){return[x.read(),1+(g(o),x.read()),f((g(o),x.r)),(o?x.f:x.f)(),delete(o?x.f:x.f),typeof(o?y:y)]}export function s(o,f){f.f();g(o),f.f()}"
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
			"!function(){try{throw 1}finally{return}}();x=function(){try{g()}finally{return 2}}();!function(){if(g())return;for(;;)h()}();!async function(){g();return 1}();!function(){g();return h()}();a(),(()=>{g();return})(),b();(function*(){return 1})().next();"
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
			["(()=>{it(1);it(2)})()", "it(1);it(2);"],
			["(function(){if(x){let y=g();h(y)}})()", "if(x)h(g());"],
			["(()=>{var a=1;g(a)})()", "g(1);"],
			["(()=>{g(this,()=>{return 1})})()", "g(this,()=>1);"],
			["(()=>{let a=g();h(a);h(a)})()", "(()=>{let a=g();h(a);h(a)})();"],
			["(()=>{class A{}g(A,A)})()", "(()=>{class A{}g(A,A)})();"],
			["(()=>{if(x){function f(){}g(f,f)}})()", "(()=>{if(x){function f(){}g(f,f)}})();"],
			["(()=>{for(;;){var a=g();h(a,a)}})()", "(()=>{for(;;){var a=g();h(a,a)}})();"],
			['(()=>{"use strict";g()})()', '(()=>{"use strict";g()})();'],
			["(()=>{if(x)return;g()})()", "x||g();"],
			["(()=>{eval(x)})()", "(()=>{eval(x)})();"],
			["(function(){g(this)})()", "!function(){g(this)}();"],
			["(function(){g(arguments)})()", "!function(){g(arguments)}();"],
			["(function(a){g(a)})(1)", "!function(){g(1)}();"],
			["(()=>{g()})();h()", "g();h();"]
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
			"export function f(r){r.add([r=>r+1])}export function g(r){var t;return[t,r()]}export function h(){var r;return r=r||1}export function k(r){let t;t=r();switch(r){case 1:var a;a=r();r(a,a)}return[t,t]}"
		);
		// A `let` nothing reads loses the writes of closures made once it is set,
		// not of one made before it, of a function declaration, or a closure that reads it.
		expect(
			print(
				"export function a(v){let s,k=function(x){s=x;g(x)};v.forEach(x=>{s=x});v.forEach(k)}export function b(r){const w=()=>{p=r};w();let p;w()}export function c(r){function w(){p=r}let p;w()}export function d(v){let s;v.forEach(x=>{s=x});return()=>s}"
			)
		).toBe(
			"export function a(t){t.forEach(t=>{});t.forEach(function(t){g(t)})}export function b(t){let n=()=>{o=t};n();let o;n()}export function c(t){let n;(function(){n=t})()}export function d(t){let n;t.forEach(t=>{n=t});return()=>n}"
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
			"export function a(){return 1}export function b(){return 7}export function c(){return n;var n}export function d(){return function(){}}export function e(){for(;;){if(a)break;continue}}"
		);
		// A constant passed to a function called once is its parameter's value.
		expect(
			print(
				'export const r=[function(a,b,c){return a+b+c}(1,g(),"s"),(x=>x*2)(3),function(x){x=2;return x}(1),function(x){return arguments[0]+x}(1),function f(x){return f.length+x}(1),function(x){return x}(1,2),function(x,y){return x+y}(...a)];export function m(){function n(y){return h(y,y)}return n(1)}'
			)
		).toBe(
			"export const r=[function(t){return 1+t+\"s\"}(g()),(()=>6)(),function(n){return 2}(1),function(n){return arguments[0]+n}(1),function n(t){return n.length+t}(1),function(){return 1}(2),function(n,t){return n+t}(...a)];export function m(){return function(){return h(1,1)}()}"
		);
		// A function called where nothing reads the call prints as what it runs.
		expect(
			print(
				"export function u(y,r){(function(x){if(x)return 3;r(x)})(y);(()=>{if(r(1))return 4;r(2)})();(function(x){r(x);r(1)})(y);(function(){if({}.a)return;r()})();(function(x){if(x)return;r(x,()=>x)})(y)}export function v(y,r){(function(x){if(x=y)return;r(x)})(y)}export function w(y,r){(function(x){if(x)return y=1;r(x)})(y)}"
			)
		).toBe(
			"export function u(r,n){r||n(r);n(1)||n(2);n(r),n(1);!function(){if({}.a)return;n()}();!function(r){if(r)return;n(r,()=>r)}(r)}export function v(r,n){!function(t){if(t=r)return;n(t)}(r)}export function w(r,n){!function(t){if(t)return r=1;n(t)}(r)}"
		);
		// A constant passed on as a name folds where it is read, after what
		// always returns, and through `new`.
		expect(
			print(
				"export function t(r){return(function(y){let a=(function(x){if(x)return 7;r(x)})(y);let c=new function(x){if(x)return{b:9};this.b=0}(y);return[a,c]})(1)}"
			)
		).toBe(
			"export function t(n){return function(){return[function(){return 7}(),new function(){return{b:9}}()]}()}"
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
			"export function p(e,f,o){[e][0]=2;f.a=3;return[e,[o][0](),2,{b:e},[...[2,3]],[e,o()][0],delete[e][0]]}"
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
		).toBe("export const q=[`a`,`b\"`];g(`d'`);import(\"x\");");
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
			"export function f(n){return[(void 0)[n],1]}export function g(n){return(void 0)(n)}export const h=+-0;"
		);
		expect(
			print(
				"export function f(o){var e;o.a();e=o.test;e()}export class C extends B{#x;#m(){}}"
			)
		).toBe(
			"export function f(e){var o;e.a();(o=e.test)()}export class C extends B{#e;#o(){}}"
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
			"export var c;!function n(){(a--&&n()).p;return{get p(){c=1}}}();!function(){!function(n){n=n&&(c=2)}()}();"
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
			'export function run(f){"use strict";return(f=eval)("this")}export function t(f){g();return typeof(f=missing)}export function d(){g();return x=1;let x}'
		);
		// A call printing as what it runs, unread last in a sequence or under
		// `void` or `!`, prints bare.
		expect(
			print(
				"export function u(y,t){t(5),function(e){if(e)return e;t(e)}(y);void function(e){if(e)return t;t(6)}(y);!function(e){if(e)return;t(7)}(y);x=void function(e){t(e)}(y)}"
			)
		).toBe(
			"export function u(t,e){e(5),t||e(t);t||e(6);t||e(7);x=void function(t){e(t)}(t)}"
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
		).toBe("g(()=>function spread(a){h(a);return a}([]));");
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
		).toBe("function f(){g(()=>1);return 1}it(f());");
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
			expect(code).toBe("var o=read();Object.defineProperty(o);sink(o.o);");
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
		const { walkSyntaxTree } = require("../../../lib/javascript/syntax-parser");
		expect(() =>
			new SourceProcessor()
				.use({
					[NodeType.CallExpression]: (path) => {
						walkSyntaxTree(path.tree, path.node, "f()", [], undefined);
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
			"function f(a,b){if(a){return b in a}for(;;)x()} class A{m(){}} switch(x){case 1:y();break;default:z()} const o={a:1,b:[2,3]};";
		const print = (/** @type {object} */ options) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(source, {
					mode: "beautify",
					...options
				})
			).code;
		expect(print({})).toBe(
			"function f(a, b) {\nif (a) {\nreturn b in a;\n}\nfor (;;) x();\n}\nclass A {\nm() {}\n}\nswitch (x) {\ncase 1:\ny();\nbreak;\ndefault:\nz();\n}\nconst o = {a: 1, b: [ 2, 3 ]};"
		);
		// Minified as it is beautified, the layout is the same.
		expect(print({ compress: {}, mangle: {} })).toBe(
			"function f(a, c) {\nif (a) return c in a;\nfor (;;) x();\n}\nclass A {\nm() {}\n}\nswitch (x) {\ncase 1:\ny();\nbreak;\ndefault:\nz();\n}\nconst o = {a: 1, b: [ 2, 3 ]};"
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
			{ format: { code: false } }
		]) {
			await expect(
				jsMinify({ "a.js": "a()" }, undefined, options, false)
			).rejects.toThrow(/not supported/);
		}
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


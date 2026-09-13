"use strict";

/* eslint-disable no-template-curly-in-string */

/** @typedef {typeof import("../lib/javascript/parser")} ParserExports */
/** @typedef {Partial<import("../lib/javascript/parser").Options>} Options */

// acorn's typings omit half its exports, and the port's types are its contract
const acorn = /** @type {ParserExports} */ (
	/** @type {unknown} */ (require("acorn"))
);
const {
	Parser,
	Position,
	SourceLocation,
	defaultOptions,
	getLineInfo,
	isIdentifierChar,
	isIdentifierStart,
	isNewLine,
	keywordTypes,
	stringToNumber,
	tokContexts,
	tokTypes
} = require("../lib/javascript/parser");

// The base parser is what `Parser.parse`, acorn plugins and the tokenizer
// reach; a build never does, so this holds it to acorn on its own.

/** @type {string[]} */
const PROGRAMS = [
	// statements
	"var a = 1, b; let c = 2; const d = 3;",
	"if (a) b; else if (c) d; else { e; }",
	"for (var i = 0; i < 10; i++) { continue; }",
	"for (let [k, v] of map) {}\nfor (const k in obj) {}\nfor (;;) break;",
	"for (a in b) {}\nfor ((a) of b) {}\nfor (var x = 1 in y) {}",
	"lbl: for (;;) { inner: for (;;) { continue lbl; } break lbl; }",
	"while (x) do y; while (z)",
	"switch (a) { case 1: b; break; default: c; case 2: }",
	"try { a } catch { b } finally { c }",
	"try { a } catch (e) { b } catch2: {}",
	"try { a } catch ({ message }) { b }",
	"throw new Error('x')",
	"with (obj) { a }",
	"debugger;",
	"function f(a, b = 1, ...rest) { return a }",
	"function* g() { yield; yield 1; yield* h(); }",
	"async function h() { await x; for await (const y of z) {} }",
	"function f() { 'use strict'; with (a) {} }",
	"function f() { 'a'; 'use strict'; 010 }",
	"function f() { 'use\\x20strict'; with (a) {} }",
	"'use strict'; var let = 1;",
	"var let = 1; let\nx = 2;",
	"let\n[a] = b;",
	"var yield = 1; var await = 2; var async = 3; async\nfunction f() {}",
	"class A extends B { constructor() { super(); } static s() {} get g() {} set s(v) {} #p = 1; static #q; static { this.x } m() { return #p in this } }",
	"class A { 'constructor'() {} static constructor() {} async *[Symbol.iterator]() {} }",
	"class A { static async method() { await 1 } }",
	"class A { field; static field2 = 2; ['computed'] = 3 }",
	"var o = { a, b: 1, [c]: 2, d() {}, get e() {}, set e(v) {}, async f() {}, *g() {}, async *h() {}, ...spread, __proto__: null };",
	"var o = { __proto__: 1, __proto__: 2 };",
	"({ __proto__: 1, __proto__: 2 } = x);",
	"var [a, , b = 1, ...c] = d; var { e, f: g, h = 2, ...i } = j;",
	"[a, b] = [b, a]; ({ a, b } = c); [a.b, c[d]] = e;",
	"(a, b) => a + b; a => { return a }; async (a) => await a; async a => a; () => {};",
	"(a = 1, { b }, [c], ...d) => 0",
	"var f = (a, b) => (c, d) => e;",
	"x = a ? b : c ? d : e;",
	"x = a ?? b; x = a?.b?.[c]?.(d); x = a?.b.c(); x = (a?.b).c;",
	"x = a || b && c | d ^ e & f == g != h === i !== j < k > l <= m >= n << o >> p >>> q + r - s * t / u % v ** w;",
	"x = -a ** 2; x = (-a) ** 2; x = 2 ** -1;",
	"x = !a; x = ~a; x = +a; x = -a; x = typeof a; x = void a; x = delete a.b; x = ++a; x = a--;",
	"a += 1; a -= 1; a *= 1; a /= 1; a %= 1; a **= 1; a <<= 1; a >>= 1; a >>>= 1; a &= 1; a |= 1; a ^= 1; a &&= 1; a ||= 1; a ??= 1;",
	"x = a.b.c[d](e)(f)`g`; x = new A; x = new A(); x = new A.B(); x = new (a())(); x = new new A()();",
	"x = a\n(b)\n[c]\n`d`",
	"x = `a${b}c${`d${e}f`}g`; x = tag`a${b}\\u{1F600}`; x = tag`\\unicode`;",
	"x = /ab+c/gi; x = /[/]/; x = a / b / c; x = /=/; x = a /=/ b/;",
	"x = 010; x = 08; x = 0b101; x = 0o17; x = 0xff; x = 1e3; x = .5; x = 5.; x = 1_000; x = 0.5e-3; x = 10n; x = 0x1fn;",
	"x = 'a\\nb\\x41\\u0041\\u{41}\\0\\\nc'; x = \"\\'\\\"\"; x = '\\08';",
	"x = '\\1';",
	"var \\u0061bc = 1; var \\u{62} = 2; var ℮ = 3; var \\u{1d4d1} = 4; var ゛ = 5;",
	"x = this; x = null; x = true; x = false; x = undefined; x = NaN;",
	"x = (a, b); x = (a); x = ((a));",
	"x = a in b; for (var i = (a in b); ;) break;",
	"x = { a: 1 } . a; x = [ 1, , 2, ...a ];",
	"function f() { return\n1 }",
	"a\n++b",
	"a = b\n(c)",
	"if (a) function f() {}",
	"label: function f() {}",
	"x = function f() { f = 1 }; x = function () {}; x = async function () {}; x = function* () {};",
	"x = class {}; x = class A extends (B) {};",
	"new.target",
	"function f() { new.target }",
	"x = { get [a]() {}, set [b](v) {}, async [c]() {}, *[d]() {} }",
	"x = a => a\n=> b",
	"(function () { 'use strict'; })(); (() => { 'use strict' })();",
	"#!/usr/bin/env node\nx = 1;",
	"<!-- html comment\nx = 1; --> also\n",
	"/* block */ x = 1; // line\n/** doc */ y = 2; /*\nmulti\n*/",
	"x = a\n/b/g",
	"x = { if: 1, class: 2, function: 3 }; x.if; x.class;",
	"x = a.#b;",
	"async () => { for await (x of y) {} }",
	"(async function* () { yield await 1; })();",
	"x = a ? b : c => d;",
	"x = (a, b, c) => 1;",
	"x = ((a)) => 1;",
	"x = ([a]) => 1; x = ({a}) => 1; x = ({a = 1}) => 1;",
	"x = { a = 1 } = b;",
	"[a = 1, { b = 2 }] = c;",
	"x = a?.b`c`;",
	"x = new a?.b();",
	"x = a?.[b] = 1;",
	"x = (a?.b) = 1;",
	"x = a.b = c;",
	"x = 1 = 2;",
	"x = a++ = 1;",
	"++a++;",
	"x = { a: 1 } = 2;",
	"x = [1] = 2;",
	"x = (a) = 1;",
	"((a)) = 1;",
	"({a}) = 1;",
	"([a]) = 1;",
	"x = yield;",
	"function* g() { var yield; }",
	"function* g() { yield\n* 1 }",
	"async function f() { var await; }",
	"async function f() { await\n1 }",
	"function f(a, a) {}",
	"'use strict'; function f(a, a) {}",
	"function f(a = 1) { 'use strict' }",
	"let a; let a;",
	"let a; var a;",
	"var a; let a;",
	"{ let a; var a; }",
	"function f() {} let f;",
	"switch (x) { case 1: let a; case 2: let a; }",
	"try {} catch (e) { let e; }",
	"try {} catch (e) { var e; }",
	"try {} catch ([e]) { var e; }",
	"for (let a of b) { var a; }",
	"label: label: x;",
	"break;",
	"continue;",
	"return;",
	"x = { a: 1, a: 2 };",
	"'use strict'; x = { a: 1, a: 2 };",
	"'use strict'; 010;",
	"'use strict'; '\\08';",
	"'use strict'; eval = 1; arguments = 2; var eval;",
	"'use strict'; var implements; var package = 1;",
	"var implements; var package = 1;",
	"class A { constructor() {} constructor() {} }",
	"class A { get constructor() {} }",
	"class A { static prototype() {} }",
	"class A { #a; #a; }",
	"class A { #constructor; }",
	"class A { m() { this.#missing } }",
	"class A extends B { constructor() { super.x; } } class C { m() { super(); } }",
	"function f() { super.x }",
	"x = { m() { super.x } }",
	"a?.b = 1;",
	"a?.`b`;",
	"new a?.b;",
	"x = a ?? b || c;",
	"x = a || b ?? c;",
	"x = (a || b) ?? c;",
	"x = 1n + 2;",
	"x = 08n;",
	"x = 1_;",
	"x = 1__0;",
	"x = 0_1;",
	"x = 0x_1;",
	"x = 1e_1;",
	"x = 1.e1;",
	"x = 3in [];",
	"x = 3.toString();",
	"x = 'unterminated",
	"x = `unterminated",
	"x = /unterminated",
	"x = /a/gg;",
	"x = /a/z;",
	"x = /(?<n>a)\\k<m>/;",
	"x = /\\u{110000}/u;",
	"/* unterminated",
	"x = @;",
	"x = #;",
	"x = a.;",
	"x = a..b;",
	"x = ...a;",
	"f(...a, ...b, c,);",
	"f(,);",
	"function f(,) {}",
	"function f(...a,) {}",
	"(...a,) => 1",
	"(a,) => 1",
	"({...a,}) => 1",
	"x = { ...a, };",
	"[...a,] = b;",
	"[...a, b] = c;",
	"import a from 'a'; import * as b from 'b'; import { c, d as e, 'f' as g } from 'c'; import 'd'; import h, { i } from 'e'; import j, * as k from 'f';",
	"export default 1; export default function () {}",
	"export default function f() {} export function g() {} export class C {} export const a = 1, b = 2; export { a, b as c, d as 'e' }; export * from 'x'; export * as ns from 'y'; export { f } from 'z';",
	"export default async function () {} export default class {}",
	"export default (a, b);",
	"export { a }; var a;",
	"export { undefinedName };",
	"export var a; export var a;",
	"import a from 'a'; var a;",
	"import a from 'a'; import a from 'b';",
	"import { default } from 'a';",
	"import { a as default } from 'a';",
	"import.meta; import('x'); import('x', { with: { type: 'json' } });",
	"import a from 'a' with { type: 'json' }; export * from 'b' with { type: 'json' };",
	"import a from 'a' assert { type: 'json' };",
	"import a from 'a' with { type: 'json', type: 'x' };",
	"import a from 'a' with { 'type': 'json', [x]: 1 };",
	"new import('x')",
	"import('x', {}, extra)",
	"import()",
	"import.foo",
	"await 1;",
	"for await (x of y) {}",
	"x = await\n1;",
	"async () => await\n1",
	"x = { async\nm() {} }",
	"x = { async *m() {} }",
	"x = { get\na() {} }",
	"class A { async\nm() {} }",
	"class A { static\nm() {} static\n() {} }",
	"class A { static static() {} async async() {} get get() {} set set(v) {} }",
	"class A { 'a'() {} 1() {} [2]() {} }",
	"class A { a\nb }",
	"class A { a = 1\nb = 2 }",
	"class A { a; b() {} }",
	"class A { a = arguments }",
	"class A { a = () => arguments }",
	"class A { static { arguments } }",
	"class A { static { await } }",
	"class A { static { return } }",
	"class A { static { var await } }",
	"x = class { static #a; static m() { return this.#a } }",
	"var using = 1; using = 2; using\nx = 3;",
	"x = a ? b => c : d;",
	"x = a ? (b) => c : d => e;",
	"x = (a ? b : c) => d;",
	"async (a = await 1) => a",
	"async (a = yield) => a",
	"function* g() { (a = yield) => a }",
	"function f(a = arguments) {}",
	"'use strict'; function f(a = 1) {}",
	"function f(a = 1) { 'use strict'; }",
	"x = function(a = 1) { 'use strict'; }",
	"x = (a = 1) => { 'use strict'; }",
	"x = { m(a = 1) { 'use strict' } }",
	"class A { m(a = 1) { 'use strict' } }",
	"x = ((a, b)) => 1;",
	"x = (a, b) = 1;",
	"x = 1, a) => 2;",
	"x = a.b.c.d.e.f.g.h;",
	"x = a[b][c][d];",
	"x = a\n.b\n.c;",
	"x\n++\ny",
	"x\n--\ny",
	"throw\nx",
	"return\nx",
	"x = a, b = c, d;",
	"var a = b, c = d;",
	"let [a] = [1], { b } = { b: 2 };",
	"const a;",
	"const [a] = b, c;",
	"for (const a; ;) {}",
	"for (let a = 1, b; ; ) break;",
	"for (let of of []) {}",
	"for (let\nof of []) {}",
	"for (async of []) {}",
	"for (async of => 1;;) break;",
	"for (let.x of []) {}",
	"for (let in x) {}",
	"for (var a of b, c) {}",
	"for (a, b of c) {}",
	"for (a of b, c) {}",
	"for (var [a] = 1 of b) {}",
	"for (var a = 1 of b) {}",
	"for (const a = 1 in b) {}",
	"'use strict'; for (var a = 1 in b) {}",
	"if (a) let x = 1;",
	"if (a) class C {}",
	"if (a) const x = 1;",
	"if (a) async function f() {}",
	"while (a) function f() {}",
	"do function f() {} while (a)",
	"do x; while (a) y;",
	"do x\nwhile (a) y",
	"{ function f() {} function f() {} }",
	"'use strict'; { function f() {} function f() {} }",
	"{ function f() {} var f; }",
	"function f() { function g() {} let g; }",
	"function f() { let g; function g() {} }",
	"{ async function f() {} async function f() {} }",
	"{ function* f() {} function* f() {} }",
	"'use strict'; if (a) function f() {}",
	"async function f() { function await() {} }",
	"function* g() { function yield() {} }",
	"function f() { yield: 1 }",
	"'use strict'; function f() { yield: 1 }",
	"function* g() { yield: 1 }",
	"function f() { await: 1 }",
	"async function f() { await: 1 }",
	"await: 1",
	"x = { await: 1, yield: 2, async: 3, let: 4, static: 5 }; x.await; x.yield;",
	"x = { a: 1 }?.a;",
	"x = a?.b\n`c`",
	"x = a\n?.b",
	"x = a ?. 5 : 6;",
	"x = a?.5:6;",
	"x = 1?.5:6;",
	"x = a?.b?.c?.d;",
	"x = a?.b.c?.d.e;",
	"x = a?.[b?.c];",
	"delete a?.b;",
	"delete a;",
	"'use strict'; delete a;",
	"'use strict'; delete (a);",
	"'use strict'; delete ((a));",
	"delete this.#a;",
	"class A { #a; m() { delete this.#a } }",
	"class A { #a; m() { delete this?.#a } }",
	"class A { #a; m() { delete (this.#a) } }",
	"class A { #a; m() { #a in this; #a in #a in this; 1 + #a in this } }",
	"class A { #a; m() { #a } }",
	"class A { #a; m() { (#a) in this } }",
	"class A { m() { #a in this } }",
	"class A { #a; static m() { class B { n() { this.#a } } } }",
	"class A { #a; static m() { class B { #a; n() { this.#a } } } }",
	"class A { static #a() {} static m() { A.#a(); } }",
	"class A { get #a() {} set #a(v) {} }",
	"class A { get #a() {} get #a() {} }",
	"class A { get #a() {} static set #a(v) {} }",
	"class A { #a() {} get #a() {} }",
	"x = { #a: 1 };",
	"x = this.#a;",
	"class A { a = this.#b; #b = 1; }",
	"class A { #a = this.#b; }",
	"class A extends B { #a = super.b; }",
	"class A { static #a = A.#a; }",
	"class A extends (class {}) {}",
	"class A extends B, C {}",
	"class A extends async () => {} {}",
	"class A extends null {}",
	"class A extends new B {}",
	"class A extends B() {}",
	"class A extends B?.C {}",
	"class A extends a.b.c {}",
	"class A extends (a, b) {}",
	"class A {} class A {}",
	"'use strict'; class A {} class A {}",
	"class A { constructor() { super() } }",
	"class A extends B { m() { super() } }",
	"class A extends B { constructor() { () => super() } }",
	"class A extends B { constructor() { function f() { super() } } }",
	"class A extends B { constructor() { class C { constructor() { super() } } } }",
	"class A extends B { constructor() { class C extends D { constructor() { super() } } } }",
	"class A extends B { m = super() }",
	"class A extends B { m = () => super.x }",
	"class A extends B { static { super.x } }",
	"class A extends B { static { super() } }",
	"x = { m() { super() } }",
	"x = { m: function () { super.x } }",
	"x = { m() { () => super.x } }",
	"x = { m() { function f() { super.x } } }",
	"x = { get m() { super.x } }",
	"x = { m: () => super.x }",
	"function f() { new.target }",
	"x = () => new.target",
	"class A { m = new.target }",
	"class A { static { new.target } }",
	"function f() { () => new.target }",
	"new.target",
	"new.foo",
	"new.target = 1",
	"function f() { new.target = 1 }",
	"x = a\n`b`",
	"x = a`b`\n`c`",
	"x = `${a}${b}`",
	"x = `\\u{`",
	"x = `\\u{110000}`",
	"x = `\\08`",
	"x = tag`\\u{`",
	"x = tag`\\08`",
	"x = tag`\\1`",
	"x = `\\1`",
	"x = `${}`",
	"x = `${a`",
	"x = `${a}",
	"x = `${a}}`",
	"x = `${{}}`",
	"x = `${a}${`${b}`}`",
	"x = a ?? `b`",
	"x = `\r\n\n\r\u2028\u2029`",
	"x = '\r\n'",
	"x = 'a\u2028b'",
	"x = '\\\r\n'",
	"x = '\\\u2028'",
	"x = 'a\\\rb'",
	"x = '\\u{}'",
	"x = '\\u{110000}'",
	"x = '\\u{1F600}'",
	"x = '\\x'",
	"x = '\\x4'",
	"x = '\\u'",
	"x = '\\u00'",
	"x = '\\u004'",
	"x = '\\u{41'",
	"x = '\\9'",
	"x = '\\09'",
	"x = '\\8'",
	"'use strict'; x = '\\8';",
	"'use strict'; x = '\\0';",
	"'use strict'; x = '\\00';",
	"function f() { '\\08'; 'use strict'; }",
	"function f() { 'use strict'; '\\08'; }",
	"function f() { 'use strict'; }\n'\\08'",
	"x = 'a' 'b'",
	"x = 1 2",
	"x = a b",
	"x = ,",
	"x = )",
	"x = ]",
	"x = }",
	"x = {",
	"x = [",
	"x = (",
	"x = ;",
	"x = ",
	"",
	";;;",
	"\n\n\n",
	"\uFEFFx = 1;",
	"x = 1;\uFEFF",
	"x\u200B = 1;",
	"x = \u2028 1;",
	"x = \u00A0 1;",
	"x = \uFEFF 1;",
	"x = \u1680 1;",
	"x = \u180E 1;",
	"\\u0061 = 1;",
	"\\u{61} = 1;",
	"\\u{110000} = 1;",
	"a\\u{62} = 1;",
	"a\\u0062 = 1;",
	"v\\u0061r a = 1;",
	"\\u0076ar a = 1;",
	"x = { \\u0061: 1 };",
	"x.\\u0061;",
	"x = tru\\u0065;",
	"x = t\\u0072ue;",
	"x = n\\u0075ll;",
	"x = th\\u0069s;",
	"x = typ\\u0065of a;",
	"\\u0069f (a) {}",
	"x = { i\\u0066: 1 }.i\\u0066;",
	"cl\\u0061ss A {}",
	"x = cl\\u0061ss {}",
	"\\u0066unction f() {}",
	"x = \\u0066unction () {}",
	"\\u0061sync function f() {}",
	"x = \\u0061sync () => 1;",
	"x = \\u0061sync\nfunction f() {}",
	"function* g() { yi\\u0065ld 1 }",
	"function* g() { y\\u0069eld 1 }",
	"async function f() { \\u0061wait 1 }",
	"f\\u006fr (;;) break;",
	"x = a\\u002eb;",
	"x = \\u0024;",
	"x = \\u005f;",
	"x = \\u0030;",
	"x = a\\u0030;",
	"x = \\u{2118}\\u{212E};",
	"x = \\u{1D4C1}\\u{1D4C2};",
	"x = ⅵ;",
	"x = \u2118;",
	"x = ℘;",
	"x = ℮;",
	"x = \u309B;",
	"x = ゛;",
	"x = \u{10000};",
	"x = 𐀀;",
	"x = \u{E0001};",
	"x = \uD800;",
	"x = \uDC00;",
	"x = '\uD800';",
	"x = \uD83D;",
	"x = 𝐀;",
	"x = \u{2B740};",
	"x = 𫝀;",
	"x = a\u200C\u200D;",
	"x = \u200C;",
	"x = a\u00B7;",
	"x = \u00B7;",
	"x = a\u0300;",
	"x = \u0300;",
	"x = a\u1885;",
	"x = \u1885;",
	"x = a\u2118;",
	"x = a\u309B;",
	"x = a\uFE00;",
	"x = \uFE00;",
	"x = a\u{E0100};",
	"x = a\u2170;",
	"x = \u2170;",
	"x = a\u2160;",
	"x = a\u212E;",
	"x = a\u2E2F;",
	"x = \u2E2F;",
	"x = \u2E2Fa;",
	// explicit resource management
	"using x = a; await using y = b;",
	"function f() { using x = a; using y = b, z = c; }",
	"async function f() { await using x = a; }",
	"function f() { await using x = a; }",
	"function f() { using x; }",
	"function f() { using [x] = a; }",
	"if (a) using x = b;",
	"lbl: using x = y;",
	"switch (a) { case 1: using x = y; }",
	"switch (a) { case 1: { using x = y; } }",
	"for (using x of y) {}",
	"async function f() { for (await using x of y) {} }",
	"function f() { for (await using x of y) {} }",
	"async function f() { for await (using x of y) {} }",
	"async function f() { for await (await using x of y) {} }",
	"for (using x in y) {}",
	"for (using x = a;;) {}",
	"for (using x = a, y = b; x; x++) {}",
	"for (using of y) {}",
	"for (using of = 1;;) break;",
	"for (using of == 1;;) break;",
	"for (using of => 1;;) break;",
	"for (using\nof y) {}",
	"for (using in y) {}",
	"function f() { using\nx = 1; }",
	"using = 1; using(x); using.x; using[0]; using++; using instanceof x;",
	"function f() { using \\u0078 = 1; }",
	"function f() { using in = 1; }",
	"function f() { using await = 1; }",
	"async function f() { await using\nx = 1; }",
	"async function f() { await using = 1; }",
	// destructuring and assignment targets
	"({ a = 1 });",
	"x = { a = 1 };",
	"f({ a = 1 });",
	"let { a } = b; let \\u0061 = 1;",
	"({...{a}} = b);",
	"({ get a() {} } = b);",
	"[...a = 1] = b;",
	"[a += 1] = b;",
	"[(a = 1)] = b;",
	"({ a: (b = 1) } = c);",
	"(...a, b) => 1;",
	"(a, ...b, c) => 1;",
	"function f({ a: [b] }, [{ c }]) {}",
	"let let = 1;",
	"const let = 1;",
	"let [let] = a;",
	"[a?.b] = c;",
	"for (a?.b of c) {}",
	"({ a: b?.c } = d);",
	"let [a.b] = c;",
	"function f([a.b]) {}",
	"let [(a)] = b;",
	"[(a)] = b; [((a))] = b;",
	"x = ((a) = 1);",
	"(a = 1) ? b : c;",
	"[({ __proto__: 1, __proto__: 2 })] = x;",
	"switch ({ __proto__: 1, __proto__: 2 }) {}",
	"if ({ __proto__: 1, __proto__: 2 }) {}",
	"x = { ['__proto__']: 1, __proto__: 2 };",
	"x = { 1: 1, 1: 2, '1': 3 };",
	"(a, b,) => 1;",
	"[a, b,] = c;",
	"async function f() { (await) => 1 }",
	"async (await) => 1;",
	"async function f() { async (a = await 1) => a }",
	"async function f() { ({ await } = x); }",
	"async function f() { x = { await }; }",
	"async function f() { [await] = x; }",
	"x = (); x = (a,); x = (...a);",
	"x = { 1 };",
	"x = { 'a' };",
	"({ a() {} } = b);",
	"x = { *a };",
	"x = { async a };",
	"x = { async *a };",
	"x = { get a(b) {} };",
	"x = { set a() {} };",
	"x = { set a(...b) {} };",
	"function f(...a, b) {}",
	"let [...a, b] = c;",
	// statements
	"if (a) { import b from 'c'; }",
	"function f() { export const x = 1; }",
	"break 1;",
	"continue 1;",
	"a: { break a; }",
	"a: { continue a; }",
	"a: b: while (1) { break a; continue b; }",
	"a: while (1) { b: { break a; } }",
	"async function f() { for await (;;) {} }",
	"async function f() { for await (x in y) {} }",
	"async function f() { for await (var x = 1;;) {} }",
	"async function f() { for await (let x of y) {} }",
	"for (let a, b of c) {}",
	"for (var a, b in c) {}",
	"switch (a) { default: default: }",
	"switch (a) { x; }",
	"try {}",
	"let [a]; let { b };",
	"var 1 = 2;",
	"{ {} }",
	"x = {{}};",
	"{ { a } }",
	"x = async\n(a) => 1;",
	"x = async\nfunction () {};",
	"async\n(a);",
	// classes
	"class A { ; m() {} ; }",
	"class A { static 'prototype'() {} }",
	"class A { 'constructor' = 1 }",
	"class A { *constructor() {} }",
	"class A { async constructor() {} }",
	"class A { get a(b) {} }",
	"class A { set a() {} }",
	"class A { set a(...b) {} }",
	"class A { constructor = 1 }",
	"class A { static prototype = 1 }",
	"class A { static constructor = 1 }",
	"class {}",
	"class A extends B { m() { super; } }",
	"class A extends B { m() { super.#a } }",
	// modules
	"export * as 'string name' from 'x';",
	"export * as ns from 5;",
	"export * from 5;",
	"export { a } from 'b' with { type: 'json' };",
	"export { a } from 5;",
	"export { 'a' };",
	"export { 'a' as b };",
	"export default class A {}",
	"export default class A extends B {}",
	"export const [a, { b }, ...c] = d; export let { e = 1, ...f } = g;",
	"export var [a = 1, [b]] = c;",
	"export { a, }; var a;",
	"export { a as b, c as d, }; var a, c;",
	"import { a, } from 'b';",
	"import { a as b, } from 'b';",
	"import a from 'b' with { type: 'json', };",
	"import a from 5;",
	"import 5;",
	"export { a as '\\uD800' }; var a;",
	"export { a as '\\uD83D\\uDE00' }; var a;",
	"im\\u0070ort('a');",
	"import('x',);",
	"import('x', {},);",
	"import('x', {}, );",
	"import.m\\u0065ta;",
	"x = \\u006Eew A;",
	"function f() { new.tar\\u0067et }",
	"function f() { \\u006Eew.target }",
	// tokens
	"// a\r\nx = 1;",
	"/* a\r\nb */ x = 1;",
	"x = 1;\n--> comment\ny = 2;",
	"x = 1;\n  --> comment",
	"/* a */ --> b\nx = 1;",
	"x = 1 --> 0;",
	"x = a\n--> b",
	"x = /a\nb/;",
	"x = /a/\\u0067;",
	"x = /a/g\\u0069;",
	"x = 0x1g;",
	"x = 0b12;",
	"x = 0o8;",
	"x = 0xg;",
	"x = 0x;",
	"x = 0b;",
	"x = 1a;",
	"x = 1_a;",
	"x = 1.a;",
	"x = 1e;",
	"x = 1n_;",
	"x = 08.5;",
	"x = 09n;",
	"x = `a\r\nb`;",
	"x = `a$b`; x = `$`; x = `a$`;",
	"x = tag`\\u{\r\n$x`;",
	"x = tag`\\1\n\r\n\r`;",
	"x = tag`\\1",
	"x = tag`\\1${a}\\2`;",
	"x = tag`\\1$`;",
	"x = tag`\\1${`;",
	"x = '\\r\\t\\b\\v\\f';",
	"x = a ? /b/ : /c/; x = [/a/, /=b/];",
	"x = a\n/b/\n/c/",
	"x = { a: /b/ };",
	"x = f(/a/, /b/);",
	"x = !/a/;",
	"x = typeof /a/;",
	"x = `${/a/}`;",
	"if (/a/) /b/;",
	"switch (/a/) { case /b/: }",
	"x = a++ / 2; x = a-- /2/ 1;",
	"x = a\n++/b/i.test(c)",
	// second pass over the grammar's remaining branches
	"let a\\u0062 = 1;",
	"function f() { using a\\u0062 = 1; }",
	"for (async of x) {}",
	"for ((async) of x) {}",
	"for (\\u0061sync of x) {}",
	"async function f() { for await (using x in y) {} }",
	"if (a) function* f() {}",
	"label: function* f() {}",
	"class A { get; set; }",
	"class A { get = 1; set() {} static get; }",
	"import a from 'b' with { type: json };",
	"async function f() { [\\u0061wait] = 1 }",
	"async function f() { ({ \\u0061wait } = 1) }",
	"async function f() { \\u0061wait = 1 }",
	"async function f() { (\\u0061wait) => 1 }",
	"(a.b) => 1;",
	"([a.b]) => 1;",
	"([(a)]) => 1;",
	"({ a: (b) }) => 1;",
	"++a?.b;",
	"a?.b++;",
	"for (a?.b in c) {}",
	"([...a.b]) => 1;",
	"([...[a]]) => 1;",
	"function f(...[a]) {}",
	"function f(...{ a }) {}",
	"function f(a, b,) {}",
	"function f() { return\n{ a } }",
	"function f() { return { a } }",
	"function* g() { yield\n{ a: 1 } }",
	"function* g() { yield { a: 1 } }",
	"for (x of\n{}) {}",
	"x = !{ __proto__: 1, __proto__: 2 };",
	"x = typeof { __proto__: 1, __proto__: 2 };",
	"x = a + { __proto__: 1, __proto__: 2 };",
	"x = { __proto__: 1, __proto__: 2, a: b = 1 };",
	"[(a), b] = c;",
	"x = [(a), b];",
	"x = #a in b;",
	"class A { #a; m() { for (#a in this;;) {} } }",
	"class A { #a; m() { x = (#a) in this } }",
	"x = [a,].b;",
	"x = [a,].b = c;",
	"x = (...a);",
	"x = (a, ...b);",
	"class A extends B { constructor() { new super; } }",
	"class A extends B { constructor() { new super(); } }",
	"let { ...a, b } = c;",
	"function f({ ...a, b }) {}",
	"x = { *a: 1 };",
	"x = { async a: 1 };",
	"let { a() {} } = b;",
	"x = { *get a() {} };",
	"x = { async get a() {} };",
	"x = { await };",
	"async ({ await }) => 1;",
	"function f() { x = { await }; async () => 1; }",
	"x = tag`\\1\\2`;",
	"x = tag`\\1\\``;",
	"x = `\\8`;",
	"x = `\\9`;",
	"x = '\\777'; x = '\\400'; x = '\\377';",
	"x = '\\7'; x = '\\77'; x = '\\08a';",
	"x = a\\b;",
	"x = \\x;",
	"x = a ? function () {} : b;",
	"x = a ? class {} : b;",
	"x = { a: function () {} };",
	"switch (a) { case function () {}: }",
	"x = a ? function : b;",
	"x = { a: function };"
];

/** @type {[string, Record<string, unknown>][]} */
const OPTION_SETS = [
	["script, latest", { ecmaVersion: "latest", sourceType: "script" }],
	["module, latest", { ecmaVersion: "latest", sourceType: "module" }],
	["commonjs, latest", { ecmaVersion: "latest", sourceType: "commonjs" }],
	["script, es3", { ecmaVersion: 3 }],
	["script, es5", { ecmaVersion: 5 }],
	["script, es2015", { ecmaVersion: 2015 }],
	["script, es2017", { ecmaVersion: 2017 }],
	["script, es2018", { ecmaVersion: 9 }],
	["module, es2020", { ecmaVersion: 2020, sourceType: "module" }],
	["module, es2022", { ecmaVersion: 2022, sourceType: "module" }],
	[
		"script with locations",
		{ ecmaVersion: "latest", sourceType: "script", locations: true }
	],
	[
		"module with locations and ranges",
		{
			ecmaVersion: "latest",
			sourceType: "module",
			locations: true,
			ranges: true
		}
	],
	[
		"script with a source file",
		{ ecmaVersion: "latest", locations: true, sourceFile: "a.js" }
	],
	[
		"script starting at a given location",
		{
			ecmaVersion: "latest",
			locations: true,
			startLocation: { line: 5, column: 3 }
		}
	],
	[
		"script with a direct source file",
		{ ecmaVersion: "latest", directSourceFile: "a.js" }
	],
	[
		"script with everything allowed",
		{
			ecmaVersion: "latest",
			allowReturnOutsideFunction: true,
			allowImportExportEverywhere: true,
			allowAwaitOutsideFunction: true,
			allowSuperOutsideMethod: true,
			allowHashBang: true,
			allowReserved: true
		}
	],
	[
		"script with reserved words refused",
		{ ecmaVersion: "latest", allowReserved: "never" }
	],
	[
		"script with parens preserved",
		{ ecmaVersion: "latest", preserveParens: true }
	],
	[
		"module with private fields unchecked",
		{ ecmaVersion: "latest", sourceType: "module", checkPrivateFields: false }
	],
	["script without hashbang", { ecmaVersion: "latest", allowHashBang: false }],
	["script, es2021 with hashbang", { ecmaVersion: 2021, allowHashBang: true }]
];

/**
 * A tree, comment or token as plain data, so acorn's and ours compare by value.
 * @param {unknown} value what to convert
 * @returns {unknown} the plain data
 */
const plain = (value) =>
	JSON.parse(
		JSON.stringify(value, (key, v) => {
			if (typeof v === "bigint") return `${v}n`;
			if (v instanceof RegExp) return { regexp: v.source, flags: v.flags };
			if (key === "type" && v && typeof v === "object" && "label" in v) {
				return { label: v.label };
			}
			return v;
		})
	);

/**
 * What a parser makes of a program: its tree, comments and tokens, or the
 * error it threw with where it was raised.
 * @param {(source: string, options: EXPECTED_ANY) => unknown} parse the parser
 * @param {string} source the program text
 * @param {Record<string, unknown>} options parse options
 * @returns {unknown} the outcome as plain data
 */
const outcomeOf = (parse, source, options) => {
	/** @type {unknown[]} */
	const comments = [];
	/** @type {unknown[]} */
	const tokens = [];
	try {
		const ast = parse(source, {
			...options,
			onComment: comments,
			onToken: tokens
		});
		return {
			ast: plain(ast),
			comments: plain(comments),
			tokens: plain(tokens)
		};
	} catch (err) {
		const error =
			/** @type {Error & { pos?: number, loc?: unknown, raisedAt?: number }} */ (
				err
			);
		return {
			error: error.message,
			pos: error.pos,
			loc: plain(error.loc),
			raisedAt: error.raisedAt
		};
	}
};

describe("Parser", () => {
	describe("parses like acorn", () => {
		for (const [name, options] of OPTION_SETS) {
			it(`for every program as ${name}`, () => {
				const differences = [];
				let rejected = 0;
				for (const source of PROGRAMS) {
					const ours = outcomeOf(
						(code, opts) => Parser.parse(code, opts),
						source,
						options
					);
					const theirs = outcomeOf(
						(code, opts) => acorn.Parser.parse(code, opts),
						source,
						options
					);
					if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
						differences.push({ source, ours, theirs });
					}
					if ("error" in /** @type {{ error?: string }} */ (theirs)) rejected++;
				}
				expect(differences).toEqual([]);
				expect(rejected).toBeGreaterThan(0);
				expect(rejected).toBeLessThan(PROGRAMS.length);
			});
		}
	});

	describe("static entry points", () => {
		it("parses an expression at an offset like acorn", () => {
			const source = "let x = a ? b : c; // rest";
			/** @type {Options} */
			const options = { ecmaVersion: "latest", locations: true, ranges: true };
			expect(plain(Parser.parseExpressionAt(source, 8, options))).toEqual(
				plain(acorn.Parser.parseExpressionAt(source, 8, options))
			);
		});

		it("tokenizes like acorn", () => {
			const source = "let x = /re/g + `t${y}` .5 0b1 'a' // c\nb";
			/** @type {Options} */
			const options = { ecmaVersion: "latest", locations: true, ranges: true };
			expect(plain([...Parser.tokenizer(source, options)])).toEqual(
				plain([...acorn.Parser.tokenizer(source, options)])
			);
			const tokenizer = Parser.tokenizer("a b", { ecmaVersion: 2020 });
			expect(tokenizer.getToken().value).toBe("a");
			expect(tokenizer.getToken().value).toBe("b");
			expect(tokenizer.getToken().type).toBe(tokTypes.eof);
		});

		it("applies acorn plugins through extend", () => {
			let parses = 0;
			/** @type {(BaseParser: typeof Parser) => typeof Parser} */
			const counting = (BaseParser) =>
				class extends BaseParser {
					/**
					 * @returns {ReturnType<Parser["parse"]>} the program
					 */
					parse() {
						parses++;
						return super.parse();
					}
				};
			const Extended = Parser.extend(counting);
			expect(Extended).not.toBe(Parser);
			expect(Parser.extend()).toBe(Parser);
			const ast = Extended.parse("a + b * c", { ecmaVersion: 2020 });
			expect(ast.type).toBe("Program");
			expect(parses).toBe(1);
			expect(plain(ast)).toEqual(
				plain(
					acorn.Parser.extend(counting).parse("a + b * c", {
						ecmaVersion: 2020
					})
				)
			);
		});

		it("normalizes options like acorn", () => {
			const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
			try {
				expect(Parser.parse("x", {}).type).toBe("Program");
				expect(Parser.parse("y", {}).type).toBe("Program");
				expect(warn).toHaveBeenCalledTimes(1);
				expect(warn.mock.calls[0][0]).toMatch(/ecmaVersion is required/);
			} finally {
				warn.mockRestore();
			}
			expect(() =>
				Parser.parse("x", {
					ecmaVersion: "latest",
					sourceType: "commonjs",
					allowAwaitOutsideFunction: true
				})
			).toThrow(/allowAwaitOutsideFunction with sourceType: commonjs/);
			expect(() =>
				acorn.Parser.parse("x", {
					ecmaVersion: "latest",
					sourceType: "commonjs",
					allowAwaitOutsideFunction: true
				})
			).toThrow(/allowAwaitOutsideFunction with sourceType: commonjs/);
			expect(Object.keys(defaultOptions).sort()).toEqual(
				Object.keys(acorn.defaultOptions).sort()
			);
		});

		it("reports inserted semicolons and trailing commas like acorn", () => {
			const source = "a\nb\nf(c,)\nx = [d,]\nreturn";
			/** @type {(parse: typeof Parser.parse) => unknown[][]} */
			const eventsOf = (parse) => {
				/** @type {unknown[][]} */
				const events = [];
				parse(source, {
					ecmaVersion: "latest",
					locations: true,
					allowReturnOutsideFunction: true,
					onInsertedSemicolon: (end, loc) =>
						events.push(["semicolon", end, plain(loc)]),
					onTrailingComma: (end, loc) => events.push(["comma", end, plain(loc)])
				});
				return events;
			};
			const ours = eventsOf((code, opts) => Parser.parse(code, opts));
			expect(ours).not.toHaveLength(0);
			expect(ours).toEqual(
				eventsOf((code, opts) => acorn.Parser.parse(code, opts))
			);
		});

		it("appends to a program node the caller continues", () => {
			const program = acorn.Parser.parse("a;", { ecmaVersion: 2020 });
			const continued = Parser.parse("b;", { ecmaVersion: 2020, program });
			expect(continued).toBe(program);
			expect(continued.body.map((node) => node.type)).toEqual([
				"ExpressionStatement",
				"ExpressionStatement"
			]);
		});
	});

	describe("helpers", () => {
		it("maps offsets to lines like acorn", () => {
			const input = "a\nbb\r\nccc\u2028d";
			for (const offset of [0, 1, 2, 4, 5, 6, 7, 10, 11, 12]) {
				expect(plain(getLineInfo(input, offset))).toEqual(
					plain(acorn.getLineInfo(input, offset))
				);
			}
			expect(new Position(3, 4).offset(2)).toEqual(new Position(3, 6));
			expect(
				new SourceLocation(
					/** @type {EXPECTED_ANY} */ ({ sourceFile: "f.js" }),
					new Position(1, 0),
					new Position(1, 1)
				).source
			).toBe("f.js");
		});

		it("classifies identifier characters like acorn", () => {
			for (const code of [
				0x24, 0x30, 0x41, 0x5f, 0x61, 0xaa, 0x2118, 0x309b, 0x10000, 0xe0001,
				0x200c, 0xb7, 0x300
			]) {
				expect(isIdentifierStart(code, true)).toBe(
					acorn.isIdentifierStart(code, true)
				);
				expect(isIdentifierChar(code, true)).toBe(
					acorn.isIdentifierChar(code, true)
				);
				expect(isIdentifierStart(code, false)).toBe(
					acorn.isIdentifierStart(code, false)
				);
				expect(isIdentifierChar(code, false)).toBe(
					acorn.isIdentifierChar(code, false)
				);
			}
			for (const code of [10, 13, 0x2028, 0x2029, 32, 0xa0]) {
				expect(isNewLine(code)).toBe(acorn.isNewLine(code));
			}
		});

		it("reads numbers like acorn", () => {
			expect(stringToNumber("010", true)).toBe(8);
			expect(stringToNumber("0777", true)).toBe(511);
			expect(stringToNumber("1e3", false)).toBe(1000);
			expect(stringToNumber("1_000.5", false)).toBe(1000.5);
		});

		it("exposes acorn's token tables", () => {
			expect(Object.keys(tokTypes).sort()).toEqual(
				Object.keys(acorn.tokTypes).sort()
			);
			expect(Object.keys(keywordTypes).sort()).toEqual(
				Object.keys(acorn.keywordTypes).sort()
			);
			expect(Object.keys(tokContexts).sort()).toEqual(
				Object.keys(acorn.tokContexts).sort()
			);
		});
	});
});

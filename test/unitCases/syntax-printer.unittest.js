"use strict";

// cspell:ignore binop, fnames, propmangle, fargs, domprops, argnames, nondeferred, loopcontrol, Defun, defun, NOINLINE, Funarg, unmangleable, Unmangleable, thedef, funs

const vm = require("vm");
const {
	FORMAT_DEFAULTS,
	IGNORED_FORMAT_OPTIONS,
	createCompressHelpers,
	createUnicode,
	estreeType,
	load,
	markEstreeTypes,
	PHASES
} = require("../../lib/javascript/syntax").printer;
const {
	loadTerserSources,
	thrownMessage
} = require("../helpers/terserSources");

/**
 * @param {string} specifier a module's URL
 * @returns {Promise<EXPECTED_ANY>} the module, imported through this file's runtime
 */
const importTerserSource = (specifier) => import(specifier);

/**
 * terser as published, the minifier the printer is held to.
 * @returns {{ minify: typeof import("terser").minify }} it
 */
const terserReference = () => /** @type {EXPECTED_ANY} */ (require("terser"));

/** @typedef {(input: EXPECTED_ANY, options: EXPECTED_ANY) => Promise<EXPECTED_ANY>} Minifying terser's `minify` or webpack's, for what both are given */

/**
 * Sources chosen for the decisions the mangler makes: which scope hands out a
 * name, and which names it may not hand out.
 * @type {[string, string, EXPECTED_OBJECT?][]}
 */
const CASES = [
	[
		"an object whose properties are hoisted into variables",
		`function area() {
			var box = { width: 2, height: 3 };
			sink(box.width, box.height);
		}
		sink(area);`
	],
	[
		"an object left whole where hoisting is off",
		`function area() {
			var box = { width: 2, height: 3 };
			sink(box.width, box.height);
		}
		sink(area);`,
		{ compress: { hoist_props: false } }
	],
	[
		"nested scopes",
		`function outer(first, second) {
			function inner(third) { return first + second + third; }
			return inner(1) + first;
		}
		sink(outer(1, 2));`
	],
	[
		"a name referenced from an inner scope",
		`const shared = 1;
		function reader() { const own = 2; return shared + own; }
		sink(reader());`
	],
	[
		"labels, which are numbered on their own",
		`outer: for (let i = 0; i < 10; i++) {
			inner: for (let j = 0; j < 10; j++) {
				if (j > i) continue outer;
				if (j === 3) break inner;
				sink(i, j);
			}
		}`
	],
	[
		"a catch parameter redefining a function-scoped name",
		`function run(error) {
			try { sink(error); } catch (error) { sink(error); }
			return error;
		}
		sink(run(1));`
	],
	[
		"a function expression whose argument could shadow its name",
		"sink(function named(argument) { return named && argument; });"
	],
	[
		"a function declared inside a block",
		`function host() {
			{ function blockScoped() { return 1; } sink(blockScoped()); }
			return typeof blockScoped;
		}
		sink(host());`
	],
	[
		"reserved names, which stay as written",
		"function keep(reservedName, other) { return reservedName + other; } sink(keep(1, 2));",
		{ mangle: { reserved: ["reservedName"] } }
	],
	[
		"exported names, which a module may not rename",
		"export const exported = 1; export function run(inner) { return inner + exported; }",
		{ module: true }
	],
	[
		"short exported names, which no scope hands out even where unseen",
		`export const z = 1, y = 2;
		export function crowded(${Array.from({ length: 60 }, (_, i) => `parameter${i}`).join(", ")}) {
			return sink(${Array.from({ length: 60 }, (_, i) => `parameter${i}`).join(", ")});
		}`,
		{ compress: false, module: true }
	],
	[
		"many names in one scope, where one-character names run out",
		`function crowded(input) {
			${Array.from({ length: 80 }, (_, i) => `let variable${i} = input + ${i};`).join("\n")}
			return ${Array.from({ length: 80 }, (_, i) => `variable${i}`).join("+")};
		}
		sink(crowded(1));`,
		// Compress folds the whole body away, and the names are the subject here.
		{ compress: false }
	],
	[
		"options this phase declines, which terser mangles itself",
		"function kept(argument) { return argument; } sink(kept(1));",
		{ mangle: { keep_fnames: true } }
	],
	[
		"class and method names beside mangled locals",
		`class Thing { constructor(value) { this.value = value; } read(offset) { return this.value + offset; } }
		sink(new Thing(1).read(2));`
	]
];

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

// What the `improve` phase writes shorter: a statement calling a function in
// place runs its body as a block, or in its list when nothing in it is scoped.
const TRY = "try { console.log(1); } catch (e) {}";

/** @type {[string, string, import("terser").MinifyOptions][]} */
const IMPROVED_CASES = [
	[
		"a function, its body joining the list",
		`!function () { ${TRY} console.log(2); }();`,
		{ compress: {}, mangle: false }
	],
	[
		"an arrow, its body joining the list",
		`(() => { ${TRY} console.log(2); })();`,
		{ compress: {}, mangle: false }
	],
	[
		"a call after `void`",
		`void function () { ${TRY} console.log(2); }();`,
		{ compress: {}, mangle: false }
	],
	[
		"a `let`, kept in a block",
		"!function () { let a = console.log.name; console.log(a, a); }();",
		{ compress: {}, mangle: false }
	],
	[
		"a class, kept in a block",
		"(() => { class A {} console.log(typeof new A(), A.name); })();",
		{ compress: {}, mangle: false }
	],
	[
		"a loop's body, which is no list",
		`for (const x of [1, 2]) (() => { ${TRY} console.log(x); })();`,
		{ compress: {}, mangle: false }
	],
	[
		"a loop's body declaring a `const`, one block",
		"for (const x of [1, 2]) (() => { const a = console.log.name + x; console.log(a, a); })();",
		{ compress: {}, mangle: false }
	],
	[
		"a string first, kept in a block",
		`(() => { ("x"); ${TRY} })();`,
		{ compress: { side_effects: false }, mangle: false }
	],
	[
		"an arrow reading `this`, which it shares",
		`(() => { ${TRY} console.log(typeof this); })();`,
		{ compress: {}, mangle: false }
	],
	[
		"a call between expressions, which terser joined in a sequence",
		`console.log(0); (() => { ${TRY} console.log(2); })(); console.log(3);`,
		{ compress: {}, mangle: false }
	],
	[
		"two calls in a sequence, one keeping a `let` in a block",
		`(() => { let a = console.log.name; console.log(a, a); })(); (() => { ${TRY} console.log(2); })();`,
		{ compress: { passes: 2 }, mangle: true }
	],
	[
		"a nested function reading its own `this`",
		`!function () { ${TRY} console.log([1].map(function () { return typeof this; })[0]); }();`,
		{ compress: {}, mangle: false }
	]
];

// What the `improve` phase leaves as terser writes it: each body has something
// of its function's own, or the call passes, keeps or constructs something.
/** @type {[string, string][]} */
const KEPT_CASES = [
	["a `var`", "!function () { var a = Math.random(); console.log(a, a); }();"],
	["a `return`", `!function () { for (const x of [1, 2]) { ${TRY} if (x) return; } console.log(2); }();`],
	["`this`", `!function () { ${TRY} console.log(this); }();`],
	["`arguments`", `!function () { ${TRY} console.log(arguments.length); }();`],
	["`new.target`", `!function () { ${TRY} console.log(new.target); }();`],
	["an arrow reading `this`", `!function () { ${TRY} [1].map(() => this); }();`],
	["an arrow calling `eval`", `!function () { ${TRY} [1].map(() => eval("this")); }();`],
	["a parameter given an argument", `!function (a) { ${TRY} console.log(a); }(Math.random());`],
	["a parameter given nothing", `!function (a) { ${TRY} console.log(a, a = Math.random()); }();`],
	["a name", `!function f() { ${TRY} console.log(f); }();`],
	["`async`", `!async function () { ${TRY} console.log(2); }();`],
	["a generator", `!function* () { ${TRY} console.log(2); }().next();`],
	["a function declaration", "!function () { function g() {} console.log(g, g); }();"],
	["a label", `!function () { a: for (;;) { ${TRY} break a; } console.log(2); }();`],
	["a directive", `!function () { "use strict"; ${TRY} console.log(2); }();`],
	["`eval`", `!function () { ${TRY} eval("1"); }();`],
	["`with`", "!function () { with (Math) console.log(PI); console.log(2); }();"],
	["`new`", `new function () { ${TRY} console.log(2); }();`],
	["an optional call", `(() => { ${TRY} console.log(2); })?.();`],
	["its value used", `console.log(function () { ${TRY} console.log(2); }());`],
	["a sequence calling nothing in place", "console.log(1); console.log(2);"],
	["`@__NOINLINE__`", `/*@__NOINLINE__*/(function () { ${TRY} console.log(2); })();`],
	["a `yield` identifier", `function* g() { !function () { ${TRY} console.log(yield); }(); } g().next();`],
	["an `await` identifier", `async function f() { !function () { ${TRY} console.log(await); }(); } f();`]
];

// Each prints one thing and terser's output another, under the options named.
/** @type {[string, string, import("terser").MinifyOptions][]} */
const CORRECTED_CASES = [
	[
		"a `{ __proto__ }` shorthand, printed",
		"var __proto__ = null; console.log(Object.getPrototypeOf({ __proto__ }) === Object.prototype);",
		{ compress: false, mangle: false }
	],
	[
		"a `{ __proto__ }` shorthand, its value inlined",
		"const __proto__ = 0; console.log(Object.keys({ __proto__ }));",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a `__proto__: __proto__` setter, printed as a shorthand",
		"var p = { a: 1 }; var __proto__ = p; console.log({ __proto__: __proto__ }.a);",
		{ compress: false, mangle: false, format: { shorthand: true } }
	],
	[
		"a spread object setting its prototype",
		"var p = { x: 1 }; console.log({ ...{ __proto__: p } }.x);",
		{ compress: {}, mangle: false }
	],
	[
		"a method read out of a getter's result, then called",
		"var r = { f() { return this === r; } }; console.log({ get: () => r.f }.get()());",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a method read out of a getter's result, then tagging a template",
		"var r = { f() { return this === r; } }; console.log({ get: () => r.f }.get()`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a conditional folded into a template's tag",
		"var r = { f() { return this === r; } }; var c = 1; console.log((c ? r.f : r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a logical expression folded into a template's tag",
		"var r = { f() { return this === r; } }; console.log((0 || r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a sequence detaching a template's tag",
		"var r = { f() { return this === r; } }; console.log((0, r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a method reading `this` through a direct `eval`",
		"console.log({ v: 1, f: function () { return eval('this').v; } }.f());",
		{ compress: {}, mangle: false }
	],
	[
		"`arguments[0]` where the parameter is reassigned and nothing passed",
		"function m(v) { v = 2; return arguments[0]; } console.log(m());",
		{ compress: { arguments: true }, mangle: false }
	],
	[
		"an empty arrow whose default has an effect",
		"var r = []; ((v = r.push(1)) => {})(); console.log(r.length);",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function whose pattern throws",
		"var r = []; try { (function ([v]) {})(); } catch (e) { r.push(1); } console.log(r.length);",
		{ compress: {}, mangle: false }
	],
	[
		"a class after an early return, read by a closure",
		"function f(x) { var g = () => C; if (x) return; class C {} return g(); } console.log(typeof f(0));",
		{
			compress: { inline: false, reduce_vars: false, collapse_vars: false },
			mangle: false
		}
	],
	[
		"`===` between two calls returning different types",
		"var i = 0; function f() { return { a: i++ ? '1' : 1 }; } console.log(f().a === f().a);",
		{ compress: {}, mangle: false }
	]
];

// The option sets the printer is held to terser under: a build's own, and
// every format option that changes what the stream writes.
/** @type {import("terser").MinifyOptions[]} */
const OUTPUT_OPTIONS = [
	{ compress: { passes: 2 }, mangle: true, format: { comments: false } },
	{ compress: false, mangle: false, format: { comments: "all" } },
	{
		compress: false,
		mangle: false,
		format: { comments: "some", preserve_annotations: true }
	},
	{
		compress: false,
		mangle: true,
		format: {
			// A pattern written as a string, which terser reads but its types omit.
			comments: /** @type {RegExp} */ (/** @type {unknown} */ ("/kept|@lic/i")),
			ascii_only: true,
			ecma: 2020
		}
	},
	{
		compress: false,
		mangle: false,
		format: { ascii_only: true, ecma: 2015, safari10: true, ie8: true }
	},
	{
		compress: false,
		mangle: true,
		format: {
			semicolons: false,
			quote_style: 3,
			keep_quoted_props: true,
			wrap_iife: true
		}
	},
	{
		compress: false,
		mangle: false,
		format: {
			quote_style: 1,
			inline_script: false,
			preamble: "/* preamble */\r\n",
			keep_numbers: true,
			wrap_func_args: true,
			webkit: true,
			braces: true,
			quote_keys: true
		}
	},
	{ compress: false, mangle: false, format: { quote_style: 2, shebang: false } },
	{
		compress: {},
		mangle: true,
		sourceMap: { asObject: true },
		format: {
			comments: (
				/** @type {unknown} */ node,
				/** @type {{ value: string }} */ comment
			) => comment.value.length % 2 === 0
		}
	},
	{ compress: false, mangle: false, format: { beautify: true, comments: "all" } },
	{ compress: false, mangle: false, format: { max_line_len: 40 } }
];

/**
 * Sources chosen for what the stream decides: where a space, a semicolon or a
 * line break goes, how a string is quoted and escaped, and where a comment is.
 * @type {[string, string][]}
 */
// Sources webpack's parser builds a tree for that prints otherwise than the one
// terser's parser builds, each with the difference; a fix retires its entry.
/** @type {Record<string, string>} */
const PARSED_DIFFERENTLY = {
	"templates, tagged and raw":
		"a template's last segment maps one column further on",
	"classes and objects": "a class member's name maps elsewhere",
	"comments in each position":
		"a line comment before `yield;` stays on the statement before it",
	"directives, and strings that would read as one":
		"an escaped directive keeps its escape where terser ends the prologue with `;`",
	"class C { #x; m(o) { return #x in (a ? o : o) && #x in (a, o) && (#x in o) in o; } }":
		"a private `in` drops its right side's parentheses, as terser's own does, but over another tree",
	"import a, * as b from 'c'; import * as d from 'e'; import { 'f g' as h, i } from 'j'; import k from 'l' with { type: 'json' };":
		"an import's attributes map elsewhere",
	"export { a as 'b c', d }; export * as '*' from 'x'; export * as y from 'x'; export * from 'z'; export { e, f, g } from 'h' with { type: 'json' }; export default (a, b);":
		"an export's string names map elsewhere"
};

const OUTPUT_CASES = [
	[
		"operators that would merge without a space",
		"a = b + +c; d = e - -f; g = h / /re/g.source; i = j++ + ++k; l = !--m; n = o-- > p; q = r < !--s;"
	],
	[
		"strings needing each escape and each quote",
		String.raw`sink("a\"b", 'c\'d', "e'f\"g'", "\\ \b \f \n \r \t \v", "\0", "\0" + "1", "\x001", "  ﻿", "é ☃ 😀", "\ud800 \udc00 \ud83d", '\'"\'', "q'\n", 'r"\t');`
	],
	[
		"inline script sequences",
		"sink('</script>', '</SCRIPT ', '<!--', '-->', '<\\/script>', `</script>${a}<!--`);"
	],
	[
		"templates, tagged and raw",
		"sink(`a${b}c\\n${`d${e}`}`, tag`x\\u{61}${y}\\``, String.raw`\\${z}`, `$\\{w}`);"
	],
	[
		"identifiers beyond ASCII",
		String.raw`var été = 1, π = 2, \u{1d49c} = 3, a‌b = 4, ℘ = 5, ᲀᲀ = 6, \u{1e030}\u{1e030} = 7; sink(été + π + \u{1d49c} + a‌b + ℘ + ᲀᲀ + \u{1e030}\u{1e030}, {été, π: 1});`
	],
	[
		"directives, and strings that would read as one",
		`"use strict"; "\\x75se asm";
		function f() { "use strict"; "other"; return 1; }
		function g() { ("use strict"); }
		sink(f, g);`
	],
	[
		"statements a missing semicolon would join",
		`a = b
		(c || d).e()
		f = g
		[h].forEach(i)
		j = k
		\`l\`.m()
		n = o
		+p
		do q(); while (r)
		s: for (;;) { if (t) break s; else continue s }
		var u = function () {}, v = class {}, w = {}
		;(function () {})()
		;[1].x`
	],
	[
		"comments in each position",
		`#!/usr/bin/env node
		/*! banner, kept */
		// @license line
		/* @__PURE__ */ make();
		const kept = /* #__PURE__ */ build(/* argument */ 1) // trailing
		function f() {
			return /* before */ value // after
				+ 1;
		}
		function g() {
			return ( // line comment after return
				a && b
			);
		}
		function* h() { yield /* c */ x; yield // d
			y; }
		async function i() { await /* e */ z; throw /* f */ new Error(); }
		function empty() { /* inside */ }
		if (a) { /* only a comment */ } else { b(); /* after b */ }
		label: // on a label
		for (;;) break label;
		x = /* one */ /* two */ 1;
		sink(1); // first
		/* second */
		sink(2) // third
		/* fourth */;
		sink(f, g, h, i, empty, kept) /* last */`
	],
	[
		"numbers, regular expressions and keywords",
		"sink(0x10, 1e21, 1.5e-7, .5, 5., 0b101, 1_000, 10n, /[/]\\//gu, /<\\/script>/, void 0, typeof x, x in y, x instanceof Y, a ** -b, (-a) ** b, new (f())(), new f, a?.b?.[c]?.(d));"
	],
	[
		"regular expressions escaping characters beyond ASCII",
		"sink(/\\🏳0\\🌈️\\☺/, /\\\\é[\\é]\\x41/g);"
	],
	[
		"asm.js, whose numbers are printed as written",
		`function module(stdlib) { "use asm"; var x = 1.0, y = 0x10; function f() { return +(x + 2.50); } return { f: f }; }
		sink(module, 1.0);`
	],
	[
		"parentheses the tree does not hold",
		"(function () {})(); (() => {})(); ({}).x; (a, b); x = (a, b); (async () => {})(); (class {}).y; !function () {}(); for (var i = (0 in x); i;) ; a = (b = c); x = ({ a } = y);"
	],
	[
		"classes and objects",
		`class A extends (B, C) { static #p = 1; #q; static { init(); } get [k]() { return this.#q; } set v(x) {} async *gen() {} static async m() {} 'quoted key'() {} 1() {} }
		sink({ a: 1, "b": 2, "c-d": 3, 4: 5, [e]: 6, get g() { return 1; }, set g(x) {}, h() {}, async i() {}, *j() {}, ...k, l, if: 1, "\\u0061": 2 });`
	],
	[
		"output long enough to be committed in parts",
		Array.from(
			{ length: 400 },
			(_, i) =>
				`/*! part ${i} */ function part${i}(value) { "use strict"; return value + ${i}; // line ${i}\n}`
		).join("\n")
	]
];

/**
 * Sources chosen for what the code generators decide: where a parenthesis,
 * brace or keyword goes around each kind of node.
 * @type {string[]}
 */
const CODEGEN_CASES = [
	"if (a); else b(); for (;;); while (a) ; label: ;",
	"if (a) function f() {}",
	"if (a) do x(); while (b); else y();",
	"if (a) { if (b) c(); } else d();",
	"for (var f = function () { return a in b; }, g = (() => a in b); ;) break;",
	"x = [0.0001, 0.00012, 1e-7, 1000, 1e21, 0.5];",
	"x = { 1e3: 1, 10: 2, 0x10: 3, 1.5: 4 };",
	"({}.t)`x`; ({}).a.b; ({} = a);",
	"(function () {}).call(); (function () {})(); new (a())(); new (a().b)(); new (a.b()); (a, b).c; f((a, b)); (a = b).c; (a ? b : c).d; (a ? b : c)(); -(a ? b : c);",
	"(-1).toString(); (1).x; (1.5).x; (-0.5) ** 2; (-a) ** 2; (a || b) ?? c; (a ?? b) || c; a ?? (b && c);",
	"(async () => 1)(); (() => 1).x; (a => a)?.x; typeof (a => a); (a => a) || b; x = (a => a) ? 1 : 2;",
	"class C { #x; m(o) { return #x in (a ? o : o) && #x in (a, o) && (#x in o) in o; } }",
	"function* g() { x = yield; (yield a).b; (yield a)(); a + (yield b); -(yield); x = yield a ? b : c; }",
	"async function h() { (await x).y; (await x)(); -(await x); new (await x)(); for await (const v of w); }",
	"debugger; 'use strict'; function d() { 'use asm'; return; }",
	"class A extends B { [a]() {} get [b]() {} set [c](v) {} static *[d]() {} async [e]() {} m() { super.m(); return new.target; } }",
	"x = `a${b}c${d}`; x = tag`a${b}`;",
	"f = () => { return; }; g = () => { return {}; }; h = () => ({}).a; i = () => ({ a } = b);",
	"if (a) b(); else if (c) d(); else { e(); }",
	"switch (a) {} switch (a) { case 1: default: }",
	"import a, * as b from 'c'; import * as d from 'e'; import { 'f g' as h, i } from 'j'; import k from 'l' with { type: 'json' };",
	"export { a as 'b c', d }; export * as '*' from 'x'; export * as y from 'x'; export * from 'z'; export { e, f, g } from 'h' with { type: 'json' }; export default (a, b);",
	"import defer * as ns from 'm'; import source s from 'm'; import.meta.url; import('x'); import.source('x'); import.defer('x');",
	"a?.[b]; a?.b(); a?.(); a?.[b]?.(c); (a?.b).c;",
	"(5).toString(); 5.5.toString(); 0x10.toString(); 1e21.x; (-5).x;",
	"x = /<\\/script>/; y = a < /script>/.x; z = /a/ instanceof RegExp; w = /a/ in b; v = /a/gimsuy;",
	"({ a = 1 } = b); ({ a: a = 1 } = b); ({ 'a': a = 2 } = b); ({ [a]: b = 1 } = c);",
	"new (a.b.c)(); new (a().b.c)(); new a; new (function () {})(); new (class {})();",
	"x = (a, b) ? c : d; x = a ? (b, c) : d; x = (a = b) ? c : d; (a = b) ? c : d; x = !(a = b);"
];

/**
 * Every node terser sizes in a script, `with` included, which a module forbids.
 */
const SIZED_SCRIPT = `"a directive"; debugger; {} ;
label: for (;;) { break label; }
outer: do { continue outer; } while (a);
while (b) break;
for (var i in o) c();
for (const v of w) d();
with (o) e;
switch (x) { case 1: f(); break; default: g(); }
try { h(); } catch { } try { h(); } catch (error) { } finally { k(); }
if (a) b(); else c();
throw new Error("x", 1);
var [p, ...q] = r, { s, t: [u] } = v;
let fn = (a, b = 1, ...c) => a, one = x => x * 2, block = async () => { return await 1; };
const tpl = tag\`a\${b}c\${d}\`, re = /x+/gi, str = 'q"', num = 1.5e3, big = 12n;
x = [1, , 3], y = { a, b: 1, [c]: 2, get d() { return 1; }, set d(v) {}, e() {}, async *f() { yield 1; }, "g h": 1, 1: 2 };
({ a } = y);
z = null + NaN + undefined + Infinity + true + false + void 0 + typeof a + -a + !b + ~c + 0.5 + (a + +b) + (a - -b) + a?.b + a?.[b] + a?.(b) + a.b + a[b] + (a, b) + (a ? b : c) + (a || b) + (a ?? b) + a ** b;
class A extends B { static x = 1; y; #z = 2; static #w; static { f(); } constructor() { super(); new.target; } get g() { return this.#z; } set g(v) {} static m() {} *gen() {} async am() {} #pm() { return #z in this; } get #pg() { return 1; } set #pg(v) {} static get sg() {} }
new (class {})();
function named(a) { return arguments; }
async function* generate() { for await (const v of w) yield* v; }`;

/**
 * Every node terser sizes only in a module. terser cannot size an exported
 * default function, whose size asks for a stack the export does not pass.
 */
const SIZED_MODULE = `import d, { a as b, c } from "m"; import * as ns from "n"; import "side"; import json from "j" with { type: "json" };
export { b, c as e }; export * from "o"; export * as p from "q"; export default [import.meta.url, import("x"), import.source("y")];
export const k = 1; export class K {}
{ using x = y; } async function f() { await using z = w; }`;

/**
 * Properties the mangler reads each way terser does: quoted, computed, in a
 * `defineProperty`, an `in`, and the `@__KEY__` and `@__MANGLE_PROP__` notes.
 */
const MANGLED_PROPERTIES = `var obj = { alpha: 1, "beta": 2, [c ? "gamma" : "delta"]: 3, get eps() { return 1; }, method() {}, 42: 1 };
obj.alpha = obj.beta + obj["gamma"] + obj[(0, "delta")] + obj[c ? "eps" : "method"];
Object.defineProperty(obj, "zeta", { value: 1 });
sink("eta" in obj, /*@__KEY__*/ "theta", obj[/*@__MANGLE_PROP__*/ "iota"]);
var ann = { /*@__MANGLE_PROP__*/ kappa: 1 }; ann.kappa++;
undeclared.lambda = 1;
class Shape { #priv = 1; field = 2; get #getter() { return 1; } method() { return this.#priv + this.field + this.#getter; } }
sink(obj, new Shape());`;

/**
 * Names the mangler keeps, moves or hands out apart: a function declared in a
 * block, a named and a kept function value, a catch, a label and `arguments`.
 */
const MANGLED_NAMES = `var counter = function () { return 1; };
function outer(first, second) {
	if (first) { function inBlock() { return second; } inBlock(); }
	var named = function (argument) { return argument + counter(); };
	var keptLambda = function () { return 1; };
	try { first(); } catch (error) { second(error); }
	function inner() { var arrow = () => arguments[0]; return arrow(); }
	label: for (;;) { break label; }
	return [named, keptLambda, inner(), first.prop, first["quoted"]];
}
sink(outer);`;

/**
 * Exported names, which a name cache and a toplevel mangle keep.
 */
const MANGLED_MODULE =
	"export var kept = 1; var hidden = 2; export { hidden as shown }; export default function main(alpha) { return alpha + kept + hidden; }";

/**
 * The keys a tree comparison skips: positions, which the two trees count
 * differently, and what `toPrintTree` adds to ESTree for the printer.
 */
const PRINT_TREE_SKIPPED_KEYS = new Set([
	"start",
	"end",
	"loc",
	"range",
	"sourceType",
	"startToken",
	"endToken",
	"quote",
	"definition",
	"mapName",
	"idDeclares",
	"heldAsDefinition",
	"atom",
	"annotatedKey",
	"attributesStartToken",
	"attributesEndToken",
	// terser keeps no record of a shorthand, which the printer decides.
	"shorthand",
	// terser keeps a number's source alone, checked on its own below.
	"raw"
]);

/**
 * An ESTree tree as plain data to compare, rewritten where `toPrintTree` holds
 * a node in terser's shape rather than the parse's.
 * @param {EXPECTED_ANY} node a node, a list or a value
 * @returns {EXPECTED_ANY} it, comparable
 */
const comparableTree = (node) => {
	if (Array.isArray(node)) return node.map(comparableTree);
	if (node === null || typeof node !== "object") return node;
	/** @type {Record<string, EXPECTED_ANY>} */
	const result = {};
	for (const key of Object.keys(node)) {
		if (PRINT_TREE_SKIPPED_KEYS.has(key) || node[key] === undefined) continue;
		result[key] = comparableTree(node[key]);
	}
	if (node.type === "Literal" && (node.regex || node.bigint !== undefined)) {
		// terser holds a regular expression's parts, not a RegExp, and a
		// bigint's digits as written, which ESTree holds in decimal.
		delete result.value;
		if (node.bigint !== undefined) result.bigint = String(BigInt(node.bigint));
	}
	if (node.regex) {
		// terser drops an escape before a character beyond ASCII, as it reads.
		result.regex.pattern = node.regex.pattern.replace(
			/\\(.)/gu,
			(/** @type {string} */ escape, /** @type {string} */ character) =>
				/** @type {number} */ (character.codePointAt(0)) > 0x7f
					? character
					: escape
		);
	}
	if (typeof node.directive === "string") {
		// terser holds a directive as written, which ESTree holds read.
		delete result.expression.value;
	}
	if (node.type === "ArrowFunctionExpression" && node.expression) {
		// terser holds an arrow's body as statements, a value as its return.
		result.expression = false;
		result.body = {
			type: "BlockStatement",
			body: [{ type: "ReturnStatement", argument: result.body }]
		};
	}
	return result;
};

// Every source of the tables above, which the ESTree printer is held to.
const TABLE_SOURCES = [
	...OUTPUT_CASES.map(([, source]) => source),
	...CODEGEN_CASES,
	SIZED_SCRIPT,
	SIZED_MODULE,
	MANGLED_PROPERTIES,
	MANGLED_NAMES,
	MANGLED_MODULE,
	...CASES.map(([, source]) => source)
];

/**
 * Expressions for what the ESTree printer decides that the tables above leave
 * out: parentheses, spaces between operators, and keys.
 * @type {string[]}
 */
const ESTREE_PRINT_CASES = [
	"x = a > --b; y = c-- > d; z = !--e; w = - --f; v = -(-g); u = +(+h); t = typeof typeof i; s = - -j; r = a-- >> b;",
	"x = 1..toString() + 1.5.toFixed() + 0x10.y + 1e21.w + .5.v + 5n.u + (-5n).t + 1e300 + 0.000001 + 1000000 + 0xff + 1_000 + 0x1fn;",
	String.raw`x = /a<\/script/g.test(y) || /x/ in z || /y/ instanceof w || a < /script/ || /\u{1F600}/u.x || /é/;`,
	"new (a.b().c); new (a`x`); new (b.c); new a.b; new (new a)(); (new a).b; (new a)``; new a()(); new (a.b.c); new (function () { a(); }.b);",
	"x = class { #p; q = (o) => #p in o && (#p in o) in o && #p in (o ? o : o) && (#p in o) + 1 && !(#p in o) && (#p in o)(); r = a ?? (b || c); static s = (a ?? b) && c; [t] = 1; 'u' = 2; 4 = 5; static #v = 6; static {} constructor() {} get a() {} set a(b) {} static async *m() {} get #w() {} set #w(v) {} #z() {} 'quoted'() {} 7() {} };",
	"async function f() { await (a, b); await a.b; await a(); await -a; await 1; await (await a); await {}; await (a ? b : c); await this; await class {}; (await a)(); (await a).b; (await a) ** 2; !await a; x = await a; }",
	"function* g() { yield; yield* a; (yield a) + 1; x = yield b; (yield a)(); (yield a).b; (yield a) ? 1 : 2; !(yield a); [...(yield a)]; f(yield a, yield); ({ a: yield }); }",
	"(function () {})(); (function () {}).call(); x = function () {}; f(function () {}, () => 1); (() => {}).x; (a => a) ? 1 : 2; a || (() => 1); !(() => 1); (() => 1)(); x = async (a, b) => ({}); y = async a => ({}).x; z = () => ({}) ? 1 : 2; w = () => ({}).x(); v = ([a], { b }, ...c) => a; (function () {})().x = 1; (function () {}).x = 1; (function () {})()``; (function* () {}); (async function () {}); (async function* f() {});",
	"({}).x; ({} = a); ({ a } = b); [a] = b; ({}).x = 1; ({})(); ({}).x``; ({}) ? 1 : 2; ({}) + 1; ({}).a++; ({}, 1); ({ a, b: c = 1, 'd': d, [e]: f, ...g } = h); ({ 'a': a } = b); ({ 1: a, 'b c': b } = c); ({ a: { b } } = c);",
	"x = { a, b: c, 'd': d, 1: e, [f]: g, ...h, get i() {}, set j(k) {}, *l() {}, async m() {}, async *n() {}, 'o'() {}, if: p, 'q r': s, '1': t, 1.5: u, '01': v, async: w, get: y, set: z, 'é': 1, 'class': 2, [a + b]() {}, get [c]() {}, 0b11: 3, 1e3: 4, NaN: NaN, undefined, this: this };",
	"x = `a${b}c${`d${e}`}`; tag`a\\u{41}${b}`; (a + b)`x`; (a, b)`x`; (a ? b : c)`x`; (!a)`x`; ({}).a`x`; (() => 1)`x`; a.b`x`; (function () {})`x`; (a = b)`x`; x = `\\u{1F600}${'é'}`; x = `\\${a}`;",
	"a?.b; a?.[b]; a?.(); (a?.b).c; (a?.b)(); a?.b.c(); new (a?.b)(); (a?.()).b; a?.b?.c?.(d)?.[e];",
	"x = (a, b); f((a, b)); [(a, b)]; ({ a: (b, c) }); (a, b) ? c : d; a ? (b, c) : (d, e); x = `${(a, b)}`; [...(a, b)]; f(...(a, b)); (a, b).c; (a, b)[c]; (a, b)(); -(a, b); a + (b, c); x = () => (a, b); ({ [(a, b)]: c });",
	"x = a = b ? c : d; (a = b) ? c : d; (a ? b : c) ? d : e; (a = b).c; (a ? b : c)(); !(a = b); a + (b = c); a, b = c; x = a => b = c; x = (a ? b : c) || d; x = a || (b ? c : d); a = b = c; a += b -= c; x = { a: b = c }; [a = b] = c; f(a = b);",
	String.raw`x = 'é \0' + "'" + '"' + '\'' + "\"" + true + null + false + this + 'a\nb' + '\x7f\x80' + '😀' + '\ud83d' + '</script>';`,
	"delete a[0], void 0, typeof a, a++ + ++b, a-- - --b, (-a) ** 2, (+a) ** 2, (++a) ** 2, (a++) ** 2, a ** -b, (a ** b) ** c, a ** b ** c, (a * b) ** c, a - (b - c), a - b - c, a * (b + c), (a, b) ** c, !(a ** b), (typeof a) ** 2, (void a) ** 2;",
	"(a || b) ?? c; (a && b) ?? c; a ?? (b || c); a ?? (b && c); (a ?? b) || c; (a ?? b) && c; a ?? b ?? c; (a ?? b) ?? c; a || b && c; (a || b) && c; a in b in c; a in (b in c); a instanceof (b instanceof c);",
	"a = class extends (a, b) {}; a = class extends a.b {}; a = class extends class {} {}; a = class extends function () {} {}; a = class extends f() {}; a = class extends (a ? b : c) {}; a = class extends this {}; a = class B extends C {}; (class {}).x; (class {})(); x = class { m() { super.m(); super['n'](); } };",
	"x = [, , 1, , ]; [, a, , ] = b; [...a] = b; f(...a); x = []; x = [,]; x = [a, , b]; ({ ...a } = b); [{ a } = b, [c] = d] = e;",
	String.raw`x = a.if + a.class + a['b c'] + a['é'] + a['\u{1F600}'] + a['1'] + a.ℹ + a?.if + a['𝐀'];`,
	"function f() { new.target; (new.target).x; new new.target; }",
	"x = 0.0001; x = 1e-7; x = 1.5e-10; x = 123456789e5; x = 1e21; x = -0; x = 2 ** 53; x = 0x123456; x = 1/0; x = -1/0; x = 0/0;",
	"x = (1, eval)('a'); x = (0, a.b)(); x = (a, b.c)``; x = void (a, b); x = a, b, c;",
	"f = () => ({}).x``; g = () => ({})?.a; h = () => ({}).a++; i = () => ++({}).a; j = () => ({}).a?.(); k = () => a``; l = () => a?.b; m = () => a++; n = () => ({}) + 1; o = () => ({} = a);",
	"({})?.a; ({}).a?.b; (function () {})?.(); (class {})?.a;",
	"new (a[[b]].c); new (a[[b()]].c); new (a[b].c); new (a[(() => b())()].c); new (a[function () {}].c);",
	"x = class { #p; q = (o) => [o.#p, o?.#p, #p in (a + b), #p in (a < b), #p in (a || b), #p in (#p in o), #p in o ** 2, -(#p in o)]; };"
];

/**
 * Modules for the imports and exports the ESTree printer prints.
 * @type {string[]}
 */
const ESTREE_PRINT_MODULE_STATEMENT_CASES = [
	"import a, { b as c, d, 'e f' as g, \"h\" as h, default as i } from 'j' with { type: 'json', 'k': 'l' }; import n, * as o from 'p'; import * as q from 'r'; import { '*' as s } from 't'; import {} from 'u'; import source v from 'w'; import defer * as x from 'y'; export { a, c as z, d as 'y z', i as j }; export {}; export { k as l, m as 'n' } from 'o'; export * from 'p'; export * as q from 'r'; export * as 'r s' from 's'; export * as '*' from 't'; export { '*' as star } from 'u'; export { 'v w' } from 'v'; export { 'w' as x } from 'y' with { type: 'json' }; export default (function () {})(); export var t = 1, u = (v, w); export let ab; export const ac = 1; export function ad() {} export class ae {}; await using af = ag;",
	"export default function () {} export function* f() {}",
	"export default class {}; export async function f() {}",
	"export default (a, b);",
	"export default function f() {}",
	"export default class C {}",
	"export default async () => {};",
	"export * from 'a' with { type: 'json' }; export * as b from 'c' with { type: 'json' };"
];

/**
 * Sources only a module reads, whose expressions the ESTree printer is held to.
 * @type {string[]}
 */
const ESTREE_PRINT_MODULE_CASES = [
	"import.meta.x; import('a'); import('a', { with: { type: 'json' } }); import.source('a'); import.defer('b'); (import.meta).x; await (a, b); !await a;"
];

/**
 * Statements for what the ESTree printer decides that the tables above leave
 * out: braces, semicolons, `in` inside a loop's head, and directives.
 * @type {string[]}
 */
const ESTREE_PRINT_STATEMENT_CASES = [
	"for (var a = (b in c);;); for (a = (b in c);;); for (var a = () => (b in c);;); for (var a = function () { b in c; };;); for (var a = [b in c];;); for (; a in b;) c(); for (;;) var d = e in f; for (var a in b) var c = d in e; for (let a of (b, c)); for ((a in b).c in d);",
	"if (a) { if (b) c(); } else d(); if (a) if (b) c(); else d(); else e(); if (a) for (;;) if (b) c(); else d(); else e(); if (a) for (;;) if (b) c(); else e(); if (a) do b(); while (c); else d(); if (a); else; while (a); with (a) ; with (a) { b(); } l: for (;;) if (a) break l; else continue l;",
	"switch (a) {} switch (a) { case 1: case 2: b(); break; default: ; } try { a(); } catch { } finally { } try {} catch ({ a, b }) { c(); } do ; while (a); do { a(); } while (b); do a(); while (b);",
	"'use strict'; 'use asm'; ; 'not a directive'; x = 0x10 + 1.0; function f() { 'use asm'; return 0x10 + 1.0; } function g() { a(); 'b'; return 0x10; } (function () { ; 'use asm'; b(); })(); x = () => { 'not'; a(); }; class C { static { 'not'; } m() { 'use asm'; return 0x10; } }",
	"function f() { return; } function g() { throw a; } var a = 1, b, [c] = d, { e } = f; let i = 1; const h = 2; label: { break label; } debugger;"
];

/**
 * Comments where the ESTree printer reads them: before a keyword's value and
 * down its leftmost edge, inside empty braces, after statements, and first.
 * @type {string[]}
 */
const ESTREE_PRINT_COMMENT_CASES = [
	"#!/usr/bin/env node\n/*! kept */ 'use strict'; // after\na(); /* @lic */",
	"function f() { return /* a */ b; } function g() { return (/* a */ b) + c; } function h() { return /* a */ b.c(/* d */ e)[f] ? g : h; } function i() { throw /* x */ a, b; } function j() { return (\n// line\na); }",
	"async function f() { await /* a */ b; await (/* b */ c)(); x = await /* c */ d++; } function* g() { yield /* a */ b; yield (/* b */ c) || d; yield; } x = class { #p; m(o) { return /* a */ #p in o; } n(o) { return /* a */ o.#p; } }; function h() { return /* a */ ++b; } function i() { return /* a */ b = c; }",
	"function f() { /* inner */ } x = { /* inner */ }; switch (a) { /* inner */ } class C { /* inner */ } x = function () { // line\n}; x = () => { /* inner */ }; if (a) { /* inner */ } try { /* t */ } catch { /* c */ } finally { /* f */ }",
	"a(); // after a\nb() /* after b */; c = /* before d */ d /* after d */ + e; x = [/* a */ 1, /* b */ 2 /* c */]; f(/* arg */ g, h /* after h */);",
	"x = /*@__PURE__*/ f(); y = /* #__PURE__ */ new C(); /*#__NO_SIDE_EFFECTS__*/ function g() {} export const h = /*@__PURE__*/ (() => 1)();",
	"label: /* l */ for (;;) { /* body */ break label; } var a = /* a */ 1, /* b */ b = 2; if (/* c */ a) /* d */ b(); else /* e */ c();"
];

// The format options that change how a statement prints, past an expression's.
/** @type {EXPECTED_OBJECT[]} */
const ESTREE_PRINT_STATEMENT_FORMATS = [
	{ semicolons: false },
	{ ie8: true, ecma: 5 }
];

// The format options that change how an expression prints.
/** @type {EXPECTED_OBJECT[]} */
const ESTREE_PRINT_FORMATS = [
	{},
	{ ascii_only: true, ecma: 2020 },
	{ ascii_only: true, ecma: 5 },
	{ quote_style: 1, keep_quoted_props: true },
	{ quote_style: 2, keep_numbers: true },
	{ quote_style: 3, wrap_iife: true, wrap_func_args: true },
	{ ecma: 5, ie8: true, safari10: true, webkit: true },
	{ quote_keys: true, shorthand: false },
	{ quote_keys: true, ecma: 2020 },
	{ keep_quoted_props: true, ecma: 2020 },
	{ max_line_len: 40 }
];

// Every format option a whole program is printed under.
const ESTREE_PRINT_PROGRAM_FORMATS = [
	...ESTREE_PRINT_FORMATS,
	...ESTREE_PRINT_STATEMENT_FORMATS
];

describe("syntax-printer", () => {
	it("should install every phase", async () => {
		const printer = await load();
		expect(typeof printer.minify).toBe("function");
		expect(printer.phases).toEqual(PHASES.map((phase) => phase.name));
		expect(await load()).toBe(printer);
	});

	it("should port every compress helper the phases read under terser's name", async () => {
		const modules = await loadTerserSources(importTerserSource);
		const helpers = createCompressHelpers(modules);
		const printerSource = require("fs").readFileSync(
			require.resolve("../../lib/javascript/syntax-printer"),
			"utf8"
		);
		/** @type {Record<"common" | "inference" | "flags" | "utils", Set<string>>} */
		const read = {
			common: new Set(),
			inference: new Set(),
			flags: new Set(),
			utils: new Set()
		};
		const destructured =
			/const\s*\{([^}]*)\}\s*=\s*(?:modules\.)?(common|inference|flags|utils)\s*;/g;
		let match;
		while ((match = destructured.exec(printerSource)) !== null) {
			for (const part of match[1].split(",")) {
				const name = part.split(":")[0].trim();
				if (name) read[/** @type {keyof typeof read} */ (match[2])].add(name);
			}
		}
		// The lookbehind skips file names such as `compress/common.js`.
		const accessed =
			/(?<![\w/.`$-])(?:modules\.)?(common|inference|flags|utils)\.([A-Za-z_$][\w$]*)/g;
		while ((match = accessed.exec(printerSource)) !== null) {
			read[/** @type {keyof typeof read} */ (match[1])].add(match[2]);
		}

		for (const helper of /** @type {(keyof typeof read)[]} */ (
			Object.keys(read)
		)) {
			const ported = Object.keys(helpers[helper]).sort();
			expect(ported).toEqual([...read[helper]].sort());
			for (const name of ported) {
				expect(modules[helper]).toHaveProperty(name);
				expect(typeof helpers[helper][name]).toBe(
					typeof modules[helper][name]
				);
			}
		}

		expect(Object.keys(helpers.flags).sort()).toEqual(
			Object.keys(modules.flags).sort()
		);
		for (const [name, value] of Object.entries(modules.flags)) {
			if (typeof value === "number") expect(helpers.flags[name]).toBe(value);
		}
	});

	it("should keep the quirks of terser's compress helpers", async () => {
		const modules = await loadTerserSources(importTerserSource);
		const { common, inference, flags, utils } =
			createCompressHelpers(modules);
		const { ast } = modules;

		const words = ["b", "a"];
		expect(utils.makePredicate(words)).toEqual(new Set(["a", "b"]));
		expect(words).toEqual(["a", "b"]);
		expect(utils.makePredicate("x y")).toEqual(
			modules.utils.makePredicate("x y")
		);
		expect(common.identifier_atom).toEqual(modules.common.identifier_atom);
		for (const name of ["bitwise_binop", "lazy_op", "unary_side_effects"]) {
			expect(inference[name]).toEqual(modules.inference[name]);
		}

		for (const source of ["a\nb", "a\\\nb", "a\\\\\nb", "\0\r\u2028\u2029"]) {
			expect(utils.regexp_source_fix(source)).toBe(
				modules.utils.regexp_source_fix(source)
			);
		}
		for (const source of ["^a+$", "(a+)+"]) {
			expect(utils.regexp_is_safe(source)).toBe(
				modules.utils.regexp_is_safe(source)
			);
		}

		const node = new ast.AST_Number({ value: 1 });
		node.flags = 0;
		flags.set_flag(node, flags.TOP | flags.UNUSED);
		flags.clear_flag(node, flags.UNUSED);
		expect(flags.has_flag(node, flags.TOP)).toBe(flags.TOP);
		expect(node.flags).toBe(modules.flags.TOP);

		const list = [1, 2, 1, 3];
		utils.remove(list, 1);
		expect(list).toEqual([2, 3]);
		expect(utils.member(2, list)).toBe(true);
		expect(utils.return_false()).toBe(false);

		const nodes = [
			new ast.AST_Number({ value: 1 }),
			new ast.AST_Number({ value: 2 }),
			new ast.AST_Number({ value: 3 })
		];
		const spliced = new ast.AST_Number({ value: 4 });
		const walker = new ast.TreeTransformer((/** @type {EXPECTED_ANY} */ item) => {
			if (item === nodes[0]) return utils.MAP.skip;
			if (item === nodes[1]) return utils.MAP.splice([spliced, spliced]);
			return item;
		});
		expect(utils.MAP(nodes, walker)).toEqual([spliced, spliced, nodes[2]]);

		for (const value of [
			"a",
			0,
			-0,
			-1,
			Number.NaN,
			Infinity,
			-Infinity,
			true,
			null,
			undefined,
			/a\n/g
		]) {
			expect(common.make_node_from_constant(value, node)).toEqual(
				modules.common.make_node_from_constant(value, node)
			);
		}
		expect(() => common.make_node_from_constant({}, node)).toThrow(
			"Can't handle constant of type: object"
		);
		expect(() => common.make_sequence(node, [])).toThrow(
			"trying to create a sequence with length zero!"
		);
		expect(common.make_sequence(node, [node])).toBe(node);
	});

	for (const [name, source, options] of CASES) {
		it(`should mangle exactly as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			const settings = {
				compress: { passes: 2 },
				mangle: true,
				...options
			};
			const ours = await minify(source, JSON.parse(JSON.stringify(settings)));
			const theirs = await reference.minify(
				source,
				JSON.parse(JSON.stringify(settings))
			);
			expect(ours.code).toBe(theirs.code);
			expect(ours.code).toMatchSnapshot();
		});
	}

	it("should mangle as terser does under each option the fast path leaves out", async () => {
		const { minify } = await load();
		const reference = terserReference();
		const source = `var counter = function () { return 1; };
			function outer(first, second) {
				label: for (var i = 0; i < 2; i++) { if (i) break label; }
				try { first(); } catch (error) { second(error); }
				if (first) { function inBlock() { return second; } inBlock(); }
				class Shape { area() { return first; } }
				var named = function inner(argument) { return argument + counter(); };
				return [new Shape(), named, (function f(f) { return f; })(1)];
			}
			export { outer };`;
		const variants = [
			{ mangle: { keep_fnames: true } },
			{ mangle: { keep_fnames: /^inner$/, keep_classnames: true } },
			{ mangle: { ie8: true } },
			{ mangle: { safari10: true } },
			{ mangle: { toplevel: true, keep_classnames: /^Sh/ } },
			{ compress: false, mangle: true, rename: true },
			{ compress: { passes: 2 }, mangle: { reserved: ["first"] }, rename: true }
		];
		for (const variant of variants) {
			const settings = () => ({
				compress: { passes: 2 },
				module: true,
				...JSON.parse(JSON.stringify(variant)),
				...(variant.mangle && typeof variant.mangle === "object"
					? { mangle: { ...variant.mangle } }
					: {})
			});
			const ours = await minify(source, settings());
			const theirs = await reference.minify(source, settings());
			expect([variant, ours.code]).toEqual([variant, theirs.code]);
		}
		// A name cache carries the names one minify handed out into the next.
		const ourCache = {};
		const theirCache = {};
		for (const input of [source, "var counter = 2; export { counter };"]) {
			const options = () => ({ mangle: { toplevel: true } });
			const ours = await minify(input, { ...options(), nameCache: ourCache });
			const theirs = await reference.minify(input, {
				...options(),
				nameCache: theirCache
			});
			expect(ours.code).toBe(theirs.code);
		}
		expect(ourCache).toEqual(theirCache);
	});

	it("should minify a source too large to keep its buffers as terser does", async () => {
		const { minify } = await load();
		const reference = terserReference();
		// Past the 8 MiB the conversion keeps its buffers for, in a comment both
		// parsers skip quickly.
		const source = `var box = { width: 2, height: 3 }; sink(box);\n/*${"x".repeat(
			1 << 23
		)}*/`;
		const options = () => ({ compress: false, mangle: false });
		const ours = await minify(source, options());
		const theirs = await reference.minify(source, options());

		expect(ours.code).toBe(theirs.code);
	});

	it("should minify a source denser in tokens than its buffers start as terser does", async () => {
		const { minify } = await load();
		const reference = terserReference();
		// Two characters a token: past the quarter of the length the buffers
		// start at, however large an earlier source left them here.
		const source = `sink([${"1,".repeat(200000)}]);`;
		const options = () => ({ compress: false, mangle: false });
		const ours = await minify(source, options());
		const theirs = await reference.minify(source, options());

		expect(ours.code).toBe(theirs.code);
	});

	it("should leave a name terser cannot mangle alone", async () => {
		const { minify } = await load();
		const result = await minify("function top(argument) { return argument; }", {
			compress: false,
			mangle: true
		});

		expect(result.code).toBe("function top(n){return n}");
	});

	it("should mangle a toplevel name when asked to", async () => {
		const { minify } = await load();
		const result = await minify(
			"function top(argument) { return argument; } top(1);",
			{ compress: false, mangle: { toplevel: true } }
		);

		expect(result.code).toBe("function n(n){return n}n(1);");
	});

	for (const [name, source] of OUTPUT_CASES) {
		it(`should print exactly as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			let differs = false;
			for (const settings of OUTPUT_OPTIONS) {
				// The union the table infers does not narrow to terser's options.
				const options = () =>
					/** @type {EXPECTED_ANY} */ ({
						...settings,
						format: { ...settings.format }
					});
				const ours = await minify({ "input.js": source }, options());
				// The printer writes minified output only, so it is held to terser's.
				const referenceOptions = options();
				for (const name of IGNORED_FORMAT_OPTIONS) {
					delete (/** @type {Record<string, unknown>} */ (referenceOptions.format))[
						name
					];
				}
				const theirs = await reference.minify(
					{ "input.js": source },
					referenceOptions
				);
				if (Object.prototype.hasOwnProperty.call(PARSED_DIFFERENTLY, name)) {
					differs =
						differs ||
						ours.code !== theirs.code ||
						JSON.stringify(ours.map) !== JSON.stringify(theirs.map);
					continue;
				}
				expect(ours.code).toBe(theirs.code);
				expect(ours.map).toEqual(theirs.map);
			}
			if (Object.prototype.hasOwnProperty.call(PARSED_DIFFERENTLY, name)) {
				// A listed difference that is gone is retired from the list.
				expect(differs).toBe(true);
			}
			const { code } = await minify(
				source,
				/** @type {EXPECTED_ANY} */ (OUTPUT_OPTIONS[0])
			);
			expect(code).toMatchSnapshot();
		});
	}

	for (const source of CODEGEN_CASES) {
		it(`should generate code as terser does: ${source}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			let differs = false;
			for (const settings of OUTPUT_OPTIONS) {
				// The union the table infers does not narrow to terser's options.
				const options = () =>
					/** @type {EXPECTED_ANY} */ ({
						...settings,
						format: { ...settings.format }
					});
				const ours = await minify({ "input.js": source }, options());
				const referenceOptions = options();
				for (const name of IGNORED_FORMAT_OPTIONS) {
					delete (/** @type {Record<string, unknown>} */ (referenceOptions.format))[
						name
					];
				}
				const theirs = await reference.minify(
					{ "input.js": source },
					referenceOptions
				);
				if (Object.prototype.hasOwnProperty.call(PARSED_DIFFERENTLY, source)) {
					differs =
						differs ||
						ours.code !== theirs.code ||
						JSON.stringify(ours.map) !== JSON.stringify(theirs.map);
					continue;
				}
				expect(ours.code).toBe(theirs.code);
				expect(ours.map).toEqual(theirs.map);
			}
			if (Object.prototype.hasOwnProperty.call(PARSED_DIFFERENTLY, source)) {
				// A listed difference that is gone is retired from the list.
				expect(differs).toBe(true);
			}
		});
	}

	it("should write minified output whatever layout it is asked for", async () => {
		const { minify } = await load();
		const source = "if (a) { b(1, 2), c(3) } else for (;;) d([4, 5]);";
		const { code } = await minify(source, { compress: false, mangle: false });
		const laidOut = await minify(source, {
			compress: false,
			mangle: false,
			format: {
				beautify: true,
				braces: true,
				indent_level: 2,
				indent_start: 4,
				max_line_len: 10,
				width: 10
			}
		});
		expect(laidOut.code).toBe(code);
	});

	/** @type {[string, string, EXPECTED_OBJECT][]} */
	const SCOPE_CASES = [
		["a label defined twice", "a: { a: { sink(1); break a; } }", {}],
		["a name declared twice with let", "let a = 1; let a = 2; sink(a);", {}],
		["a with statement", "with (o) { sink(x); }", {}],
		["eval called in a function", "function f(x) { eval('x'); return x; } sink(f);", {}],
		["arguments read in a function", "function f(a) { return arguments[0] + a; } sink(f);", {}],
		[
			"a parameter default reading a name the body redeclares",
			"var x = 1; function f(a = x, b = a) { var x = 2, a; return x + a + b; } sink(f);",
			{}
		],
		["a switch with block-scoped cases", "switch (x) { case 1: let y = 1; sink(y); break; default: sink(x); }", {}],
		[
			"exports, destructured and default",
			"export var a = 1; export const { b, c: [d] } = o; export function f() { return a; } export default class { m() { return b; } }",
			{ module: true }
		],
		["a default exported function", "export default function f() { return 1; }", { module: true }],
		["a re-export under another name", "export { a as b } from 'c'; export { e as default }; var e = 1;", { module: true }],
		["a block function in sloppy code", "{ function f() { return 1; } } sink(f);", {}],
		["a block function in strict code", "'use strict'; { function f() { return 1; } sink(f); }", {}],
		["a class body, strict of its own", "class A { static x = 1; m() { function g() {} return g; } } sink(A);", {}],
		[
			"a catch parameter redeclaring a parameter",
			"function f(e) { try { sink(e); } catch (e) { var e = 2; sink(e); } return e; } sink(f);",
			{}
		],
		["a function expression named arguments", "var f = function arguments() { return 1; }; sink(f);", {}],
		[
			"catch and loop scopes for old engines",
			"function f(a) { try { sink(a); } catch (a) { sink(a); } for (let i = 0; i < 2; i++) sink(i, a); } sink(f);",
			{ mangle: { ie8: true, safari10: true } }
		],
		["a labelled loop continued", "a: for (;;) { for (;;) { continue a; } }", {}],
		["a parameter default reading an outer name", "var y = 1; function f(a = y) { return a; } sink(f);", {}],
		["a named class expression", "var C = class Named { m() { return Named; } }; sink(C);", {}],
		[
			"top-level catch parameters for old engines",
			"try { sink(1); } catch (e) { sink(e); } try { sink(2); } catch (q) { sink(q); } sink(e);",
			{ mangle: { ie8: true } }
		]
	];

	for (const [name, source, options] of SCOPE_CASES) {
		it(`should analyse scopes as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @param {EXPECTED_OBJECT} settings its options
			 * @returns {Promise<EXPECTED_ANY>} its result, or the error it threw
			 */
			const outcome = async (run, settings) => {
				try {
					return { code: (await run(source, settings)).code };
				} catch (err) {
					return { error: /** @type {Error} */ (err).message };
				}
			};
			for (const compress of [false, { passes: 2 }]) {
				/** @returns {EXPECTED_OBJECT} the options */
				const settings = () => ({ compress, mangle: true, ...JSON.parse(JSON.stringify(options)) });
				const theirs = await outcome(reference.minify, settings());
				// webpack's parser refuses what the spec makes an early error, in its
				// own words, before any scope is read.
				expect(await outcome(minify, settings())).toEqual(
					theirs.error === undefined ? theirs : { error: expect.any(String) }
				);
			}
		});
	}

	const UNSAFE = {
		unsafe: true,
		unsafe_comps: true,
		unsafe_math: true,
		unsafe_regexp: true,
		unsafe_undefined: true,
		passes: 2
	};
	/** @type {[string, string, import("terser").CompressOptions][]} */
	const COMPRESS_CASES = [
		[
			"unsafe literals",
			"sink([1, 2, 3].join('-'), ({ a: 1, b: 'x' }).b, [1, [2]].length, ({ a: 1, toString() { return 'o'; } }).a, ({ ...x }).y, ({ a: function () {} }).a, 'abc'.charAt(1), 'abc'[1], [1, 2][1], /a+b/g.source, /a/gi.global, (function f() {}).length, Math.max(1, 2), Math.floor(2.5), String.fromCharCode(65), Number('1'), [1, 2].indexOf(2), ({})[k], Object.keys);",
			UNSAFE
		],
		[
			"every binary operator on constants",
			"sink(1 && 2, 0 || 3, null ?? 4, 1 | 2, 1 & 3, 1 ^ 3, 1 + 2, 3 * 4, 8 / 2, 7 % 3, 5 - 1, 1 << 3, 16 >> 2, -16 >>> 28, 2 ** 3, 1 == '1', 1 != '2', 1 === 1, 1 !== 2, 1 < 2, 1 <= 2, 2 > 1, 2 >= 3, 1n + 2n, NaN == NaN, 'a' + 1, typeof 1, void 0, !0, ~1, -'2', +'3');",
			UNSAFE
		],
		[
			"comparisons negated under unsafe_comps",
			"if (!(a <= b)) sink(1); if (!(a < b)) sink(2); if (!(a >= b)) sink(3); if (!(a > b)) sink(4); if (!(a == b)) sink(5); if (!(a != b)) sink(6); if (!(a === b) && !(c !== d)) sink(7); sink(!(a && b), !(a || b), !(a ? b : c), !(a, b));",
			UNSAFE
		],
		[
			"optional chains and nullish reads",
			"var n = null; sink(n?.a, n?.[k], n?.(), a?.b.c, a?.[b]?.[c], (void 0)?.x); n?.a; n?.[f()]; a?.b; a?.[b()]; x?.y(); (0, a?.b)();",
			{ pure_getters: "strict", passes: 2, unsafe: true }
		],
		[
			"strict getters, classes and constant expressions",
			"var o = { get a() { return 1; } }; o.a; ({ ...o }).b; (class { static x = 1 }).y; (class A extends B { static [k] = f() }); (function () {}).prototype.x; (a = 1).b; (a ||= b).c; (a, b).c; (x ? y : z).w; arguments.length; function g() { return arguments[0]; } sink(g); var C = class { static #p = 1; static m() {} get [k]() {} }; C.m;",
			{ pure_getters: "strict", passes: 3, toplevel: true, reduce_vars: true, unused: true }
		],
		[
			"side effects of every statement kind",
			"function f() { try { a(); } catch (e) { b(); } finally { c(); } switch (x) { case 1: y(); default: z(); } if (a) b(); else c(); l: for (;;) break l; { d(); } return e; } void f; (function () { var u = 1; u++; --u; delete u.x; typeof u; })(); (() => 1)(); new Date(); new Foo(); `a${b}c`; tag`x`; [...a]; ({ [k]: v, ...r }); class K { [a()] = 1; static [b()] = 2; static { c(); } #m() {} get #g() {} set #s(v) {} m() {} }",
			{ passes: 2, toplevel: true, side_effects: true, pure_new: true }
		],
		[
			"pure calls and builtins",
			"Math.abs(1); Object.freeze({}); [1, 2].map(x => x); 'a'.toUpperCase(); (1).toFixed(2); /a/.test(s); true.toString(); ({}).hasOwnProperty.call(o, 'k'); Object.prototype.hasOwnProperty.call(o, k); Boolean(x); Number(y); String(z); isNaN(w); parseInt('1'); /*@__PURE__*/ f(); g(); Array.isArray(a); JSON.stringify(b);",
			{ unsafe: true, pure_funcs: ["g"], passes: 2 }
		],
		[
			"builtins pure without unsafe",
			"Math.abs(1); Object.keys(o); Array.from(a); new Map(); new Set([1]); [].concat(a); 'x'.slice(1);",
			{ builtins_pure: true, passes: 2 }
		],
		[
			"conditional and logical effects dropped",
			"a ? b() : c; a ? b : c(); a ? b : c; a && b; a || b(); a ?? b(); (a, b, c); x = x; y += 0; (z = 1).w; for (var i in o); !function () {}(); +function () { f(); }(); void function () {}();",
			{ passes: 2, negate_iife: true, sequences: true }
		],
		[
			"self-referential classes and templates",
			"var A = class A { static x = A.y; }; class B { static [B] = 1; } `${a}${b}`; String.raw`x${y}`; sink(`a${1}b${'c'}d`);",
			{ passes: 2, toplevel: true, unused: true, evaluate: true }
		],
		[
			"regexps and functions evaluated once",
			"var r = /(a|b)*c/; sink(r.source, r.flags, /x/y.sticky, /x/s.dotAll, /x/u.unicode, /x/m.multiline, /x/i.ignoreCase, ('' + function () { return 1; }), [function () {}].length, [0, ...[1, 2]].length);",
			UNSAFE
		],
		[
			"bitwise negation and 32-bit contexts",
			"sink(~~a, ~~(a | 0), ~(~a), ~1, ~-1, ~123456789, a | ~~b, ~(a & b), ~~a >>> 0, (~a) ^ 0, +a | 0, ~a ? 1 : 2);",
			{ passes: 2, unsafe_math: true }
		]
	];

	for (const [name, source, options] of COMPRESS_CASES) {
		it(`should compress as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @param {import("terser").MinifyOptions} settings its options
			 * @returns {Promise<{ code: string | undefined } | { error: string }>} its result, or the error it threw
			 */
			const outcome = async (run, settings) => {
				try {
					return { code: (await run(source, settings)).code };
				} catch (err) {
					return { error: /** @type {Error} */ (err).message };
				}
			};
			for (const module of [false, true]) {
				/** @returns {import("terser").MinifyOptions} the options */
				const settings = () => ({
					module,
					mangle: false,
					compress: JSON.parse(JSON.stringify(options))
				});
				expect(await outcome(minify, settings())).toEqual(
					await outcome(reference.minify, settings())
				);
			}
		});
	}

	/** @type {[string, string, (ast: EXPECTED_ANY) => EXPECTED_ANY][]} */
	const SCOPE_ERROR_CASES = [
		["a scope that is not a program", "function f() {}", (ast) => ast.body[0]],
		[
			"a label defined twice",
			"a: { b: { break b; } }",
			(ast) => {
				const inner = ast.body[0].body.body[0];
				inner.label.name = "a";
				inner.body.body[0].label.name = "a";
				return ast;
			}
		],
		[
			"a break to an undefined label",
			"a: { break a; }",
			(ast) => {
				ast.body[0].body.body[0].label.name = "b";
				return ast;
			}
		],
		[
			"an import below the top level",
			"import x from 'y'; { sink(x); }",
			(ast) => {
				ast.body[1].body.push(ast.body.shift());
				return ast;
			}
		]
	];

	for (const [name, source, reshape] of SCOPE_ERROR_CASES) {
		it(`should refuse a tree as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @returns {Promise<string | undefined>} what figuring out scopes threw
			 */
			const refusal = async (run) => {
				// terser's typings leave out `format.ast`, which returns the tree.
				const { ast } = /** @type {EXPECTED_ANY} */ (
					await run(
						source,
						/** @type {EXPECTED_ANY} */ ({
							compress: false,
							mangle: false,
							module: true,
							format: { ast: true, code: false }
						})
					)
				);
				try {
					reshape(ast).figure_out_scope({});
				} catch (err) {
					return /** @type {Error} */ (err).message;
				}
			};
			const theirs = await refusal(reference.minify);
			expect(theirs).toEqual(expect.any(String));
			expect(await refusal(minify)).toBe(theirs);
		});
	}

	/** @type {[string, string, Record<string, EXPECTED_ANY>][]} */
	const UNUSED_CASES = [
		["unused off", "function f() { var a = 1; } sink(f);", { compress: { unused: false } }],
		["assignments kept", "function f() { var a; a = g(); } sink(f);", { compress: { unused: "keep_assign" } }],
		["a retained top-level name", "var keep = 1, drop = 2; function gone() {} sink(1);", { toplevel: true, compress: { top_retain: ["keep"] } }],
		["a write-only increment", "function f() { var x = 0; x++; x += 2; } sink(f);", {}],
		["arguments beside destructured parameters", "function f({ a }, b) { return arguments; } sink(f);", {}],
		["a class referring to itself", "var A = class B { static s = B.foo(); }; sink(1);", {}],
		["a class with a side effect", "class C { static s = sink(); } sink(1);", { toplevel: true }],
		["an unused class", "function f() { class A {} class B { static x = sink(); } } sink(f);", {}],
		["assignments to an unused name", "function f() { var a, b; a = g(); (b = 1, c = 2); b = 3; } sink(f);", {}],
		["an unused rest parameter", "function f(a, ...rest) { return a; } sink(f);", { compress: { keep_fargs: false } }],
		["an IIFE's unused parameters", "sink((function (a, b, c) { return a; })(1));", {}],
		["a for head with an unused initializer", "function f() { for (var i = 0, j = g(); i < 1; i++) sink(i); } sink(f);", {}],
		["a labelled for with an unused initializer", "function f() { l: for (var a = g(), b; ;) break l; } sink(f);", {}],
		["a name declared twice", "function f() { var a = 1; var a = g(); return a; } sink(f);", {}],
		["side effects cascaded", "function f() { var a = g(), b = 1, c = h(), d = i(); return b + d; } sink(f);", {}],
		["side effects before a kept name", "function f() { var a = g(), b; return b; } sink(f);", {}],
		["a catch parameter redeclared", "function f() { try { sink(); } catch (e) { var e = g(); } } sink(f);", {}],
		["an unused block-scoped name", "function f() { { let a = g(); const b = 1; } } sink(f);", {}],
		["destructuring with pure getters", "function f() { var {} = o; var [] = p; var { a } = q; } sink(f);", { compress: { pure_getters: true } }],
		["a fixed value reassigned", "function f() { var a = 1; a = 2; return a; } sink(f);", {}],
		["an initializer assigning another name", "function f() { var a = function () { b = 1; }; var b; return a; } sink(f);", {}],
		["a for-in over a declaration", "function f(o) { for (var k in o) sink(); } sink(f);", {}],
		["a named function expression", "sink(function named() { return 1; }, class Named {});", {}],
		["a getter", "sink({ get a() { var unused = 1; return 2; } });", {}],
		["a labelled for left a block", "function f() { l: for (var a = g(), b = 1; b; ) break l; } sink(f);", {}],
		["a fixed value moved to an assignment", "function f() { var a = g(); a = 1; return a; } sink(f);", {}],
		["a name declared twice apart", "function f() { var a = 1; sink(a); var a = g(); return a; } sink(f);", {}],
		["side effects after a kept name", "function f() { var b = x(), a = g(), c = h(); return b + c; } sink(f);", {}]
	];

	// Cases of terser's own suite reaching a branch no case above reaches, under
	// the compress options it gives them.
	/** @type {[string, string, import("terser").CompressOptions][]} */
	const UNUSED_TERSER_CASES = [
		[
			"arguments beside a destructured parameter",
			'(function ({ d }) { console.log(a = "foo", arguments[0].d); })({ d: "Bar" });',
			{ arguments: true, defaults: true }
		],
		[
			"side effects joined into a kept initializer",
			"function f2(x) { var a = 4, b = x.prop, c = 5, not_used = sideeffect1(), e = sideeffect2(); return b + (function () { return -a * e - c; })(); }",
			{ collapse_vars: true, evaluate: true, join_vars: true, reduce_funcs: true, reduce_vars: true, sequences: true, side_effects: true, unused: true }
		],
		[
			"a name declared twice with a value",
			"console.log(function () { var a = 1, b = 2, c = 3; var a = c++, b = b /= a; return function () { return a; }() + b; }());",
			{ collapse_vars: true, unused: true }
		],
		[
			"a labelled for's initializer moved out",
			"!function () { L: for (var a = 1, b = console.log(a); --a;) continue L; }();",
			{ unused: true }
		],
		[
			"a declaration reassigned before it is read",
			"function f2() { var a = {}; a = []; return a; } console.log(f2());",
			{ passes: 2, reduce_vars: true, side_effects: true, unused: true }
		],
		[
			"a fixed name redeclared with a value",
			"function f6(a) { a = {}; var a = []; return a; } console.log(f6());",
			{ passes: 2, reduce_vars: true, side_effects: true, unused: true }
		]
	];

	for (const [name, source, compress] of UNUSED_TERSER_CASES) {
		it(`should drop unused names as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/** @returns {EXPECTED_OBJECT} the options */
			const settings = () => ({
				compress: compress.defaults ? { ...compress } : { defaults: false, ...compress },
				mangle: false
			});
			const ours = await minify(source, settings());
			const theirs = await reference.minify(source, settings());
			expect(ours.code).toBe(theirs.code);
		});
	}

	for (const [name, source, options] of UNUSED_CASES) {
		it(`should drop unused names as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			for (const base of [{ compress: { passes: 2 }, mangle: true }, { mangle: false }]) {
				/** @returns {EXPECTED_OBJECT} the options */
				const settings = () => {
					const merged = { ...base, ...JSON.parse(JSON.stringify(options)) };
					if (options.compress) {
						merged.compress = { ...(base.compress || {}), ...options.compress };
					}
					return merged;
				};
				const ours = await minify(source, settings());
				const theirs = await reference.minify(source, settings());
				expect(ours.code).toBe(theirs.code);
			}
		});
	}

	// Sources reaching each node class's flow analysis: hoisted functions read
	// before a write, branches, loops, chains and the assignments it tracks.
	/** @type {[string, string, import("terser").CompressOptions?][]} */
	const REDUCE_CASES = [
		["a hoisted function read before a write", "f(); var a = g(); function f() { return a; } sink(f);"],
		[
			"hoisted functions calling each other",
			"b(); var x = g(); function a() { return x; } function b() { return a(); } function c() { return b() + x; } sink(a, b, c);"
		],
		[
			"hoisted functions inside a function",
			"function outer() { k(); var v = h(); function g() { return v; } function k() { return g(); } function unread() { return v; } return k; } sink(outer);"
		],
		[
			"a hoisted function written after it is read",
			"function outer() { var v = h(); function g() { return v; } v = h(); return g; } sink(outer);"
		],
		["a recursive function", "function r(n) { return n && r(n - 1) + x; } var x = g(); sink(r(2));"],
		["a named function expression", "var f = function g(n) { return n ? g(n - 1) : 0; }; sink(f(3));"],
		["an IIFE's parameters", "(function (a, b) { sink(a + b); })(1, 2); (function (a, b) { sink(a, b); })(1);"],
		[
			"an IIFE reading its arguments",
			'(function (a, b) { "use strict"; sink(arguments, a); })(1); (function (a) { sink(arguments, a); })(1); (function (a, a2) { sink(a); })(...g());'
		],
		["optional chains", "var o = g(); sink(o?.a?.(o.b), o?.[k], o.c?.d);"],
		["logical assignments", "var a = g(); a ||= 1; a &&= b(); a ??= c; var d; d ||= 2; sink(a, d);"],
		["compound assignments and steps", "var a = 1; a += 2; a++; --a; var b = g(); b -= 1; sink(a, b);"],
		["a for loop with continue", "for (var i = 0; i < 3; i++) { if (i) continue; sink(i); }"],
		["a do loop with break", "var a = 1; do { if (g()) break; a = 2; } while (a < 3); sink(a);"],
		["a while loop", "var a = g(); while (a) { a = h(a); } sink(a);"],
		["a for-in and a for-of", "var o = g(); for (var k in o) sink(k); for (const v of o) sink(v);"],
		["try, catch and finally", "var a = 1; try { a = g(); } catch (e) { e = 1; sink(e); } finally { sink(a); }"],
		["a switch with a default", "var a = 1; switch (g()) { case a: a = 2; break; default: sink(a); }"],
		["a labelled block", "l: { var a = g(); if (a) break l; sink(a); }"],
		["a class with a static block", "class C { static { var a = 1; sink(a); } m() { return C; } } sink(new C());"],
		["destructuring", "var { a, b } = g(); [a, b] = [b, a]; sink(a, b);"],
		["conditionals and lazy operators", "var a = g(); var b = a ? 1 : 2; var c = a || b; sink(b, c, a && h());"],
		["values escaping through properties", "var o = { a: { b: 1 } }, p = [o]; sink(o.a.b, o.a, p[0], ...p);"],
		["accessors", "sink({ get a() { var x = 1; return x; }, set a(v) { var y = v; sink(y); } });"],
		["a value modified after it is fixed", "var o = {}; o.x = 1; var a = [1]; a.push(2); sink(o, a);"],
		[
			"generators, async functions and calls",
			"function* gen() { var a = {}; yield a; } async function h() { var b = {}; await b; return b; } var C = function () {}; var o = new C(); sink(gen, h, o);"
		],
		["a top level analysed", "var a = 1; function f() { return a; } f();", { toplevel: true }],
		[
			"a retained top-level function",
			"function f() { return 1; } function g() { return f(); } g();",
			{ toplevel: true, top_retain: ["f"] }
		],
		["without flow analysis", "var a = 1; function f() { return a; } sink(f());", { reduce_vars: false }],
		[
			"a single-use value modified, then read and assigned",
			"function f() { var o = {}; o.p = 1; sink(o); o = 2; return o; } sink(f);"
		],
		["a declared `arguments` read", "function f() { var arguments; return arguments; } sink(f);"],
		["a function name assigned", "function f() { function g() {} g = h(); return g; } sink(f);"],
		["a class expression escaping", "function f() { var C = class {}; sink(C); } sink(f);"],
		["a value yielded from another scope", "var a = {}; function* g() { yield a; } sink(g);"],
		[
			"properties read off a value before it escapes",
			"var o = { a: { b: g() } }, p = { a: { b: {} } }; function h() { return o.a; } function k() { return p.a.b; } sink(h, k);",
			{ toplevel: true }
		],
		[
			"assignments in a function",
			"function f() { var a; a += 1; var b; (b = {}).x = 1; var c = g(); c ||= 1; c &&= h(); var d = 1; d += 2; d++; --d; var e; e++; o.x++; return [a, b, c, d, e]; } sink(f);"
		],
		["an IIFE parameter redeclared", "(function (a) { var a; sink(a); })(1);"],
		[
			"hoisted functions reached twice",
			"function outer() { a(); var x = g(); function a() { return b() + c(); } function b() { return d(); } function c() { return d(); } function d() { return x; } return a; } sink(outer);"
		],
		["a `using` declaration", "function f() { using r = g(); sink(r); } sink(f);"],
		["an arrow declaring `arguments`", "sink(() => { var arguments; return arguments; });"],
		[
			"an assignment after a loop head gave up on it",
			"function f(o) { var a = 1; for (a in o); a = 2; return a; } sink(f);"
		],
		[
			"a function name stepped",
			"function f() { function g() {} g += 1; function k() {} k++; return [g, k]; } sink(f);"
		],
		["a local value yielded", "function* gen() { var a = g(); yield a; } sink(gen);"]
	];

	for (const [name, source, compress] of REDUCE_CASES) {
		it(`should analyse flow as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/** @type {string[]} */
			const outputs = [];
			for (const base of [{ passes: 2 }, {}]) {
				/** @returns {EXPECTED_OBJECT} the options */
				const settings = () => ({
					compress: { ...base, ...compress },
					mangle: Object.keys(base).length !== 0
				});
				const ours = await minify(source, settings());
				const theirs = await reference.minify(source, settings());
				expect(ours.code).toBe(theirs.code);
				outputs.push(/** @type {string} */ (ours.code));
			}
			expect(outputs).toMatchSnapshot();
		});
	}

	const INLINE_MAP = Buffer.from(
		JSON.stringify({ version: 3, sources: ["x.js"], names: [], mappings: "AAAA" })
	).toString("base64");

	/** @type {[string, EXPECTED_ANY, EXPECTED_OBJECT][]} */
	const DRIVER_CASES = [
		["timings", "sink(1 + 2);", { timings: true }],
		[
			"a source map written inline",
			{ "a.js": "function f(x) { return x + 1; } sink(f);" },
			{ sourceMap: { url: "inline", filename: "out.js" } }
		],
		[
			"a source map as an object, with a url",
			{ "a.js": "sink(1);" },
			{ sourceMap: { asObject: true, url: "out.js.map", root: "/" } }
		],
		[
			"a source map read from the input",
			`sink(1)\n//# sourceMappingURL=data:application/json;base64,${INLINE_MAP}`,
			{ sourceMap: { content: "inline" } }
		],
		[
			"an input map read from two files",
			{ "a.js": "sink(1);", "b.js": "sink(2);" },
			{ sourceMap: { content: "inline" } }
		],
		["a source without the input map it names", "sink(1);", { sourceMap: { content: "inline" } }],
		["wrapped as a CommonJS module", "exports.a = 1;", { wrap: "lib" }],
		["enclosed", "sink(window);", { enclose: "window:w" }],
		[
			"property mangling with quoted keys and a name cache",
			"var o = { alpha: 1, 'beta': 2 }; sink(o.alpha, o.beta, o['gamma']);",
			{ mangle: { properties: { keep_quoted: true } }, nameCache: {} }
		],
		[
			"property mangling, strictly quoted",
			"var o = { alpha: 1, 'beta': 2 }; sink(o.alpha, o.beta);",
			{ mangle: { properties: { keep_quoted: "strict" } } }
		],
		["a name cache", "function f(longName) { return longName; } sink(f);", { nameCache: { vars: { props: {} } }, toplevel: true }],
		["private members", "class A { #x = 1; get x() { return this.#x; } } sink(A);", {}],
		["private members in files", { "a.js": "class A { #x = 1; m() { return #x in this; } } sink(A);" }, {}],
		["the tree kept", "sink(1);", { format: { ast: true } }],
		["no code", "sink(1);", { format: { code: false } }],
		["ESTree out", "sink(1);", { format: { spidermonkey: true } }],
		[
			"ESTree in",
			{
				type: "Program",
				body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 1 } }]
			},
			{ parse: { spidermonkey: true } }
		],
		["output and format both", "sink(1);", { output: {}, format: {} }],
		["an unknown option", "sink(1);", { unknown: true }],
		["no source", {}, {}],
		["an array of sources", ["sink(1);", "sink(2);"], {}],
		["mangling off", "function f(longName) { return longName; } sink(f);", { mangle: false }],
		["property mangling on", "var o = { alpha: 1 }; sink(o.alpha);", { mangle: { properties: true } }],
		[
			"property mangling with reserved names kept quoted",
			"var o = { alpha: 1, 'beta': 2 }; sink(o.alpha, o.beta);",
			{ mangle: { properties: { keep_quoted: true, reserved: ["alpha"] } } }
		],
		[
			"ESTree in, from two files",
			{
				"a.js": { type: "Program", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 1 } }] },
				"b.js": { type: "Program", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 2 } }] }
			},
			{ parse: { spidermonkey: true }, compress: false }
		],
		["names kept as told", "class Long {} function f() {} sink(Long, f);", { keep_classnames: false, keep_fnames: true, rename: false }],
		[
			"a name cache already holding names",
			"function f(longName) { return longName; } sink(f);",
			{ nameCache: { vars: { props: { $f: "q" } } }, toplevel: true }
		],
		["a name cache without a mangle cache", "sink(1);", { nameCache: {}, mangle: { cache: null } }],
		["an inline source map as an object", "sink(1);", { sourceMap: { url: "inline", asObject: true } }],
		[
			"ESTree in, as an array",
			[
				{ type: "Program", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 1 } }] },
				{ type: "Program", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 2 } }] }
			],
			{ parse: { spidermonkey: true }, compress: false }
		]
	];

	for (const [name, files, options] of DRIVER_CASES) {
		it(`should drive a minify as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @returns {Promise<EXPECTED_ANY>} what it wrote, or the error it threw
			 */
			const outcome = async (run) => {
				const settings = JSON.parse(JSON.stringify(options));
				try {
					/** @type {EXPECTED_ANY} */
					const result = await run(JSON.parse(JSON.stringify(files)), settings);
					return {
						code: result.code,
						map: result.map,
						decoded: result.decoded_map,
						ast: result.ast === undefined ? undefined : typeof result.ast,
						timings: result.timings && Object.keys(result.timings),
						nameCache: settings.nameCache && JSON.stringify(settings.nameCache)
					};
				} catch (err) {
					return { error: thrownMessage(err) };
				}
			};
			expect(await outcome(minify)).toEqual(await outcome(reference.minify));
		});
	}

	for (const name of ["expression", "experimental_typescript", "strict"]) {
		it(`should refuse terser's \`${name}\` parse option`, async () => {
			const { minify } = await load();
			await expect(
				minify("a + b", /** @type {EXPECTED_ANY} */ ({ parse: { [name]: true } }))
			).rejects.toThrow(`\`${name}\` is not a supported option`);
		});
	}

	it("should drive a minify as terser does: sources inherited by the files object", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/** @returns {Record<string, string>} own and inherited sources */
		const files = () =>
			Object.assign(Object.create({ "inherited.js": "sink(0);" }), {
				"a.js": "sink(1);",
				"b.js": "sink(2);"
			});
		const { code } = await minify(files(), {});
		expect(code).toBe((await reference.minify(files(), {})).code);
		expect(code).toMatchSnapshot();
	});

	it("should drive a minify as terser does: a tree with its sources asked for", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/**
		 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
		 * @returns {Promise<string | undefined>} what the second minify threw
		 */
		const refusal = async (run) => {
			// terser's typings leave out `format.ast`, which returns the tree.
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await run("sink(1);", /** @type {EXPECTED_ANY} */ ({ format: { ast: true } }))
			);
			try {
				await run(ast, { sourceMap: { includeSources: true } });
			} catch (err) {
				return /** @type {Error} */ (err).message;
			}
		};
		const theirs = await refusal(reference.minify);
		expect(theirs).toEqual(expect.any(String));
		expect(await refusal(minify)).toBe(theirs);
	});

	it("should drive a minify as terser does: a tree handed back with a private member", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/**
		 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
		 * @returns {Promise<string | undefined>} a returned tree, given a private member, minified again
		 */
		const handedBack = async (run) => {
			const settings = /** @type {EXPECTED_ANY} */ ({
				compress: false,
				mangle: false,
				format: { ast: true }
			});
			const { ast } = /** @type {EXPECTED_ANY} */ (await run("sink(1);", settings));
			const { ast: other } = /** @type {EXPECTED_ANY} */ (
				await run("class A { #x = 1; m() { return this.#x; } } sink(A);", settings)
			);
			ast.body = other.body;
			return (await run(ast, {})).code;
		};
		const code = await handedBack(minify);
		expect(code).toBe(await handedBack(reference.minify));
		expect(code).toMatchSnapshot();
	});

	it("should drop unused names as terser does: sequences emptied in a tree", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/**
		 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
		 * @returns {Promise<string | undefined>} the tree minified with its sequences emptied
		 */
		const emptied = async (run) => {
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await run(
					"function f(a) { sink(a, (a, a)); a, a; } sink(f);",
					/** @type {EXPECTED_ANY} */ ({ compress: false, mangle: false, format: { ast: true } })
				)
			);
			const body = ast.body[0].body;
			body[0].body.args[1].expressions = [];
			body[1].body.expressions = [];
			return (
				await run(ast, { compress: { defaults: false, unused: true }, mangle: false })
			).code;
		};
		const code = await emptied(minify);
		expect(code).toBe(await emptied(reference.minify));
		expect(code).toMatchSnapshot();
	});

	it("should drop unused names as terser does: a scope without its variables", async () => {
		const { minify } = await load();
		const reference = terserReference();
		const compressor = { option: () => true, has_directive: () => undefined };
		/**
		 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
		 * @returns {Promise<EXPECTED_ANY>} what dropping unused names in the class returned
		 */
		const dropped = async (run) => {
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await run(
					"class A {}",
					/** @type {EXPECTED_ANY} */ ({ compress: false, mangle: false, format: { ast: true } })
				)
			);
			const node = ast.body[0];
			node.variables = undefined;
			return node.drop_unused(compressor);
		};
		expect(await dropped(minify)).toBe(await dropped(reference.minify));
	});

	it("should write terser's debug log as terser does", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/**
		 * @param {EXPECTED_FUNCTION} run a minify
		 * @param {EXPECTED_ANY} files the sources
		 * @param {EXPECTED_OBJECT} options the options
		 * @returns {Promise<{ code?: string, logs: string[][] }>} the result, and each file written with its name
		 */
		const logged = async (run, files, options) => {
			/** @type {string[][]} */
			const logs = [];
			const fs = {
				writeFileSync: (/** @type {string} */ file, /** @type {string} */ text) =>
					logs.push([file, text]),
				mkdirSync() {
					throw Object.assign(new Error("exists"), { code: "EEXIST" });
				}
			};
			const previous = process.env.TERSER_DEBUG_DIR;
			process.env.TERSER_DEBUG_DIR = "debug";
			try {
				const { code } = await run(files, options, fs);
				return { code, logs };
			} finally {
				if (previous === undefined) delete process.env.TERSER_DEBUG_DIR;
				else process.env.TERSER_DEBUG_DIR = previous;
			}
		};
		// Built per run: both minifiers write into the option groups they are given.
		/** @type {[EXPECTED_ANY, () => EXPECTED_OBJECT][]} */
		const inputs = [
			["sink(1 + 2);", () => ({ compress: { pure_funcs: ["f"] } })],
			[
				{ "a.js": "sink(1);", "b.js": "sink(2);" },
				() => ({ mangle: { reserved: ["x"] } })
			],
			[
				{ type: "Program", body: [] },
				() => ({ parse: { spidermonkey: true }, format: { comments: /^!/ } })
			]
		];
		for (const [files, options] of inputs) {
			const ours = await logged(minify, files, options());
			const theirs = await logged(reference.minify, files, options());
			expect(ours.code).toBe(theirs.code);
			expect(ours.logs).toHaveLength(1);
			expect(ours.logs[0][0]).toMatch(/^debug\/terser-debug-\d+\.log$/);
			expect(ours.logs[0][1]).toBe(theirs.logs[0][1]);
		}

		const failing = {
			writeFileSync() {},
			mkdirSync() {
				throw Object.assign(new Error("denied"), { code: "EACCES" });
			}
		};
		process.env.TERSER_DEBUG_DIR = "debug";
		try {
			await expect(
				/** @type {EXPECTED_FUNCTION} */ (minify)("a", {}, failing)
			).rejects.toThrow("denied");
			const result = await /** @type {EXPECTED_FUNCTION} */ (minify)("a", {}, {});
			expect(result.code).toBe("a;");
		} finally {
			delete process.env.TERSER_DEBUG_DIR;
		}
	});

	/** @type {[string, EXPECTED_ANY, EXPECTED_OBJECT][]} */
	const PARSED_BY_TERSER = [
		["sources embedded in the map", "sink(1)", { sourceMap: { includeSources: true } }],
		[
			"an inline input map",
			`sink(1)\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
				JSON.stringify({ version: 3, sources: ["x.js"], names: [], mappings: "AAAA" })
			).toString("base64")}`,
			{ sourceMap: { content: "inline" } }
		],
		["a tree printed as ESTree", "sink(1)", { format: { spidermonkey: true } }],
		["a shebang terser is told to refuse", "#!/bin/node\nsink(1)", { parse: { shebang: false } }],
		["two files", { "a.js": "sink(1)", "b.js": "sink(2)" }, {}],
		["an array of sources", ["sink(1)", "sink(2)"], {}],
		["a file that is not text", { "a.js": 1 }, {}],
		["a shebang ended by a carriage return", "#!/bin/node\r{}", {}],
		["a shebang ended by a line separator", "#!/bin/node\u2028{}", {}],
		["a shebang ended by a paragraph separator", "#!/bin/node\u2029{}", {}],
		["a source webpack's parser refuses", "sink(", {}],
		["a private field with no class around it", "sink(foo.#bar);", {}],
		["a private field tested with no class around it", "sink(#foo in bar);", {}],
		["a source terser reads its own way", "x = 0123;", {}],
		["a module", "export const a = 1; import b from 'c'; sink(b);", { module: true }],
		["a module named by the parse options", "export const a = 1;", { parse: { module: true } }],
		["a module whose parse options are unset", "await x;", { module: true, parse: undefined }],
		["a module whose parse options are not an object", "await x;", { module: true, parse: true }],
		["a module the parse options say is not one", "await x;", { module: true, parse: { module: false } }],
		["a return outside a function", "return 1;", { parse: { bare_returns: true } }],
		["a string rather than files", "sink(1)", {}]
	];

	for (const [name, files, options] of PARSED_BY_TERSER) {
		it(`should minify as terser does where terser parses: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @returns {Promise<EXPECTED_ANY>} its result, or the error it threw
			 */
			const outcome = async (run) => {
				try {
					const result = await run(JSON.parse(JSON.stringify(files)), {
						...options,
						compress: false
					});
					return { code: result.code, map: result.map };
				} catch (err) {
					return { error: thrownMessage(err) };
				}
			};
			const theirs = await outcome(reference.minify);
			// The two parsers word a refusal each their own way.
			expect(await outcome(minify)).toEqual(
				theirs.error === undefined ? theirs : { error: expect.any(String) }
			);
		});
	}

	// Layouts where a comment decides where a line break or a brace is printed,
	// which terser's tokenizer, its parentheses and its sequences each decide.
	/** @type {[string, string][]} */
	const COMMENT_PLACEMENT_CASES = [
		[
			"a banner comment before a parenthesized call",
			"/*!\n * banner\n */\n(function (w) { w.x = 1; })(this);"
		],
		[
			"a banner comment read after an operator",
			"!/*!\n * banner\n */\nfunction (g) { g.x = 1; }(this);"
		],
		[
			"a comment of a parenthesis, on the line before it",
			"var a = 1;/*! keep */\n(function () { a++; })();"
		],
		[
			"two comments of a parenthesis, on the line before it",
			"var a = 1;/*! one */ /*! two */\n(function () { a++; })();"
		],
		[
			"a comment on the line its parenthesis opens",
			"/*! a */(function () {})();"
		],
		[
			"a comment inside a parenthesis holding none of its own",
			"sink((/*! a */ function () {})());"
		],
		[
			"a bigint written with separators and each radix",
			"sink(0x20n, 123_456_789n, 0b1010n, 1_000n, 0o17n, 9_007_199_254_740_993n);"
		],
		[
			"a comment whose line breaks are carriage returns",
			"/*!\r\n * banner\r\n */\r\n(function (w) { w.x = 1; })(this);\r\n"
		],
		[
			"a comment broken by a line separator",
			"/*!\u2028 * banner\u2029 */\n(function (w) { w.x = 1; })(this);"
		],
		[
			"a comment after a function returning a sequence",
			"function q(t) { return f(t), new d(t); }\n/*! keep */\nsink(q);"
		],
		[
			"a comment after a function returning a parenthesized sequence",
			"function q(t) { return (f(t), new d(t)); }\n/*! keep */\nsink(q);"
		],
		[
			"a comment after a sequence of its own",
			"D.A = new D(1), D.B = new D(2);\n/*! keep */\nsink(D);"
		],
		["a sequence ending the source", "/*! keep */\nsink(a), sink(b)"]
	];
	for (const [name, source] of COMMENT_PLACEMENT_CASES) {
		it(`should print a comment where terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			const options = { compress: false, mangle: false };
			const ours = await minify(source, { ...options });
			const theirs = await reference.minify(source, { ...options });
			expect(ours.code).toBe(theirs.code);
		});
	}

	// `wrap` and `enclose` are options terser reads but its types omit.
	/** @type {[string, string, EXPECTED_OBJECT][]} */
	const DEFINE_CASES = [
		[
			"globals replaced by source `global_defs` names with `@`",
			"sink(VALUE, CALL(1), SEQUENCE);",
			{
				compress: {
					global_defs: {
						"@VALUE": "a + b // the rest of the line",
						"@CALL": "function (x) { return x * 2; }",
						"@SEQUENCE": "a, b"
					}
				}
			}
		],
		[
			"globals replaced by what `global_defs` gives them",
			"if (DEBUG) console.log(FOO.bar, import.meta.env, O?.x, FOO.bar.baz); FOO.bar = 1; function g(DEBUG) { return DEBUG; } console.log(g(2));",
			{
				module: true,
				compress: {
					global_defs: {
						DEBUG: false,
						"FOO.bar": [1, { a: 2 }],
						"import.meta.env": 3,
						O: { x: "y" }
					}
				}
			}
		],
		[
			"every `console` call dropped",
			"console.log(1); var f = console.log.bind(console); console.log.call(console, 2); console.a.b.c(); x = console.warn.apply(console, []); f();",
			{ compress: { drop_console: true } }
		],
		[
			"only the `console` methods named dropped",
			"console.log(1); console.warn(2); var f = console.log.bind(console); f();",
			{ compress: { drop_console: ["log"] } }
		],
		["a module wrapped as CommonJS", "var x = 1; exports.x = x;", { wrap: "lib" }],
		[
			"a script enclosed in a call",
			"console.log(a, b);",
			{ enclose: "a,b:1,2", compress: false }
		],
		["a script enclosed without arguments", "console.log(1);", { enclose: true }],
		[
			"parameters and declarations destructured",
			"function f({ a }, [b], ...c) { return a + b + c.length; } function g(d = 1, { e } = {}) { var { h, i: [j] } = e; return d + h + j; } console.log(f({ a: 1 }, [2], 3), g(), f.length, g.length);",
			{ compress: { passes: 2, unsafe: true }, mangle: false }
		],
		[
			"a labeled loop inlined twice",
			"function f(n) { l: for (var i = 0; i < n; i++) { if (i > 2) break l; } return i; } console.log(f(5), f(1));",
			{ compress: { passes: 3, inline: 3, reduce_funcs: false }, mangle: false }
		],
		[
			"a call of an annotated call",
			"var r = /* @__PURE__ */ ((x) => y.z)(function (x) {})(E || {}); sink(r);",
			{ compress: { passes: 2 }, mangle: false }
		],
		[
			"a class reading itself as it is defined",
			"class A { static x = A.name; static [Symbol.iterator] = 1; static { this.y = 1; } m() {} } class B { static x = this; } class C extends Object { static z = function () { return this; }; }",
			{ module: true, compress: { toplevel: true, unused: true } }
		]
	];
	for (const [name, source, options] of DEFINE_CASES) {
		it(`should minify as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			const ours = await minify(
				source,
				/** @type {import("terser").MinifyOptions} */ ({ ...options })
			);
			const theirs = await reference.minify(
				source,
				/** @type {import("terser").MinifyOptions} */ ({ ...options })
			);
			expect(ours.code).toBe(theirs.code);
		});
	}

	it("should give a global the copy of a node `global_defs` gives it", async () => {
		const {
			minify,
			modules: { parse }
		} = await load();
		const value = parse.parse("(function () { return 1 + x; })").body[0].body;
		const { code } = await minify("console.log(A, A, B);", {
			compress: {
				global_defs: { A: value, B: parse.parse("2").body[0].body },
				passes: 1,
				reduce_vars: false,
				unused: false
			},
			mangle: false
		});
		expect(code).toBe(
			"console.log(function(){return 1+x},function(){return 1+x},2);"
		);
	});

	it("should refuse a `global_defs` source that is not one expression", async () => {
		const { minify } = await load();
		await expect(
			minify("sink(A);", { compress: { global_defs: { "@A": "1); (2" } } })
		).rejects.toThrow("`@A` is not one expression");
	});

	it("should give terser's nodes the methods terser writes by hand", async () => {
		const { ast, parse } = (await load()).modules;
		const { TreeWalker } = ast;
		/**
		 * @param {string} source a script
		 * @returns {EXPECTED_ANY} its toplevel, its scopes worked out
		 */
		const parsed = (source) => {
			const toplevel = parse.parse(source);
			toplevel.figure_out_scope({});
			return toplevel;
		};

		const labeled = parsed("l: for (;;) { { let x; } break l; }").body[0];
		const copy = labeled.clone(true);
		expect(copy).not.toBe(labeled);
		expect(copy.label.references).toHaveLength(1);
		expect(labeled.clone(false).body).toBe(labeled.body);

		const toplevel = parsed("function f(a) { return a; }");
		const declared = toplevel.body[0];
		const cloned = declared.clone(true, toplevel);
		expect(cloned.variables).not.toBe(declared.variables);
		expect(declared.clone(false).variables).not.toBe(declared.variables);
		expect(declared.get_defun_scope()).toBe(declared);
		expect(declared.pinned()).toBeFalsy();

		const lambda = parsed("function f({ a }, [b], ...c) {} function g(d = 1, e) { return d; } function h(p, q) {}").body;
		expect(lambda[2].args_as_names()).toBe(lambda[2].argnames);
		expect(lambda[1].argnames[0].all_symbols().map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["d"]);
		expect(lambda[0].args_as_names().map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["a", "b", "c"]);
		expect(lambda[1].args_as_names().map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["d", "e"]);
		expect(lambda[0].length_property()).toBe(2);
		expect(lambda[1].is_braceless()).toBeTruthy();
		expect(lambda[0].is_braceless()).toBeFalsy();
		const definitions = parsed("var { h, i: [j] } = o, k;").body[0].definitions;
		expect(definitions[0].declarations_as_names().map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["h", "j"]);
		expect(definitions[1].declarations_as_names().map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["k"]);

		const object = parsed("({ a: 1, [b]: 2, get c() {}, set [d](v) {}, e() {} })").body[0].body;
		expect(object.properties.map((/** @type {EXPECTED_ANY} */ p) => p.computed_key())).toEqual([false, true, false, true, false]);
		const declaredClass = parsed(
			"class K extends L { #p = 1; static q = this; r = 2; static { s(); } #t() {} get #u() {} set #u(v) {} static [w] = 3; x() {} }"
		).body[0];
		expect(declaredClass.properties.map((/** @type {EXPECTED_ANY} */ p) => p.computed_key())).toEqual([
			false, false, false, false, false, false, false, true, false
		]);
		/**
		 * @param {string} method a class's method walking parts of it
		 * @returns {string[]} the types of the nodes it visits
		 */
		const visits = (method) => {
			/** @type {string[]} */
			const types = [];
			declaredClass[method](
				new TreeWalker((/** @type {EXPECTED_ANY} */ node) => {
					types.push(node.TYPE);
				})
			);
			return types;
		};
		expect(visits("visit_nondeferred_class_parts")).toEqual([
			"SymbolRef", "This", "ClassStaticBlock", "SimpleStatement", "Call", "SymbolRef", "SymbolRef", "Number"
		]);
		// A field's value is walked with the field pushed, not visited.
		expect(visits("visit_deferred_class_parts")).toEqual([
			"Number", "Number", "PrivateMethod", "SymbolMethod", "Accessor", "ConciseMethod", "SymbolMethod", "Accessor"
		]);

		/** @type {Record<string, unknown>} */
		const seen = {};
		const walked = parsed(
			'"use strict"; function f() { a: for (var i in o) { switch (i) { case 1: break; default: continue a; } } while (1) { for (let j = g(); j; ) { break; } } }'
		);
		walked.walk(
			new TreeWalker(
				/**
				 * @this {EXPECTED_ANY} the walker
				 * @param {EXPECTED_ANY} node the node visited
				 * @returns {void}
				 */
				function visit(node) {
				if (node.TYPE === "Break" || node.TYPE === "Continue") {
					const target = this.loopcontrol_target(node);
					const key = `${node.TYPE}${node.label ? " label" : ""}`;
					seen[key] = [...(/** @type {string[]} */ (seen[key]) || []), target.TYPE];
				}
				if (node.TYPE === "Call") {
					seen.withinLoop = this.is_within_loop();
					seen.scope = this.find_scope().TYPE;
					seen.parent = this.parent().TYPE;
					seen.self = this.self().TYPE;
					seen.lambda = this.find_parent(ast.LambdaNode).TYPE;
					seen.strict = Boolean(this.has_directive("use strict"));
				}
				if (node.TYPE === "SymbolRef" && node.name === "o") {
					seen.objectWithinLoop = this.is_within_loop();
				}
				if (node.TYPE === "Toplevel") {
					seen.toplevelStrict = Boolean(this.has_directive("use strict"));
					seen.toplevelAsm = this.has_directive("use asm");
				}
				}
			)
		);
		expect(seen).toEqual({
			toplevelStrict: true,
			toplevelAsm: undefined,
			objectWithinLoop: false,
			Break: ["Switch", "For"],
			"Continue label": ["ForIn"],
			withinLoop: true,
			scope: "Scope",
			parent: "VarDef",
			self: "Call",
			lambda: "Defun",
			strict: true
		});
	});

	it("should look native objects up as terser's native-objects.js does", async () => {
		const helpers =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "helpers")
			);
		const modules = await loadTerserSources(importTerserSource);
		const reference = modules.nativeObjects;
		helpers.install(modules);
		const own = modules.nativeObjects;
		expect(own).not.toBe(reference);
		expect(Object.keys(own).sort()).toEqual(Object.keys(reference).sort());
		expect(own.pure_prop_access_globals).toEqual(
			reference.pure_prop_access_globals
		);

		const data = require("../../lib/javascript/syntax-printer-data").nativeObjectTables();
		/** @type {Set<string>} */
		const globalNames = new Set(["globalThis", "Reflect", "unknownGlobal"]);
		/** @type {Set<string>} */
		const memberNames = new Set(["unknownMember", "__proto__", "hasOwn"]);
		/**
		 * @param {(string | { name: string })[]} names a table's names
		 * @param {Set<string>} into where to collect them
		 */
		const collect = (names, into) => {
			for (const entry of names) {
				into.add(typeof entry === "string" ? entry : entry.name);
			}
		};
		collect(data.NATIVE_PURE_ACCESS_GLOBALS, globalNames);
		collect(data.NATIVE_PURE_FUNCTIONS, globalNames);
		for (const table of [
			data.NATIVE_PURE_METHODS,
			data.NATIVE_PURE_STATIC_FUNCTIONS,
			data.NATIVE_PURE_STATIC_PROPERTIES
		]) {
			for (const globalName of Object.keys(table)) {
				globalNames.add(globalName);
				collect(table[globalName].names, memberNames);
			}
		}

		for (const unsafe of [true, false, 0]) {
			for (const ecma of [5, 2015, 2020, 2021, 2022, 2025, 2026]) {
				/** @type {Record<string, unknown>} */
				const options = { unsafe, builtins_ecma: ecma };
				const compressor = {
					/**
					 * @param {string} key an option
					 * @returns {unknown} its value
					 */
					option: (key) => options[key]
				};
				const label = `unsafe: ${unsafe}, builtins_ecma: ${ecma}`;
				/** @type {string[]} */
				const mismatches = [];
				for (const name of /** @type {const} */ ([
					"pure_access_globals",
					"is_pure_native_fn"
				])) {
					const expected = reference[name](compressor);
					const actual = own[name](compressor);
					for (const globalName of globalNames) {
						if (actual(globalName) !== expected(globalName)) {
							mismatches.push(`${label} ${name}(${globalName})`);
						}
					}
				}
				for (const name of /** @type {const} */ ([
					"is_pure_native_method",
					"is_pure_native_static_fn",
					"is_pure_native_static_property"
				])) {
					const expected = reference[name](compressor);
					const actual = own[name](compressor);
					for (const globalName of globalNames) {
						for (const memberName of [...memberNames, 0]) {
							if (
								actual(globalName, memberName) !==
								expected(globalName, memberName)
							) {
								mismatches.push(
									`${label} ${name}(${globalName}, ${memberName})`
								);
							}
						}
					}
				}
				expect(mismatches).toEqual([]);
			}
		}
	});

	it("should find pure builtin calls as terser's native-objects.js does", async () => {
		const helpers =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "helpers")
			);
		const modules = await loadTerserSources(importTerserSource);
		const reference = modules.nativeObjects;
		helpers.install(modules);
		const own = modules.nativeObjects;
		const toplevel = modules.parse.parse(
			[
				"var x = 3, list = [1];",
				"Array(1); new Array(1); new Array(-1); new Array(1, 2); new Array(x);",
				"new Set; new Set([]); new Set(x); new WeakMap([]); new Map(list);",
				"new Float32Array(3); new Int8Array([]); new Uint8Array(-1);",
				"new ArrayBuffer(x); BigInt(1); new BigInt(1); new AggregateError;",
				"Math.abs(1); Math.nope(); String.fromCodePoint(1); Object.keys(x);",
				"globalThis.Math.max(); globalThis.Map(); globalThis.String(1);",
				"globalThis.a.b.c(); foo(); x(); x.y(); (0, Math.abs)(1); new Promise;",
				"RegExp.escape(''); Error.isError(x); Array.of(1); a.Math.abs();"
			].join("\n")
		);
		toplevel.figure_out_scope({});
		/** @type {import("../../lib/javascript/syntax-printer").Node[]} */
		const calls = [];
		modules.ast.walk(
			toplevel,
			(/** @type {import("../../lib/javascript/syntax-printer").Node} */ node) => {
				if (node instanceof modules.ast.AST_Call) calls.push(node);
			}
		);
		expect(calls.length).toBeGreaterThan(30);
		for (const unsafe of [true, false]) {
			for (const ecma of [5, 2015, 2020, 2021, 2022, 2025, 2026]) {
				const compressor = new modules.compress.Compressor(
					{ unsafe, builtins_ecma: ecma },
					{}
				);
				/** @type {boolean[]} */
				const expected = calls.map((call) =>
					reference.is_pure_builtin_call(compressor, call)
				);
				for (const name of [
					"pure_access_globals",
					"is_pure_native_fn",
					"is_pure_native_method",
					"is_pure_native_static_fn",
					"is_pure_native_static_property"
				]) {
					compressor[name] = own[name](compressor);
				}
				expect(
					calls.map((call) => own.is_pure_builtin_call(compressor, call))
				).toEqual(expected);
				expect(expected).toContain(true);
			}
		}
	});

	it("should count a node's size inside a size being counted", async () => {
		const { parse } = (await load()).modules;
		const toplevel = parse.parse("var a = 1; function b(c) { return c + a; }");
		const [, declaration] = toplevel.body;
		const inner = declaration.size();
		const original = declaration._size;
		let nested = 0;
		declaration._size = function (/** @type {EXPECTED_ANY} */ info) {
			nested = declaration.body[0].size();
			return original.call(this, info);
		};
		expect(toplevel.size()).toBeGreaterThan(inner);
		expect(nested).toBe(declaration.body[0].size());
	});

	it("should size and compare every node as terser does", async () => {
		const {
			minify,
			modules: { ast }
		} = await load();
		const reference = terserReference();
		// A compressed tree holds the nodes only the compressor makes, as `NaN`.
		/** @type {[string, EXPECTED_OBJECT][]} */
		const sources = [
			[SIZED_SCRIPT, { compress: false }],
			[SIZED_MODULE, { compress: false, module: true }],
			["sink(NaN, void 0, 1 / 0, a + +b, a - -b);", { compress: {} }]
		];
		for (const [source, options] of sources) {
			/**
			 * @returns {EXPECTED_ANY} the options, asking for the tree
			 */
			const settings = () => ({
				...options,
				parse: /** @type {EXPECTED_ANY} */ (options).parse,
				mangle: false,
				format: { ast: true, code: false }
			});
			const { ast: ourTree } = /** @type {EXPECTED_ANY} */ (
				await minify(source, settings())
			);
			/** @type {EXPECTED_ANY[]} */
			const ours = [];
			ourTree.walk(
				new ast.TreeWalker((/** @type {EXPECTED_ANY} */ node) => {
					ours.push(node);
				})
			);
			// terser's published build hands out its own tree, sized and compared
			// by terser's own methods.
			const { ast: tree } = /** @type {EXPECTED_ANY} */ (
				await reference.minify(source, settings())
			);
			/** @type {EXPECTED_ANY[]} */
			const theirs = [];
			tree.walk({
				/**
				 * @param {EXPECTED_ANY} node a node of terser's tree
				 * @param {EXPECTED_FUNCTION=} descend walks its children
				 */
				_visit(node, descend) {
					// terser's parser leaves some accessors' `async` and `is_generator`
					// unset where webpack's writes false, which `equivalent_to` reads.
					if (node.TYPE === "Accessor" && node.async === undefined) {
						node.async = false;
						node.is_generator = false;
					}
					theirs.push(node);
					if (descend) descend.call(node);
				}
			});
			expect(ours.map((node) => [node.TYPE, node.size()])).toEqual(
				theirs.map((node) => [node.TYPE, node.size()])
			);
			for (let i = 0; i < ours.length; i++) {
				for (let j = 0; j < ours.length; j++) {
					if (ours[i].TYPE !== ours[j].TYPE) continue;
					expect([i, j, ours[i].equivalent_to(ours[j])]).toEqual([
						i,
						j,
						theirs[i].equivalent_to(theirs[j])
					]);
				}
			}
		}
	});

	it("should mangle names and properties as terser does under every option", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/** @type {[string, () => EXPECTED_OBJECT][]} */
		const variants = [
			[MANGLED_PROPERTIES, () => ({ mangle: { properties: true } })],
			[
				MANGLED_PROPERTIES,
				() => ({ mangle: { properties: { keep_quoted: true } } })
			],
			[
				MANGLED_PROPERTIES,
				() => ({ mangle: { properties: { keep_quoted: "strict" } } })
			],
			[MANGLED_PROPERTIES, () => ({ mangle: { properties: { debug: true } } })],
			[
				MANGLED_PROPERTIES,
				() => ({ mangle: { properties: { debug: "suffix" } } })
			],
			[
				MANGLED_PROPERTIES,
				() => ({
					mangle: {
						properties: { regex: "^(alpha|beta)$", reserved: ["gamma"] }
					}
				})
			],
			[
				MANGLED_PROPERTIES,
				() => ({
					mangle: { properties: { undeclared: true, builtins: true } }
				})
			],
			[
				MANGLED_PROPERTIES,
				() => ({ compress: false, mangle: { properties: true } })
			],
			[
				MANGLED_PROPERTIES,
				() => ({
					mangle: { properties: { only_cache: true } },
					nameCache: { props: { props: { $alpha: "Q" } } }
				})
			],
			[
				MANGLED_NAMES,
				() => ({ compress: false, mangle: { keep_fnames: true } })
			],
			[
				MANGLED_NAMES,
				() => ({ compress: false, mangle: { keep_fnames: /^kept/ } })
			],
			[MANGLED_NAMES, () => ({ compress: false, mangle: { safari10: true } })],
			[MANGLED_NAMES, () => ({ compress: false, mangle: { ie8: true } })],
			[
				MANGLED_NAMES,
				() => ({ compress: { passes: 2, inline: 3 }, mangle: true })
			],
			[
				MANGLED_MODULE,
				() => ({ module: true, mangle: { toplevel: true }, nameCache: {} })
			],
			[
				MANGLED_MODULE,
				() => ({
					module: true,
					compress: false,
					mangle: { keep_fnames: true, toplevel: true },
					nameCache: { vars: { props: { $hidden: "z" } } }
				})
			]
		];
		for (const [source, options] of variants) {
			const ourOptions = /** @type {EXPECTED_ANY} */ (options());
			const theirOptions = /** @type {EXPECTED_ANY} */ (options());
			const ours = await minify(source, ourOptions);
			const theirs = await reference.minify(source, theirOptions);
			expect([ourOptions.mangle, ours.code]).toEqual([
				theirOptions.mangle,
				theirs.code
			]);
			expect(ourOptions.nameCache).toEqual(theirOptions.nameCache);
		}
	});

	it("should compare trees as terser does", async () => {
		const { parse } = (await load()).modules;
		const [first, second, third, fourth] = parse.parse(
			"a.b(c + 1); a.b(c + 1); a.b(c + 2); a.b(c, 1);"
		).body;
		expect(first.equivalent_to(second)).toBe(true);
		expect(first.equivalent_to(third)).toBe(false);
		expect(first.equivalent_to(fourth)).toBe(false);
		const original = first.body.shallow_cmp;
		first.body.shallow_cmp = function (/** @type {EXPECTED_ANY} */ other) {
			expect(third.equivalent_to(fourth)).toBe(false);
			return original.call(this, other);
		};
		expect(first.equivalent_to(second)).toBe(true);
	});

	it("should refuse an option terser refuses", async () => {
		const { minify } = await load();
		const options = /** @type {EXPECTED_ANY} */ ({ unknown: true });
		const reference = await terserReference()
			.minify("a;", options)
			.then(
				() => "",
				(/** @type {Error} */ err) => `${err.name}: ${err.message}`
			);
		await expect(minify("a;", options)).rejects.toThrow(
			reference.replace(/^DefaultsError: /, "")
		);
		expect(reference).toMatch(/^DefaultsError: /);
	});

	it("should write the source map terser writes", async () => {
		const { minify } = await load();
		const terser = terserReference();
		const input = await terser.minify(
			{ "in.js": "function add(a, b) {\n  return a + b;\n}\nconsole.log(add(1, 2));\n" },
			{ sourceMap: { includeSources: true } }
		);
		const source = "var one = 1;\nfunction two(x) { return x * 2; }\nconsole.log(two(one));\n";
		/** @type {[Record<string, string>, import("terser").SourceMapOptions][]} */
		const cases = [
			[{ "a.js": source }, {}],
			[{ "a.js": source }, { includeSources: true, filename: "a.min.js", root: "/r" }],
			[{ "b.js": /** @type {string} */ (input.code) }, { content: /** @type {string} */ (input.map), includeSources: true }],
			[{ "b.js": /** @type {string} */ (input.code) }, { content: /** @type {string} */ (input.map) }],
			[{ "b.js": /** @type {string} */ (input.code) }, { content: JSON.parse(/** @type {string} */ (input.map)), asObject: true }]
		];
		for (const [files, sourceMap] of cases) {
			const ours = await minify(files, { sourceMap: { ...sourceMap } });
			const reference = await terser.minify(files, { sourceMap: { ...sourceMap } });
			expect(ours.code).toBe(reference.code);
			expect(ours.map).toStrictEqual(reference.map);
		}
	});

	// cspell:disable -- VLQ-encoded source-map mappings strings below
	it("should map through an input map as terser reads it, index maps and decoded mappings included", async () => {
		const { minify } = await load();
		const terser = terserReference();
		const source = "var one = 1;\nfunction two(x) { return x * 2; }\nconsole.log(two(one));\n";
		/** @type {(string | Record<string, EXPECTED_ANY>)[]} */
		const inputs = [
			{
				version: 3,
				sections: [
					{ offset: { line: 0, column: 0 }, map: { version: 3, sources: ["./a/../one.js"], sourcesContent: ["one"], names: ["n"], mappings: "AAAAA,EAAC;AACA" } },
					{
						offset: { line: 1, column: 4 },
						map: {
							version: 3,
							sections: [
								{ offset: { line: 0, column: 2 }, map: JSON.stringify({ version: 3, sourceRoot: "root", sources: ["two.js", null], names: [], mappings: "AAAA,CACA;ACAA,BAAA" }) },
								{ offset: { line: 1, column: 0 }, map: { version: 3, sources: ["three.js"], names: [], mappings: "AAAA" } }
							]
						}
					},
					{ offset: { line: 2, column: 0 }, map: { version: 3, sources: ["four.js"], names: [], mappings: ";AAAA" } }
				]
			},
			{ version: 3, sources: ["one.js"], names: ["x"], mappings: [[[8, 0, 0, 0, 0], [0, 0, 1, 1]], [], [[3, 0, 2, 2], [0]]] },
			JSON.stringify({ version: 3, sources: ["one.js"], names: [], mappings: [[[8, 0, 0, 0], [0, 0, 1, 1]]] }),
			{ version: 3, sources: ["one.js"], names: [], mappings: "IAAA,AACC;;GAAE,A" },
			{ version: 3, sources: ["one.js"], names: [], mappings: "!A" }
		];
		for (const content of inputs) {
			for (const compress of [false, undefined]) {
				const options = () => ({ compress, mangle: false, sourceMap: { content: JSON.parse(JSON.stringify(content)), includeSources: true } });
				const ours = await minify({ "in.js": source }, options());
				const reference = await terser.minify({ "in.js": source }, options());
				expect(ours.map).toBe(reference.map);
			}
		}
		const invalid = { version: 3, sources: [] };
		/**
		 * @param {(code: Record<string, string>, options: import("terser").MinifyOptions) => Promise<EXPECTED_ANY>} run a minify
		 * @returns {Promise<string>} the message it rejects with
		 */
		const rejection = (run) =>
			run({ "in.js": source }, { sourceMap: { content: /** @type {EXPECTED_ANY} */ (invalid) } }).then(
				() => "",
				(error) => error.message
			);
		const message = await rejection(minify);
		expect(message).toMatch(/^invalid source map: /);
		expect(message).toBe(await rejection(terser.minify));
	});
	// cspell:enable

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
	});

	it("should name each node the ESTree type terser converts it to", async () => {
		const { ast, parse } = (await load()).modules;
		markEstreeTypes({ ast });
		const source = `"use strict";
			import a, { b as c, "d" as e } from "f"; import * as g from "h";
			export default class extends a { static #p = 1; static { g(); } get [c]() { return #p in this; } set s(v) {} m() {} q = 2; #r() {} }
			export { a as default2, e as "q r" }; export * from "i"; export * as j from "k";
			export const l = 1, { m, ...n } = o, [p = 1, ...q] = r;
			export function* s(t, u = 1, ...v) { yield t; yield* u; }
			label: for (let w = 0; w < 1; w++) { if (w) continue label; else break; }
			for (const x in y) ; for (const z of y) ; do ; while (0); while (0) ;
			switch (a) { case 1: debugger; default: }
			try { throw a } catch ({ e }) {} finally {}
			(async () => { await a; for await (const b of c); })();
			new a(...b)?.c?.[d]?.(e); a = b ? c : d; a += typeof b; a++; --a; !a;
			a = { b, c: 1, [d]: 2, get e() {}, set e(f) {}, g() {}, async *h() {}, ...i };
			a = [, b, ...c]; a = \`x\${b}y\`; a = tag\`z\`; a = /re/g; a = 1n; a = null;
			a = true; a = void 0; a = NaN; a = Infinity; a = (b, c); a = b ?? (c && d || e);
			a = import.meta; a = import("x"); function f() { new.target; return this; }`;
		let count = 0;
		const walker = new ast.TreeWalker((/** @type {EXPECTED_ANY} */ node) => {
			const parent = walker.parent();
			let expected;
			if (
				(node.TYPE === "ObjectGetter" || node.TYPE === "ObjectSetter") &&
				parent.TYPE !== "Object"
			) {
				// terser maps a class's members with the index as their parent, which
				// reads a class accessor as an object's; ESTree makes it a method.
				expected = { type: "MethodDefinition" };
			} else if (node.TYPE === "Expansion") {
				// terser's converter reads this off its own stack, and makes a rest
				// parameter a spread; ESTree binds with a rest element in both.
				expected = {
					type:
						parent.TYPE === "Destructuring" || parent instanceof ast.LambdaNode
							? "RestElement"
							: "SpreadElement"
				};
			} else if (typeof node.to_mozilla_ast === "function") {
				expected = node.to_mozilla_ast(parent);
			} else if (node.TYPE === "TemplateSegment") {
				expected = parent.to_mozilla_ast().quasi || parent.to_mozilla_ast();
				expected = { type: expected.quasis[0].type };
			} else {
				// A name mapping is converted with its declaration, as a specifier.
				const list = parent.imported_names || parent.exported_names;
				const converted = parent.to_mozilla_ast();
				// `export * as a` names what it exports on the declaration itself.
				expected =
					converted.specifiers === undefined
						? null
						: converted.specifiers.filter(
								(/** @type {{ type: string }} */ specifier) =>
									specifier.type !== "ImportDefaultSpecifier"
							)[list.indexOf(node)];
			}
			expect([node.TYPE, estreeType(node, parent)]).toEqual([
				node.TYPE,
				expected === null ? null : expected.type
			]);
			count++;
		});
		parse.parse(source, { module: true }).walk(walker);
		parse.parse("with (a) b;").walk(walker);
		expect(count).toBeGreaterThan(300);
	});

	it("should hand back a fresh list, which a clone may share", async () => {
		const { ast, parse, utils } = (await load()).modules;
		const { SimpleStatementNode, TreeTransformer } = ast;
		const toplevel = parse.parse("a; b; c; d;");
		const { body } = toplevel;
		toplevel.transform(new TreeTransformer(() => undefined));
		// terser's shallow clone shares lists, so each transform must copy them.
		expect(toplevel.body).not.toBe(body);
		expect(toplevel.body).toEqual(body);

		toplevel.transform(
			new TreeTransformer(
				/**
				 * @param {EXPECTED_ANY} node the node visited
				 * @returns {EXPECTED_ANY} what replaces it
				 */
				(node) => {
					if (!(node instanceof SimpleStatementNode)) return;
					const name = node.body.name;
					if (name === "b") return utils.MAP.skip;
					if (name === "c") return utils.MAP.splice([node, node]);
					return node;
				}
			)
		);
		expect(toplevel.body).not.toBe(body);
		expect(
			toplevel.body.map(
				(/** @type {EXPECTED_ANY} */ statement) => statement.body.name
			)
		).toEqual(["a", "c", "c", "d"]);
	});

	it("should not revisit a node the compressor squeezed", async () => {
		const { ast, compress, flags, parse } = (await load()).modules;
		const compressor = new compress.Compressor({}, {});
		const toplevel = parse.parse('"use strict"; a;');
		const [directive, statement] = toplevel.body;
		directive.flags |= flags.SQUEEZED;
		statement.flags |= flags.SQUEEZED;
		expect(statement.transform(compressor)).toBe(statement);
		expect(compressor.stack).toEqual([]);
		// A directive is still pushed, which records it on the walker.
		expect(directive.transform(compressor)).toBe(directive);
		expect(compressor.has_directive("use strict")).toBe(directive);
		expect(ast.TreeWalker.prototype.webpackSkipsSqueezed).toBe(false);
	});

	describe("correct phase", () => {
		it("should install", async () => {
			const { phases } = await load();
			expect(phases).toContain("correct");
		});

		for (const [name, input, options] of CORRECTED_CASES) {
			it(`should print what the input prints: ${name}`, async () => {
				const { minify, corrections } = await load();
				const expected = runProgram(input);
				const { code } = await minify(input, options);
				expect(runProgram(/** @type {string} */ (code))).toBe(expected);

				if (!corrections) throw new Error("the correct phase is not installed");
				corrections.enabled = false;
				try {
					const uncorrected = await minify(input, options);
					const reference = await terserReference().minify(input, options);
					expect(uncorrected.code).toBe(reference.code);
					expect(runProgram(/** @type {string} */ (reference.code))).not.toBe(expected);
				} finally {
					corrections.enabled = true;
				}
			});
		}
	});

	describe("improve phase", () => {
		it("should install", async () => {
			const { phases } = await load();
			expect(phases).toContain("improve");
		});

		for (const [name, input, options] of IMPROVED_CASES) {
			it(`should write less, printing the same: ${name}`, async () => {
				const { minify, improvements } = await load();
				const expected = runProgram(input);
				const { code } = await minify(input, options);
				expect(runProgram(/** @type {string} */ (code))).toBe(expected);

				if (!improvements) throw new Error("the improve phase is not installed");
				improvements.enabled = false;
				try {
					const unimproved = await minify(input, options);
					const reference = await terserReference().minify(input, options);
					expect(unimproved.code).toBe(reference.code);
					expect(/** @type {string} */ (code).length).toBeLessThan(
						/** @type {string} */ (unimproved.code).length
					);
				} finally {
					improvements.enabled = true;
				}
			});
		}

		for (const [name, input] of KEPT_CASES) {
			it(`should write what terser writes: ${name}`, async () => {
				const { minify } = await load();
				const options = { compress: {}, mangle: false };
				const { code } = await minify(input, options);
				const reference = await terserReference().minify(input, options);
				expect(code).toBe(reference.code);
			});
		}

		it("should leave the program's value alone under `expression`", async () => {
			const { minify } = await load();
			const input = `!function () { ${TRY} console.log(2); }();`;
			const options = { compress: { expression: true }, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});

		it("should leave the calls alone without `inline`", async () => {
			const { minify } = await load();
			const input = `!function () { ${TRY} console.log(2); }();`;
			const options = { compress: { inline: false }, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});
	});

	describe("printEstree", () => {
		/**
		 * Runs a minify with the `correct` and `improve` phases off, so that it
		 * writes what terser writes.
		 * @template T
		 * @param {() => Promise<T>} run the minify
		 * @returns {Promise<T>} its result
		 */
		const writingAsTerser = async (run) => {
			const { corrections, improvements } = await load();
			if (!corrections || !improvements) {
				throw new Error("the correct and improve phases are not installed");
			}
			corrections.enabled = false;
			improvements.enabled = false;
			try {
				return await run();
			} finally {
				corrections.enabled = true;
				improvements.enabled = true;
			}
		};

		/**
		 * terser's result, or what it throws where it refuses what webpack reads.
		 * @param {() => Promise<EXPECTED_ANY>} run terser's minify
		 * @returns {Promise<EXPECTED_ANY>} its result, or `{ refused }` with the error's message
		 */
		const terserResult = async (run) => {
			try {
				return await run();
			} catch (err) {
				return { refused: /** @type {Error} */ (err).message };
			}
		};

		/**
		 * @param {EXPECTED_ANY} format format options
		 * @returns {EXPECTED_ANY} the same without the layout the printer ignores, for terser
		 */
		const withoutLayout = (format) => {
			const result = { ...format };
			for (const name of IGNORED_FORMAT_OPTIONS) delete result[name];
			return result;
		};

		/**
		 * Each expression statement in a source's tree, and its expression, as
		 * `printToString` prints it and as terser's own printer does in its tree.
		 * Where the trees differ, as where terser refuses the source, it lists all.
		 * @param {string} source a source
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<{ compared: number, differences: string[] }>} how many printed, and every one printed otherwise
		 */
		const compareExpressions = async (source, options) => {
			const { minify, modules } = await load();
			const terser = await loadTerserSources(importTerserSource);
			const withTree = () => ({
				...JSON.parse(JSON.stringify(options)),
				format: { ast: true, code: false }
			});
			// terser's typings leave out `format.ast`, which returns the tree.
			const ours = /** @type {EXPECTED_ANY} */ (
				await writingAsTerser(() => minify(source, withTree()))
			);
			const theirs = await terserResult(() => terser.minify(source, withTree()));
			/**
			 * @param {EXPECTED_ANY} tree a toplevel
			 * @param {(tree: EXPECTED_ANY, visit: (node: EXPECTED_ANY) => void) => void} walk the walk of its tree's classes
			 * @returns {EXPECTED_ANY[]} its expression statements, each followed by its expression
			 */
			const collect = (tree, walk) => {
				/** @type {EXPECTED_ANY[]} */
				const expressions = [];
				walk(tree, (node) => {
					if (node.TYPE === "SimpleStatement") expressions.push(node, node.body);
				});
				return expressions;
			};
			const ourExpressions = collect(ours.ast, modules.ast.walk);
			const theirExpressions =
				theirs.refused === undefined ? collect(theirs.ast, terser.ast.walk) : [];
			let compared = 0;
			/** @type {string[]} */
			const differences = [];
			const paired = ourExpressions.length === theirExpressions.length;
			if (!paired) {
				differences.push(
					`terser reads ${theirExpressions.length} where webpack reads ${ourExpressions.length}${theirs.refused === undefined ? "" : `: ${theirs.refused}`}`
				);
			}
			for (const format of paired ? ESTREE_PRINT_FORMATS : []) {
				const given = { ...format, comments: false };
				for (const [i, expression] of ourExpressions.entries()) {
					const expected = theirExpressions[i].print_to_string(
						withoutLayout(given)
					);
					const printed = modules.printToString(expression, given);
					compared++;
					if (printed !== expected) {
						differences.push(
							`${JSON.stringify(format)}: ${expected} printed ${printed}`
						);
					}
				}
			}
			return { compared, differences };
		};

		const scripts = [...TABLE_SOURCES, ...ESTREE_PRINT_CASES];
		const optionSets = [
			{ compress: false, mangle: false },
			{ compress: { passes: 2 }, mangle: true }
		];
		for (const source of [...scripts, ...ESTREE_PRINT_MODULE_CASES]) {
			it(`should print each expression as terser does: ${source.slice(0, 60)}`, async () => {
				const module = ESTREE_PRINT_MODULE_CASES.includes(source);
				let compared = 0;
				/** @type {string[]} */
				const differences = [];
				for (const options of optionSets) {
					let result;
					try {
						result = await compareExpressions(source, { ...options, module });
					} catch (err) {
						// A table's source may be one only a module reads, or none.
						if (/** @type {Error} */ (err).name === "SyntaxError") continue;
						throw err;
					}
					differences.push(...result.differences);
					compared += result.compared;
				}
				if (ESTREE_PRINT_CASES.includes(source) || module) {
					expect(compared).toBeGreaterThan(0);
				}
				// Where webpack reads a source otherwise than terser, its own output.
				expect(differences).toMatchSnapshot();
			});
		}

		it("should refuse a node it cannot print yet", async () => {
			const { modules } = await load();
			const output = modules.output.OutputStream({});
			expect(() =>
				modules.printEstree(
					{ type: "Unknown", startToken: null, endToken: null },
					output
				)
			).toThrow("printEstree cannot print a Unknown node yet");
		});

		/**
		 * A source minified by `minify` and by terser, under each format.
		 * @param {string} source a source
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<string[]>} every format printed otherwise
		 */
		const compareProgram = async (source, options) => {
			const { minify } = await load();
			/** @type {string[]} */
			const differences = [];
			for (const format of ESTREE_PRINT_PROGRAM_FORMATS) {
				const given = () => ({
					...JSON.parse(JSON.stringify(options)),
					format: { ...format, comments: false }
				});
				const ours = await writingAsTerser(() => minify(source, given()));
				const theirs = await terserResult(() =>
					terserReference().minify(source, {
						...given(),
						format: withoutLayout({ ...format, comments: false })
					})
				);
				if (ours.code !== theirs.code) {
					differences.push(
						`${JSON.stringify(format)}: ${theirs.refused || theirs.code} printed ${ours.code}`
					);
				}
			}
			return differences;
		};

		const programOptionSets = [
			{ compress: false, mangle: false },
			{ compress: false, mangle: true },
			{ compress: { passes: 2 }, mangle: true },
			{ compress: { passes: 2 }, mangle: { toplevel: true }, toplevel: true }
		];
		const programSources = [
			...TABLE_SOURCES,
			...ESTREE_PRINT_CASES,
			...ESTREE_PRINT_STATEMENT_CASES
		];
		for (const source of [
			...programSources,
			...ESTREE_PRINT_MODULE_CASES,
			...ESTREE_PRINT_MODULE_STATEMENT_CASES
		]) {
			it(`should print the whole program as terser does: ${source.slice(0, 60)}`, async () => {
				let compared = 0;
				/** @type {string[]} */
				const differences = [];
				for (const module of [false, true]) {
					for (const options of programOptionSets) {
						try {
							differences.push(
								...(await compareProgram(source, { ...options, module }))
							);
						} catch (err) {
							// A source may be one only a script, or only a module, reads.
							if (/** @type {Error} */ (err).name === "SyntaxError") continue;
							throw err;
						}
						compared++;
					}
				}
				expect(compared).toBeGreaterThan(0);
				// Where webpack reads a source otherwise than terser, its own output.
				expect(differences).toMatchSnapshot();
			});
		}

		it("should parenthesize a value with comments before it, as terser does", async () => {
			const { modules } = await load();
			const output = modules.output.OutputStream({});
			const argument = {
				type: "Identifier",
				name: "a",
				startToken: { comments_before: [{ type: "comment2", value: "x" }] },
				endToken: null
			};
			modules.printEstree(
				{ type: "ReturnStatement", argument, startToken: null, endToken: null },
				output
			);
			expect(output.get()).toBe("return(a)");
		});

		it("should brace a statement's body where it must be", async () => {
			const { modules } = await load();
			const output = modules.output.OutputStream({});
			const identifier = (/** @type {string} */ name) => ({
				type: "Identifier",
				name,
				startToken: null,
				endToken: null
			});
			modules.printEstree(
				{
					type: "IfStatement",
					test: identifier("a"),
					consequent: {
						type: "VariableDeclaration",
						kind: "let",
						declarations: [
							{
								type: "VariableDeclarator",
								id: identifier("b"),
								init: null,
								startToken: null,
								endToken: null
							}
						],
						startToken: null,
						endToken: null
					},
					alternate: {
						type: "ClassDeclaration",
						id: identifier("C"),
						superClass: null,
						body: { type: "ClassBody", body: [], startToken: null, endToken: null },
						startToken: null,
						endToken: null
					},
					startToken: null,
					endToken: null
				},
				output
			);
			expect(output.get()).toBe("if(a){let b}else{class C{}}");
			// What only the compressor leaves: an `if` with no `else` before one.
			const nested = modules.output.OutputStream({});
			modules.printEstree(
				{
					type: "IfStatement",
					test: identifier("a"),
					consequent: {
						type: "IfStatement",
						test: identifier("b"),
						consequent: {
							type: "ExpressionStatement",
							expression: identifier("c"),
							startToken: null,
							endToken: null
						},
						alternate: null,
						startToken: null,
						endToken: null
					},
					alternate: { type: "EmptyStatement", startToken: null, endToken: null },
					startToken: null,
					endToken: null
				},
				nested
			);
			expect(nested.get()).toBe("if(a){if(b)c}else;");
		});

		it("should drop a printed function's body under `_destroy_ast`", async () => {
			const { minify, modules } = await load();
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await minify("function f(a) { a(); } x = (b) => { b(); }; y = (c) => c;", {
					compress: false,
					mangle: false,
					format: { ast: true, code: false }
				})
			);
			const tree = modules.toPrintTree(ast);
			const output = modules.output.OutputStream({ _destroy_ast: true });
			modules.printEstree(tree, output);
			expect(output.get()).toBe("function f(a){a()}x=b=>{b()};y=c=>c;");
			const [declaration, arrow] = tree.body;
			expect(declaration.body.body).toEqual([]);
			expect(declaration.params).toEqual([]);
			expect(arrow.expression.right.body.body).toEqual([]);
		});

		/**
		 * @param {EXPECTED_ANY} options minify options
		 * @returns {EXPECTED_ANY} a copy `minify` may write into, as it does a source map's
		 */
		const copyOptions = (options) => ({
			...options,
			format: { ...options.format },
			...(options.sourceMap ? { sourceMap: { ...options.sourceMap } } : {})
		});

		/**
		 * A source minified by terser, or what it throws, and by `minify`, writing
		 * as terser.
		 * @param {string | Record<string, string>} source a source, or files
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<{ theirs: EXPECTED_ANY, ours: EXPECTED_ANY }>} both results
		 */
		const minifyBothWays = async (source, options) => {
			const { minify } = await load();
			const referenceOptions = copyOptions(options);
			referenceOptions.format = withoutLayout(referenceOptions.format);
			const theirs = await terserResult(() =>
				terserReference().minify(source, referenceOptions)
			);
			const ours = await writingAsTerser(() =>
				minify(source, copyOptions(options))
			);
			return { theirs, ours };
		};

		/**
		 * @param {string} source a source
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<{ theirs: EXPECTED_ANY, ours: EXPECTED_ANY } | undefined>} both results, as a script or else a module, or none when neither parses
		 */
		const minifyScriptOrModule = async (source, options) => {
			for (const module of [false, true]) {
				try {
					return await minifyBothWays(source, { ...options, module });
				} catch (err) {
					if (/** @type {Error} */ (err).name !== "SyntaxError") throw err;
				}
			}
			return undefined;
		};

		// The comment options, past the table's: the default minimizer's callback,
		// annotations alone, and every kind compressed and mangled.
		/** @type {EXPECTED_ANY[]} */
		const commentOptionSets = [
			...OUTPUT_OPTIONS,
			{
				compress: { passes: 2 },
				mangle: true,
				format: {
					beautify: false,
					comments: (
						/** @type {unknown} */ node,
						/** @type {{ type: string, value: string }} */ comment
					) =>
						(comment.type === "comment2" || comment.type === "comment1") &&
						/@preserve|@lic|@cc_on|^\**!/i.test(comment.value)
				}
			},
			{
				compress: { passes: 2 },
				mangle: true,
				format: { preserve_annotations: true }
			},
			{
				compress: false,
				mangle: false,
				format: { comments: false, preserve_annotations: true }
			},
			{ compress: { passes: 2 }, mangle: true, format: { comments: "all" } },
			{ compress: {}, mangle: true, format: { comments: /kept|@lic/ } },
			{
				compress: false,
				mangle: false,
				format: { comments: "all", preamble: "/*! p */", semicolons: false }
			}
		];

		for (const source of [
			...programSources,
			...ESTREE_PRINT_MODULE_CASES,
			...ESTREE_PRINT_MODULE_STATEMENT_CASES,
			...ESTREE_PRINT_COMMENT_CASES
		]) {
			it(`should print the comments terser does: ${source.slice(0, 60)}`, async () => {
				let compared = 0;
				/** @type {string[]} */
				const differences = [];
				for (const [index, options] of commentOptionSets.entries()) {
					const result = await minifyScriptOrModule(source, options);
					if (result === undefined) continue;
					const { ours, theirs } = result;
					if (ours.code !== theirs.code) {
						differences.push(
							`set ${index}: ${theirs.refused || theirs.code} printed ${ours.code}`
						);
					}
					compared++;
				}
				expect(compared).toBeGreaterThan(0);
				// Where webpack reads a source otherwise than terser, its own output.
				expect(differences).toMatchSnapshot();
			});
		}

		/**
		 * The source map option sets, over a source and its printed form with that
		 * form's map, read as an object and inline.
		 * @param {string} source a source
		 * @param {{ code: string, map: EXPECTED_OBJECT }} printed the source minified with a map
		 * @returns {[string | Record<string, string>, EXPECTED_ANY][]} each input with its options
		 */
		const mapOptionSets = (source, printed) => [
			[
				{ "input.js": source },
				{ compress: false, mangle: false, sourceMap: { asObject: true } }
			],
			[
				{ "input.js": source },
				{
					compress: { passes: 2 },
					mangle: true,
					sourceMap: {
						includeSources: true,
						filename: "out.js",
						root: "src/",
						url: "inline"
					},
					format: { comments: "all" }
				}
			],
			[
				{ "input.js": source },
				{
					compress: false,
					mangle: false,
					sourceMap: { asObject: true },
					format: { comments: "some", preserve_annotations: true }
				}
			],
			[
				printed.code,
				{
					compress: false,
					mangle: true,
					sourceMap: { asObject: true, content: printed.map }
				}
			],
			[
				`${printed.code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
					JSON.stringify(printed.map)
				).toString("base64")}`,
				{
					compress: {},
					mangle: true,
					sourceMap: { content: "inline", includeSources: true }
				}
			]
		];

		for (const source of [
			...programSources,
			...ESTREE_PRINT_MODULE_CASES,
			...ESTREE_PRINT_MODULE_STATEMENT_CASES,
			...ESTREE_PRINT_COMMENT_CASES
		]) {
			it(`should map as terser does: ${source.slice(0, 60)}`, async () => {
				const { minify } = await load();
				let compared = 0;
				/** @type {string[]} */
				const differences = [];
				for (const module of [false, true]) {
					let printed;
					try {
						printed = await minify(source, {
							module,
							compress: false,
							mangle: { toplevel: true },
							sourceMap: { asObject: true }
						});
					} catch (err) {
						// A source may be one only a script, or only a module, reads.
						if (/** @type {Error} */ (err).name === "SyntaxError") continue;
						throw err;
					}
					for (const [index, [input, options]] of mapOptionSets(
						source,
						/** @type {EXPECTED_ANY} */ (printed)
					).entries()) {
						const { theirs, ours } = await minifyBothWays(input, {
							...options,
							module
						});
						for (const key of ["code", "map", "decoded_map"]) {
							const expected = JSON.stringify(theirs.refused || theirs[key]);
							const actual = JSON.stringify(ours[key]);
							if (actual !== expected) {
								differences.push(
									`set ${index} ${key}: ${expected} printed ${actual}`
								);
							}
						}
						compared++;
					}
					break;
				}
				expect(compared).toBeGreaterThan(0);
				// Where webpack reads a source otherwise than terser, its own output.
				expect(differences).toMatchSnapshot();
			});
		}

		it("should call the comments callback with the ESTree node", async () => {
			/** @type {string[]} */
			const types = [];
			const { minify } = await load();
			const ours = await minify("/*a*/ x(); function f() { /*b*/ return /*c*/ y; }", {
				compress: false,
				mangle: false,
				format: {
					comments: (
						/** @type {{ type: string }} */ node,
						/** @type {{ value: string }} */ comment
					) => {
						types.push(`${comment.value}:${node.type}`);
						return true;
					}
				}
			});
			expect(ours.code).toBe("/*a*/x();function f(){/*b*/ /*c*/return y}");
			expect(types).toEqual([
				"a:Program",
				"b:ReturnStatement",
				"c:ReturnStatement"
			]);
		});

		// Each runtime user of the printer: the frequency mangling orders names
		// by, `correct`'s `__proto__`, and what the compressor prints to compare.
		/** @type {[string, string, EXPECTED_ANY][]} */
		const PRINTER_USER_CASES = [
			[
				"the frequency",
				"function f(longName,other){var o={a:longName,b:other.c};return o.a+o.b+longName}f(1,{c:2});label:for(;;)break label;",
				{ compress: false, mangle: true }
			],
			[
				"private names",
				"class K{#secret=1;#m(){return this.#secret}static has(o){return #secret in o}run(){return this.#m()}}new K().run()",
				{ compress: false, mangle: true }
			],
			[
				"properties",
				'var o={alpha:1,beta:2,"gamma":3};o.alpha+o.beta+o.gamma+o["beta"]+o[x?"delta":"eps"]+o[(x,"zeta")];class Q{#pv;m(){return this.#pv}}',
				{ compress: false, mangle: { properties: { keep_quoted: true } } }
			],
			[
				"`__proto__`",
				'var p={},a={__proto__:p},b={__proto__},c={"__proto__":p};function g(__proto__){return{__proto__:__proto__}}console.log(a,b,c,g(1))',
				{ compress: false, mangle: true }
			],
			[
				"`Function`",
				"var f=Function(\"a\",\"b\",\"'use strict';return a+b\");f(1,2)",
				{ compress: { unsafe_Function: true }, mangle: true }
			],
			[
				"a function as a string",
				'console.log(""+function(){return 1})',
				{ compress: { unsafe: true }, mangle: false }
			],
			[
				"`pure_funcs`",
				"console.log(1);Math.floor(2);a.b.c(3)",
				{ compress: { pure_funcs: ["console.log", "a.b.c"] }, mangle: false }
			],
			[
				"`Object.defineProperty`",
				'var o={};Object.defineProperty(o,"x",{value:1});console.log(o.x)',
				{ compress: { passes: 2, unsafe: true }, mangle: false }
			],
			[
				"`spidermonkey`",
				'"use strict";var r=/a+/gi,n=1e3,s="x",b=10n;',
				{ compress: false, mangle: false, format: { spidermonkey: true } }
			]
		];
		for (const [name, source, options] of PRINTER_USER_CASES) {
			it(`should print for ${name} as terser does`, async () => {
				const { theirs, ours } = await minifyBothWays(source, options);
				expect(ours.code).toBe(theirs.code);
				expect(JSON.stringify(ours.ast)).toBe(JSON.stringify(theirs.ast));
			});
		}

		it("should drop a given tree's function bodies as terser does", async () => {
			const { minify, modules } = await load();
			const terser = await loadTerserSources(importTerserSource);
			const source = "function f(a){return()=>a}var g=function(b){return b};f(g)";
			for (const mangle of [false, true]) {
				/** @type {number[][]} */
				const lengths = [];
				for (const [minifier, walk] of [
					[minify, modules.ast.walk],
					[terser.minify, terser.ast.walk]
				]) {
					const { ast } = /** @type {EXPECTED_ANY} */ (
						await minifier(source, {
							compress: false,
							mangle: false,
							format: { ast: true, code: false }
						})
					);
					const { code } = await minifier(ast, { compress: false, mangle });
					expect(code).toMatch(/^function f\(/);
					/** @type {number[]} */
					const sizes = [];
					walk(ast, (/** @type {EXPECTED_ANY} */ node) => {
						if (node.argnames) sizes.push(node.body.length);
					});
					lengths.push(sizes);
				}
				expect(lengths[0]).toEqual(lengths[1]);
				expect(lengths[0]).toEqual([0, 0]);
			}
		});
	});

	describe("toPrintTree", () => {
		/**
		 * @param {string} source a script
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<EXPECTED_ANY>} terser's tree of it
		 */
		const terserTree = async (source, options) => {
			const { minify } = await load();
			// terser's typings leave out `format.ast`, which returns the tree.
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await minify(source, {
					...options,
					format: { ast: true, code: false }
				})
			);
			return ast;
		};
		const sources = TABLE_SOURCES;

		for (const source of sources) {
			it(`should read terser's tree as webpack's parser reads the source: ${source.slice(0, 60)}`, async () => {
				const { modules } = await load();
				const { parse } = require("../../lib/javascript/syntax-parser");
				const tree = await terserTree(source, {
					compress: false,
					mangle: false
				});
				const parsed = parse(source, {
					ecmaVersion: "latest",
					sourceType: "script",
					allowHashBang: true,
					allowSuperOutsideMethod: true,
					allowImportExportEverywhere: true,
					importPhases: true
				});
				expect(comparableTree(modules.toPrintTree(tree))).toEqual(
					comparableTree(parsed)
				);
			});
		}

		it("should keep a number's and a bigint's source", async () => {
			const { modules } = await load();
			const tree = await terserTree("x = [1.0, 0x10, 1_000, .5, 12n, 0x1Fn];", {
				compress: false,
				mangle: false
			});
			const printTree = /** @type {EXPECTED_ANY} */ (modules.toPrintTree(tree));
			const elements = printTree.body[0].expression.right.elements;
			expect(
				elements.map((/** @type {EXPECTED_ANY} */ element) => element.raw)
			).toEqual(["1.0", "0x10", "1_000", ".5", "12n", "0x1Fn"]);
		});

		it("should carry the tokens, quotes, names and source-map names the printer reads", async () => {
			const { modules } = await load();
			const tree = await terserTree(
				"var v = { 'a': 1, b: 2, [c]: 3, \"d\"() {} }; class K { 'e' = 1; #f = 2; [g] = 3 } import h from 'i' with { type: 'json' };",
				{ compress: false, mangle: true }
			);
			const printTree = /** @type {EXPECTED_ANY} */ (modules.toPrintTree(tree));
			const declarator = printTree.body[0].declarations[0];
			// A name reads as terser's definition named it, and as written for the ESTree mangler.
			const definition = tree.body[0].definitions[0].name.definition();
			expect([declarator.id.name, declarator.id.definition]).toEqual([definition.mangled_name || definition.name, null]);
			const asWritten = /** @type {EXPECTED_ANY} */ (modules.toPrintTree(tree, undefined, undefined, false, true));
			expect(asWritten.body[0].declarations[0].id.name).toBe("v");
			expect(declarator.startToken).toBe(tree.body[0].definitions[0].start);
			const [a, b, c, d] = declarator.init.properties;
			expect([a.quote, a.key.quote, a.mapName]).toEqual(["'", "'", "a"]);
			expect([Boolean(b.quote), b.key.type, b.mapName]).toEqual([
				false,
				"Identifier",
				"b"
			]);
			expect([c.computed, c.mapName]).toEqual([true, "c"]);
			expect([d.method, d.key.quote, d.mapName]).toEqual([true, '"', false]);
			const [e, f, g] = printTree.body[1].body.body;
			expect([e.type, e.key.quote, e.mapName]).toEqual(["PropertyDefinition", "'", "e"]);
			expect([f.key.type, f.mapName]).toEqual(["PrivateIdentifier", f.key.name]);
			expect([g.computed, g.mapName]).toEqual([true, "g"]);
			const [attribute] = printTree.body[2].attributes;
			expect([attribute.key.name, attribute.value.quote]).toEqual(["type", "'"]);
		});

		it("should read the nodes only the compressor makes, and refuse one it does not know", async () => {
			const { modules } = await load();
			const { ast } = modules;
			expect(
				[new ast.NaNNode(), new ast.UndefinedNode(), new ast.InfinityNode()].map(
					(node) => /** @type {EXPECTED_ANY} */ (modules.toPrintTree(node)).name
				)
			).toEqual(["NaN", "undefined", "Infinity"]);
			expect(() => modules.toPrintTree(new ast.SyntaxNode())).toThrow(
				"toPrintTree cannot read a Node node"
			);
		});

		/**
		 * @param {EXPECTED_ANY} modules the minifier's modules
		 * @param {EXPECTED_ANY} tree terser's tree
		 * @returns {string[]} where a kind of `kindOf` and terser's class disagree
		 */
		const kindDisagreements = (modules, tree) => {
			/** @type {string[]} */
			const disagreements = [];
			modules.toPrintTree(
				tree,
				(/** @type {EXPECTED_ANY} */ node, /** @type {EXPECTED_ANY} */ printNode) => {
					if (printNode === null) return;
					for (const kind of Object.keys(modules.kindOf)) {
						// An Accessor, only ever a method's value, reads as a Function.
						if (kind === "Function" && node.TYPE === "Accessor") continue;
						// A try's blocks, never a statement of their own, read as statements.
						if (
							kind === "BlockStatement" &&
							(node.TYPE === "TryBlock" || node.TYPE === "Finally")
						) {
							continue;
						}
						const expected = node instanceof modules.ast[`${kind}Node`];
						if (modules.kindOf[kind](printNode) !== expected) {
							disagreements.push(`${node.TYPE} as ${printNode.type}: ${kind}`);
						}
					}
				}
			);
			return disagreements;
		};

		for (const source of sources) {
			it(`should read a compressed and mangled tree, its kinds as terser's: ${source.slice(0, 60)}`, async () => {
				const { modules } = await load();
				for (const tree of [
					await terserTree(source, { compress: false, mangle: false }),
					await terserTree(source, {
						compress: { passes: 2 },
						mangle: true,
						toplevel: true
					})
				]) {
					expect(kindDisagreements(modules, tree)).toEqual([]);
				}
			});
		}

		it("should bake mangled names into the identifiers", async () => {
			const { modules } = await load();
			const tree = await terserTree(MANGLED_NAMES, {
				compress: { passes: 2 },
				mangle: true
			});
			/** @type {[string, string][]} */
			const renamed = [];
			modules.toPrintTree(
				tree,
				(/** @type {EXPECTED_ANY} */ node, /** @type {EXPECTED_ANY} */ printNode) => {
					if (printNode !== null && printNode.type === "Identifier" && node.definition) {
						const definition = node.definition();
						if (definition && definition.mangled_name) {
							expect(printNode.name).toBe(definition.mangled_name);
							renamed.push([node.name, printNode.name]);
						}
					}
				}
			);
			expect(renamed).toContainEqual(["first", expect.any(String)]);
		});
	});

	describe("analyzeManglingScopes", () => {
		// The symbol classes terser declares with, as the analysis codes them.
		/** @type {Record<string, number>} */
		const DECLARING_KINDS = {
			SymbolVar: 1,
			SymbolFunarg: 2,
			SymbolLet: 3,
			SymbolConst: 4,
			SymbolUsing: 5,
			SymbolCatch: 6,
			SymbolImport: 7,
			SymbolDefun: 8,
			SymbolLambda: 9,
			SymbolClass: 10,
			SymbolDefClass: 11,
			SymbolRef: 12,
			SymbolExport: 12
		};

		/**
		 * @param {EXPECTED_ANY} error what was thrown, if anything
		 * @returns {string | undefined} its message and where it points
		 */
		const errorOf = (error) =>
			error &&
			`${error.message}${error.line === undefined ? "" : ` at ${error.line}:${error.col}:${error.pos}`}`;

		/**
		 * terser's scope analysis and webpack's, each over the same tree: where
		 * the two disagree, as the mangler would read them.
		 * @param {EXPECTED_ANY} modules the minifier's modules
		 * @param {EXPECTED_ANY} tree terser's tree
		 * @param {EXPECTED_ANY} options the mangle options
		 * @returns {string[]} the disagreements
		 */
		const scopeDifferences = (modules, tree, options) => {
			const { ast } = modules;
			/** @type {string[]} */
			const differences = [];
			/** @type {EXPECTED_ANY} */
			let theirError;
			/** @type {EXPECTED_ANY} */
			let ourError;
			try {
				tree.figure_out_scope(options);
			} catch (error) {
				theirError = error;
			}
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY[]>} */
			const pairs = new Map();
			const program = modules.toPrintTree(
				tree,
				(/** @type {EXPECTED_ANY} */ node, /** @type {EXPECTED_ANY} */ printNode) => {
					if (printNode === null) return;
					const known = pairs.get(node);
					if (known) known.push(printNode);
					else pairs.set(node, [printNode]);
				},
				undefined,
				false,
				true
			);
			/** @type {EXPECTED_ANY} */
			let analysis;
			try {
				analysis = modules.analyzeManglingScopes(program, options);
			} catch (error) {
				ourError = error;
			}
			if (theirError || ourError) {
				if (errorOf(theirError) !== errorOf(ourError)) {
					differences.push(`threw ${errorOf(theirError)}, ours ${errorOf(ourError)}`);
				}
				return differences;
			}
			/** @type {EXPECTED_ANY[]} */
			const theirScopes = [];
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY>} */
			const blockNodes = new Map();
			/** @type {{ label: EXPECTED_ANY, parent: EXPECTED_ANY }[]} */
			const theirLabels = [];
			/** @type {EXPECTED_ANY[]} */
			const labelStack = [];
			/** @type {Set<EXPECTED_ANY>} */
			const theirBlockDefunScopes = new Set();
			/** @type {EXPECTED_ANY[]} */
			const theirDeclarators = [];
			// As terser's mangler walks: the scopes, labels and kept declarators.
			const walker = new ast.TreeWalker(
				(/** @type {EXPECTED_ANY} */ node, /** @type {() => void} */ descend) => {
					if (node instanceof ast.LabeledStatementNode) {
						theirLabels.push({
							label: node.label,
							parent: labelStack.length > 0 ? labelStack[labelStack.length - 1] : null
						});
						labelStack.push(node.label);
						descend();
						labelStack.pop();
						return true;
					}
					if (node instanceof ast.DefunNode && !(walker.parent() instanceof ast.ScopeNode)) {
						theirBlockDefunScopes.add(node.parent_scope.get_defun_scope());
					}
					if (node instanceof ast.ScopeNode) {
						theirScopes.push(node);
					} else if (node.is_block_scope()) {
						theirScopes.push(node.block_scope);
						blockNodes.set(node.block_scope, node);
					} else if (
						node instanceof ast.VarDefNode &&
						node.name instanceof ast.SymbolNode &&
						node.value instanceof ast.LambdaNode &&
						!node.value.name
					) {
						theirDeclarators.push(node.name);
					}
				}
			);
			tree.walk(walker);
			/** @type {EXPECTED_ANY[]} */
			const ourScopes = analysis.scopes;
			if (ourScopes.length !== theirScopes.length) {
				differences.push(`${ourScopes.length} scopes, terser ${theirScopes.length}`);
				return differences;
			}
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY>} */
			const scopeOf = new Map();
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY>} */
			const definitionOf = new Map();
			/**
			 * @param {EXPECTED_ANY} theirs terser's definition
			 * @param {EXPECTED_ANY} ours the analysis' definition
			 * @returns {void}
			 */
			const pairDefinitions = (theirs, ours) => {
				const known = definitionOf.get(theirs);
				if (known === undefined) definitionOf.set(theirs, ours);
				else if (known !== ours) differences.push(`${theirs.name} paired twice`);
			};
			for (const [index, theirs] of theirScopes.entries()) {
				const ours = ourScopes[index];
				const where = `scope ${index} (${ours.node.type})`;
				const nodes = pairs.get(blockNodes.get(theirs) || theirs) || [];
				if (nodes.length !== 1 || nodes[0] !== ours.node) {
					differences.push(`${where} opened by another node`);
					return differences;
				}
				scopeOf.set(theirs, ours);
				const names = [...theirs.variables.keys()];
				if (names.join() !== [...ours.variables.keys()].join()) {
					differences.push(`${where} declares ${[...ours.variables.keys()]}, terser ${names}`);
				}
				for (const name of names) {
					if (ours.variables.has(name)) {
						pairDefinitions(theirs.variables.get(name), ours.variables.get(name));
					}
				}
			}
			// The bridge reads no name off `export *`, whose global terser makes.
			const star = tree.globals.get("*");
			const globalNames = [...tree.globals.keys()].filter((name) => name !== "*");
			if (globalNames.join() !== [...analysis.globals.keys()].join()) {
				differences.push(`globals ${[...analysis.globals.keys()]}, terser ${globalNames}`);
			}
			for (const name of globalNames) {
				if (analysis.globals.has(name)) {
					pairDefinitions(tree.globals.get(name), analysis.globals.get(name));
				}
			}
			for (const [theirs, ours] of scopeOf) {
				const where = `scope ${ourScopes.indexOf(ours)} (${ours.node.type})`;
				if ((scopeOf.get(theirs.parent_scope) || null) !== ours.parent) {
					differences.push(`${where} parent`);
				}
				if (scopeOf.get(theirs.get_defun_scope()) !== ours.defun) {
					differences.push(`${where} defun`);
				}
				if (Boolean(theirs.uses_eval) !== ours.usesEval) {
					differences.push(`${where} uses eval: ${ours.usesEval}`);
				}
				if (Boolean(theirs.uses_with) !== ours.usesWith) {
					differences.push(`${where} uses with: ${ours.usesWith}`);
				}
				const enclosed = theirs.enclosed
					.filter((/** @type {EXPECTED_ANY} */ definition) => definition !== star)
					.map((/** @type {EXPECTED_ANY} */ definition) => definitionOf.get(definition));
				if (
					enclosed.length !== ours.enclosed.length ||
					enclosed.some((/** @type {EXPECTED_ANY} */ definition, /** @type {number} */ index) => definition !== ours.enclosed[index])
				) {
					differences.push(
						`${where} encloses ${ours.enclosed.map((/** @type {EXPECTED_ANY} */ definition) => definition.name)}, terser ${theirs.enclosed.map((/** @type {EXPECTED_ANY} */ definition) => definition.name)}`
					);
				}
				const functionName =
					theirs instanceof ast.FunctionNode && theirs.name
						? definitionOf.get(theirs.name.thedef)
						: null;
				if (functionName !== ours.functionName) {
					differences.push(`${where} function name`);
				}
			}
			for (const [theirs, ours] of definitionOf) {
				const where = `${theirs.name} in scope ${ourScopes.indexOf(ours.scope)}`;
				const kinds = theirs.orig.map((/** @type {EXPECTED_ANY} */ symbol) => DECLARING_KINDS[symbol.TYPE]);
				if (kinds.join() !== ours.kinds.join()) {
					differences.push(`${where} declared as ${ours.kinds}, terser ${kinds}`);
				}
				for (const [field, theirValue, ourValue] of [
					["name", theirs.name, ours.name],
					["global", theirs.global, ours.global],
					["undeclared", theirs.undeclared, ours.undeclared],
					["export", theirs.export, ours.export],
					["scope", scopeOf.get(theirs.scope), ours.scope],
					[
						"unmangleable",
						Boolean(theirs.unmangleable(options)),
						modules.isUnmangleable(ours, options, null)
					]
				]) {
					if (theirValue !== ourValue) {
						differences.push(`${where} ${field}: ${ourValue}, terser ${theirValue}`);
					}
				}
			}
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY>} */
			const labelOf = new Map();
			if (theirLabels.length !== analysis.labels.length) {
				differences.push(`${analysis.labels.length} labels, terser ${theirLabels.length}`);
			}
			for (const [index, { label, parent }] of theirLabels.entries()) {
				const ours = analysis.labels[index];
				if (ours === undefined) break;
				labelOf.set(label, ours);
				if (label.name !== ours.name || (parent ? labelOf.get(parent) : null) !== ours.parent) {
					differences.push(`label ${index} (${ours.name})`);
				}
			}
			/** @type {Set<EXPECTED_ANY>} */
			const symbolNodes = new Set();
			for (const [node, printNodes] of pairs) {
				for (const printNode of printNodes) {
					if (printNode.type !== "Identifier") continue;
					symbolNodes.add(printNode);
					let expected = null;
					if (node instanceof ast.LabelNode) expected = labelOf.get(node);
					else if (node instanceof ast.LabelRefNode) expected = labelOf.get(node.thedef);
					else if (node instanceof ast.SymbolNode && node.thedef && node.thedef !== star) {
						expected = definitionOf.get(node.thedef);
					}
					if (expected !== printNode.definition) {
						differences.push(`${node.TYPE} ${node.name} names another definition`);
					}
				}
			}
			/**
			 * @param {EXPECTED_ANY} node a print node, or a list of them
			 * @returns {void}
			 */
			const checkUnnamed = (node) => {
				if (Array.isArray(node)) {
					for (const child of node) checkUnnamed(child);
					return;
				}
				if (node === null || typeof node !== "object" || typeof node.type !== "string") return;
				if (node.type === "Identifier" && !symbolNodes.has(node) && node.definition) {
					differences.push(`${node.name}, no name terser scopes, has a definition`);
				}
				for (const key of Object.keys(node)) {
					if (!/Token$|^definition$|^source$/.test(key)) checkUnnamed(node[key]);
				}
			};
			checkUnnamed(program);
			const blockDefunScopes = [...theirBlockDefunScopes].map((scope) => scopeOf.get(scope));
			if (
				blockDefunScopes.length !== analysis.blockDefunScopes.size ||
				blockDefunScopes.some((scope) => !analysis.blockDefunScopes.has(scope))
			) {
				differences.push("block function scopes");
			}
			const declarators = options.keep_fnames
				? theirDeclarators.map((symbol) => /** @type {EXPECTED_ANY[]} */ (pairs.get(symbol))[0])
				: null;
			if (JSON.stringify(declarators && declarators.map((identifier) => identifier.name)) !== JSON.stringify(analysis.functionDeclarators && analysis.functionDeclarators.map((/** @type {EXPECTED_ANY} */ identifier) => identifier.name)) ||
				(declarators !== null && declarators.some((identifier, index) => identifier !== analysis.functionDeclarators[index]))) {
				differences.push("declarators naming a function");
			}
			return differences;
		};

		/** @type {Record<string, EXPECTED_OBJECT>} */
		const SCOPE_OPTION_SETS = {
			default: {},
			toplevel: { toplevel: true },
			module: { module: true, toplevel: true },
			ie8: { ie8: true },
			safari10: { safari10: true },
			"ie8 and safari10": { ie8: true, safari10: true },
			eval: { eval: true },
			"kept names": { keep_fnames: true, keep_classnames: true },
			"kept names by regexp": { keep_fnames: /^[a-m]/, keep_classnames: /^[n-z]/ }
		};

		/** @type {[string, string, boolean?][]} */
		const SCOPE_CASES = [
			[
				"a with before a block and after one",
				"function f(a) { { let b = a; } with (a) { c; } { let d = a; } } function g() { { let e; } }"
			],
			[
				"eval called, passed, constructed and read",
				"function f() { g(eval); } function h() { new eval(); } function i() { return eval; } function j() { eval?.(1); } function k() { import(eval); } function l() { { let m; eval('m'); } }"
			],
			[
				"catch parameters and the vars redeclaring them",
				"var e, x; try { a(); } catch (e) { var e = 1; e; } function f() { try { b(); } catch ({ x2, y: [z] }) { var x; z; x2; } try {} catch (w) { w; } return x; } try {} catch { c; }"
			],
			[
				"function declarations in blocks, sloppy and strict",
				"{ function a() {} } if (x) function b() {} c: function d() {} function e() { { function f() {} } switch (1) { case 1: function g() {} } } function h() { 'use strict'; { function i() {} } } class K { static { { function j() {} } } }"
			],
			[
				"function declarations in blocks of a module",
				"{ function a() {} } export function b() {} export default function c() {}",
				true
			],
			[
				"exports and imports",
				"import d, { e as f, 'g h' as i } from 'm'; import * as ns from 'n'; export { d, ns as n2 }; export { x as y } from 'o'; export { 'q r' as s } from 'p'; export * from 'q'; export * as t from 'r'; export const { u, v: [w], z = function () { var hidden; } } = d; export let [a1 = class Inner {}] = f; export var b1; { let c1; } export class C1 {} export default class D1 {}",
				true
			],
			["an anonymous default export", "export default function () { return d; } var d;", true],
			["a default exported class expression", "export default (class E {});", true],
			[
				"classes and their names",
				"class A extends B { static x = A; [k] = 1; #p = 2; m() { return A; } get n() { return this.#p; } static { var s = 1; t: for (;;) break t; } } var C = class D extends D2 { e = () => D; }; (class {});"
			],
			[
				"named function expressions and their parameters",
				"(function f(f, g) { return g; }); (function arguments() { return arguments; }); (function h(i = h) { return () => arguments; })"
			],
			[
				"nested labels",
				"a: { b: for (;;) { c: for (;;) { break a; } continue b; } } d: { function e() { f: g: while (1) break f; } }"
			],
			[
				"switch and loops",
				"switch (function () { return x; }) { case 1: let x = 1; default: x; } for (let i = 0; i < 1; i++) { let j = i; } for (const k in o) k; for (const [l, { m }] of o) l; for (n in o); for ([p, q = 1, ...r] of o); for (o.s in o); while (u) { let v; break; } do { let w; continue; } while (y);"
			],
			[
				"patterns, defaults and rest",
				"function f({ a, b: { c } = {}, [d]: e, ...g }, [h, , i = 2, ...j], k = h) { var l; ({ a, m: [n] } = g); [o.p, ...q] = j; } function r({ s = function () { var t; } }) {}"
			],
			[
				"catch parameters ie8 moves",
				"try {} catch (e) { e; } function f() { var e; try {} catch (e) { e; var e; } try {} catch (g) { (function () { g; }); } } (function () { try {} catch (a) {} })(function () { try {} catch (b) {} }); try {} catch (undeclared) {} undeclared;"
			],
			[
				"loops safari10 encloses",
				"var a, b; for (let i = 0; ; ) { let c; } for (const k in a) {} for (const v of b) {} function f(d) { for (;;) {} }"
			],
			[
				"declarators naming an anonymous function",
				"var a = function () {}, b = () => {}, c = function c() {}, { d } = function () {}, e = 1; let f = function () { var k = () => {}; }; const g = class {}; var h = function () {}, i; { using j = function () {}; }"
			],
			[
				"directives, arguments and strictness",
				"'use strict'; { function a() {} } function b() { return arguments; } var c = () => arguments; function d() { 'use strict'; return () => arguments; }"
			],
			[
				"templates, chains, members and spread",
				"a?.b(c)?.[d]; `${e}${f}` ; g`${h}`; new i(...j); k = { l, m: n, [o]: p, q() { return r; }, get s() { return t; }, ...u }; v in w; class X { #y; z(o) { return #y in o; } }"
			],
			["constants the compressor writes", "f(undefined, NaN, Infinity, void 0, 1 / 0, 0 / 0);"],
			[
				"a function and a class declared, inlined as expressions",
				"function f() { var a = []; function bar() {} a.map(bar); } function g() { class Foo {} return Foo.name; }"
			],
			[
				"a debugger, empty statements, yield and await",
				"function* a() { yield; yield b; debugger; ; } async function c() { await d; return; } (async () => { for await (const e of f) e; })(); function h() { return new.target; } this; throw g;"
			]
		];

		for (const [name, source, isModule] of SCOPE_CASES) {
			it(`should scope ${name} as terser does`, async () => {
				const { minify, modules } = await load();
				/** @type {string[]} */
				const differences = [];
				for (const compress of [false, { passes: 2, keep_fnames: true, keep_classnames: true }]) {
					for (const [setName, options] of Object.entries(SCOPE_OPTION_SETS)) {
						const { ast: tree } = /** @type {EXPECTED_ANY} */ (
							await minify(source, {
								compress,
								mangle: false,
								module: isModule,
								format: { ast: true, code: false }
							})
						);
						for (const difference of scopeDifferences(modules, tree, { ...options })) {
							differences.push(`${compress ? "compressed" : "parsed"}, ${setName}: ${difference}`);
						}
					}
				}
				expect(differences).toEqual([]);
			});
		}

		/**
		 * @param {EXPECTED_ANY} modules the minifier's modules
		 * @param {EXPECTED_ANY} tree terser's tree
		 * @param {string} type a symbol class
		 * @param {string} name a name
		 * @returns {EXPECTED_ANY} the first symbol of that class with that name
		 */
		const symbolOf = (modules, tree, type, name) => {
			/** @type {EXPECTED_ANY} */
			let found;
			modules.ast.walk(tree, (/** @type {EXPECTED_ANY} */ node) => {
				if (!found && node.TYPE === type && node.name === name) found = node;
			});
			return found;
		};

		/** @type {[string, boolean, (tree: EXPECTED_ANY, modules: EXPECTED_ANY) => void, string][]} */
		const SCOPE_ERRORS = [
			[
				"var a; let b;",
				false,
				(tree, modules) => {
					symbolOf(modules, tree, "SymbolLet", "b").name = "a";
				},
				'"a" is redeclared'
			],
			[
				"let a; var b;",
				false,
				(tree, modules) => {
					symbolOf(modules, tree, "SymbolVar", "b").name = "a";
				},
				'"a" is redeclared'
			],
			[
				"import x from 'm'; { y; }",
				true,
				(tree) => {
					tree.body[1].body.unshift(tree.body.shift());
				},
				'"Import" statement may only appear at the top level'
			],
			[
				"export const x = 1; { y; }",
				true,
				(tree) => {
					tree.body[1].body.unshift(tree.body.shift());
				},
				'"Export" statement may only appear at the top level'
			],
			[
				"a: b: ;",
				false,
				(tree) => {
					tree.body[0].body.label.name = "a";
				},
				"Label a defined twice"
			],
			[
				"a: for (;;) break a;",
				false,
				(tree, modules) => {
					symbolOf(modules, tree, "LabelRef", "a").name = "z";
				},
				"Undefined label z [1,18]"
			]
		];

		for (const [source, isModule, change, message] of SCOPE_ERRORS) {
			it(`should throw ${message} as terser does`, async () => {
				const { minify, modules } = await load();
				const { ast: tree } = /** @type {EXPECTED_ANY} */ (
					await minify(source, {
						compress: false,
						mangle: false,
						module: isModule,
						format: { ast: true, code: false }
					})
				);
				change(tree, modules);
				expect(() => tree.figure_out_scope({})).toThrow(message);
				expect(scopeDifferences(modules, tree, {})).toEqual([]);
			});
		}

		it("should read a name as declared where the compressor inlined its declaration", async () => {
			const { minify, modules } = await load();
			const { ast: tree } = /** @type {EXPECTED_ANY} */ (
				await minify(
					"function f() { function bar() {} a.map(bar); } function g() { class Foo {} return Foo; }",
					{
						compress: { keep_fnames: true, keep_classnames: true },
						mangle: false,
						format: { ast: true, code: false }
					}
				)
			);
			const program = modules.toPrintTree(tree, undefined, undefined, false, true);
			const analysis = modules.analyzeManglingScopes(program, {});
			const [f, g] = program.body;
			const inlined = [
				f.body.body[0].expression.arguments[0],
				g.body.body[0].argument
			];
			expect(inlined.map((/** @type {EXPECTED_ANY} */ node) => node.type)).toEqual([
				"FunctionExpression",
				"ClassExpression"
			]);
			// Declared in the function holding them, as the declarations were.
			expect(inlined.map((/** @type {EXPECTED_ANY} */ node) => node.id.definition.scope.node)).toEqual([f, g]);
			expect(analysis.scopes.find((/** @type {EXPECTED_ANY} */ scope) => scope.node === inlined[0]).functionName).toBe(inlined[0].id.definition);
		});

		it("should read only the nodes the bridge writes", async () => {
			const { modules } = await load();
			expect(() =>
				modules.analyzeManglingScopes(
					{ type: "Program", body: [{ type: "Unknown" }] },
					{}
				)
			).toThrow("analyzeManglingScopes cannot read a Unknown node");
		});

		it("should keep a kept declarator's name while mangling", async () => {
			const { minify, modules } = await load();
			const { ast: tree } = /** @type {EXPECTED_ANY} */ (
				await minify("var short = function () {}, other = () => {};", {
					compress: false,
					mangle: false,
					format: { ast: true, code: false }
				})
			);
			const options = { keep_fnames: /^s/, toplevel: true };
			const analysis = modules.analyzeManglingScopes(
				modules.toPrintTree(tree, undefined, undefined, false, true),
				options
			);
			const [short, other] = analysis.functionDeclarators.map(
				(/** @type {EXPECTED_ANY} */ identifier) => identifier.definition
			);
			const kept = new Set([short, other]);
			expect(modules.isUnmangleable(short, options, null)).toBe(false);
			expect(modules.isUnmangleable(short, options, kept)).toBe(true);
			expect(modules.isUnmangleable(other, options, kept)).toBe(false);
		});

		describe("mangleManglingScopes", () => {
			/**
			 * An identifier source ordering its names by the characters counted.
			 * @returns {EXPECTED_ANY} the source
			 */
			const sortingIdentifiers = () => {
				/** @type {string[]} */
				let characters = [];
				/** @type {Map<string, number>} */
				let counts = new Map();
				return {
					reset() {
						characters = [..."abcdefghijklmnopqrstuvwxyz"];
						counts = new Map();
					},
					/**
					 * @param {string} text characters printed
					 * @param {number} delta how to count them
					 */
					consider(text, delta) {
						for (const character of text) {
							counts.set(character, (counts.get(character) || 0) + delta);
						}
					},
					sort() {
						characters.sort(
							(first, second) =>
								(counts.get(second) || 0) - (counts.get(first) || 0) ||
								(first < second ? -1 : 1)
						);
					},
					/**
					 * @param {number} index which name
					 * @returns {string} the name
					 */
					get(index) {
						const alphabet = characters.length > 0 ? characters : [..."abcdefghijklmnopqrstuvwxyz"];
						let name = "";
						let rest = index + 1;
						do {
							rest--;
							name += alphabet[rest % 26];
							rest = Math.floor(rest / 26);
						} while (rest > 0);
						return name;
					}
				};
			};

			/**
			 * An identifier source ignoring frequency, handing out reserved words too.
			 * @returns {EXPECTED_ANY} the source
			 */
			const plainIdentifiers = () => ({
				/**
				 * @param {number} index which name
				 * @returns {string} the name
				 */
				get(index) {
					let name = "";
					let rest = index + 1;
					do {
						rest--;
						name += ["i", "f", "d", "o", "n", "a", "e", "l", "t", "r"][rest % 10];
						rest = Math.floor(rest / 10);
					} while (rest > 0);
					return name;
				}
			});

			/** @type {Record<string, () => EXPECTED_OBJECT>} */
			const MANGLE_OPTION_SETS = {
				default: () => ({ mangle: {} }),
				toplevel: () => ({ mangle: { toplevel: true } }),
				module: () => ({ mangle: { module: true } }),
				ie8: () => ({ mangle: { ie8: true } }),
				safari10: () => ({ mangle: { safari10: true } }),
				"ie8 and safari10": () => ({ mangle: { ie8: true, safari10: true, toplevel: true } }),
				eval: () => ({ mangle: { eval: true } }),
				"kept names": () => ({ mangle: { keep_fnames: true, keep_classnames: true } }),
				"kept names by a global regexp": () => ({
					mangle: { keep_fnames: /^[a-m]/g, keep_classnames: /[n-z]/g, toplevel: true }
				}),
				reserved: () => ({ mangle: { reserved: ["a", "b", "e", "t", "n", "r"], toplevel: true } }),
				"reserved names, the slow way": () => ({
					mangle: { reserved: ["a", "b", "e", "t", "n", "r"], safari10: true }
				}),
				"identifiers sorted by frequency": () => ({ mangle: { nth_identifier: sortingIdentifiers() } }),
				"identifiers ignoring frequency": () => ({
					mangle: { nth_identifier: plainIdentifiers(), toplevel: true }
				}),
				"a name cache": () => ({
					mangle: {},
					nameCache: { vars: { props: { $foo: "a", $console: "b", $f: "zz", $e: "t" } } }
				}),
				"a name cache at the top level": () => ({ mangle: { toplevel: true }, nameCache: {} }),
				"a name cache, kept names and ie8": () => ({
					mangle: { toplevel: true, keep_fnames: /^[a-f]/g, ie8: true },
					nameCache: { vars: { props: { $a: "n" } } }
				})
			};

			/**
			 * A source minified by terser and by webpack, which writes what terser
			 * writes with its `correct` and `improve` phases off.
			 * @param {string | Record<string, string>} input a source, or files
			 * @param {() => EXPECTED_ANY} makeOptions fresh options each time
			 * @returns {Promise<{ theirs: EXPECTED_ANY, ours: EXPECTED_ANY }>} code, maps and name cache each way
			 */
			const mangleBothWays = async (input, makeOptions) => {
				const { minify, corrections, improvements } = await load();
				/**
				 * @param {Minifying} minifier a `minify`
				 * @param {EXPECTED_ANY} options its options
				 * @returns {Promise<EXPECTED_ANY>} what it wrote
				 */
				const run = async (minifier, options) => {
					const result = /** @type {EXPECTED_ANY} */ (await minifier(input, options));
					return {
						code: result.code,
						map: result.map,
						decodedMap: result.decoded_map,
						nameCache: options.nameCache
					};
				};
				const theirs = await run(terserReference().minify, makeOptions());
				const phases = /** @type {{ enabled: boolean }[]} */ ([corrections, improvements]);
				for (const phase of phases) phase.enabled = false;
				try {
					return { theirs, ours: await run(minify, makeOptions()) };
				} finally {
					for (const phase of phases) phase.enabled = true;
				}
			};

			/**
			 * What webpack writes for a source under each mangle option set.
			 * @param {string} source the source
			 * @returns {Promise<string[]>} the code and name cache each set writes
			 */
			const ownOutputs = async (source) => {
				const { minify } = await load();
				/** @type {string[]} */
				const outputs = [];
				for (const [setName, makeSet] of Object.entries(MANGLE_OPTION_SETS)) {
					for (const compress of [false, { passes: 2 }]) {
						for (const module of [false, true]) {
							const options = /** @type {EXPECTED_ANY} */ ({ ...makeSet(), compress, module });
							try {
								const { code } = await minify(source, options);
								outputs.push(`${setName}, ${compress ? "compressed" : "parsed"}: ${code} ${JSON.stringify(options.nameCache)}`);
								break;
							} catch (err) {
								if (/** @type {Error} */ (err).name !== "SyntaxError") throw err;
							}
						}
					}
				}
				return outputs;
			};

			/**
			 * How webpack's mangling differs from terser's, read where the two print
			 * the source alike unmangled: their parsers place some nodes apart.
			 * @param {string | Record<string, string>} input a source, or files
			 * @param {() => EXPECTED_ANY} makeOptions fresh options each time
			 * @returns {Promise<string[]>} each result that differs, as webpack wrote it
			 */
			const mangleDifferences = async (input, makeOptions) => {
				const { theirs, ours } = await mangleBothWays(input, makeOptions);
				const unmangled = await mangleBothWays(input, () => ({ ...makeOptions(), mangle: false }));
				/** @type {string[]} */
				const differences = [];
				for (const key of ["code", "map", "decodedMap", "nameCache"]) {
					if (
						JSON.stringify(unmangled.theirs[key]) === JSON.stringify(unmangled.ours[key]) &&
						JSON.stringify(theirs[key]) !== JSON.stringify(ours[key])
					) {
						differences.push(`${key} ${JSON.stringify(ours[key])}`);
					}
				}
				return differences;
			};

			for (const source of [
				...TABLE_SOURCES,
				...SCOPE_CASES.map(([, scopeSource]) => scopeSource),
				"a: { b: for (;;) { c: if (x) break b; } d: e: while (y) { (function () { f: g: for (;;) continue f; })(); break d; } }",
				"function f(a, b) { var c = a + b; try { g(); } catch (e) { var e = 1; l: for (;;) { m: break l; } } return function h(x, y) { return x + y + c + h; }; } f(1, 2); var $foo = 1; foo; console.log(f);",
				"function outer() { if (a) { function inner(x) { return x; } inner(1); } var y = function named(z, w) { return named(z) + w; }; try {} catch (q) { var q; } return [, y, , outer]; } outer();",
				"var reused = 1; function f() { var a1, a2, a3, a4, a5, a6, a7, a8, a9, b1, b2, b3, b4, b5, b6, b7, b8, b9, c1, c2, c3, c4, c5, c6, c7, c8, c9, d1, d2, d3, d4, d5, d6, d7, d8, d9, e1, e2, e3, e4, e5, e6, e7, e8, e9, f1, f2, f3, f4, f5, f6, f7, f8, f9; return [a1, a2, a3, a4, a5, a6, a7, a8, a9, b1, b2, b3, b4, b5, b6, b7, b8, b9, c1, c2, c3, c4, c5, c6, c7, c8, c9, d1, d2, d3, d4, d5, d6, d7, d8, d9, e1, e2, e3, e4, e5, e6, e7, e8, e9, f1, f2, f3, f4, f5, f6, f7, f8, f9, reused]; }"
			]) {
				it(`should mangle as terser's mangler does: ${source.slice(0, 60)}`, async () => {
					/** @type {string[]} */
					const differences = [];
					let compared = 0;
					for (const [setName, makeSet] of Object.entries(MANGLE_OPTION_SETS)) {
						for (const compress of [false, { passes: 2 }]) {
							for (const module of [false, true]) {
								/** @type {string[]} */
								let found;
								try {
									found = await mangleDifferences({ "input.js": source }, () => ({
										...makeSet(),
										compress,
										module,
										sourceMap: { asObject: true }
									}));
								} catch (err) {
									// A source may be one only a script, or only a module, reads.
									if (/** @type {Error} */ (err).name === "SyntaxError") continue;
									throw err;
								}
								for (const difference of found) {
									differences.push(`${setName}, ${compress ? "compressed" : "parsed"}, ${module ? "module" : "script"}: ${difference}`);
								}
								compared++;
								break;
							}
						}
					}
					if (compared === 0) {
						// terser refuses the source, so what webpack writes is held as written.
						expect(await ownOutputs(source)).toMatchSnapshot();
						return;
					}
					expect(differences).toEqual([]);
				});
			}

			it("should not name a parameter as its function, kept as declared, as terser's mangler does", async () => {
				const source =
					"function n(t) { return t + 1; } function e(n) { return n; } console.log([1].map(n), [2].map(e));";
				const { theirs, ours } = await mangleBothWays(source, () => ({
					compress: { keep_fnames: true, toplevel: true, passes: 2 },
					mangle: {}
				}));
				expect(theirs.code).toBe(
					"console.log([1].map(function n(o){return o+1}),[2].map(function e(n){return n}));"
				);
				expect(ours).toEqual(theirs);
			});

			it("should hand a name cache from one source to the next as terser's mangler does", async () => {
				const sources = [
					"var shared = 1, $kept = 2; function grow(by) { return shared + by; } grow(unknownGlobal);",
					"var other = shared, grown = grow(other); console.log(grown, $kept, unknownGlobal);"
				];
				const { minify } = await load();
				for (const mangle of [{ toplevel: true }, { toplevel: true, keep_fnames: true }, {}]) {
					/** @type {string[][]} */
					const outputs = [];
					/** @type {EXPECTED_ANY[]} */
					const caches = [];
					for (const minifier of [terserReference().minify, minify]) {
						const nameCache = {};
						const codes = [];
						for (const source of sources) {
							codes.push(
								/** @type {string} */ (
									(await minifier(source, { compress: false, mangle: { ...mangle }, nameCache })).code
								)
							);
						}
						outputs.push(codes);
						caches.push(nameCache);
					}
					expect(outputs[1]).toEqual(outputs[0]);
					expect(caches[1]).toEqual(caches[0]);
				}
			});

			/** @type {Record<string, () => EXPECTED_OBJECT>} */
			const PROPERTY_OPTION_SETS = {
				"private names alone": () => ({ mangle: {} }),
				properties: () => ({ mangle: { properties: {} } }),
				"properties at the top level": () => ({ mangle: { toplevel: true, properties: true } }),
				"properties by a regexp": () => ({ mangle: { properties: { regex: /^[a-m_$]/ } } }),
				"properties by a global regexp": () => ({ mangle: { properties: { regex: /^[a-q]/g } } }),
				"quoted properties kept": () => ({ mangle: { properties: { keep_quoted: true } } }),
				"quoted properties kept strictly": () => ({ mangle: { properties: { keep_quoted: "strict" } } }),
				"debug properties": () => ({ mangle: { properties: { debug: true } } }),
				"debug properties with a suffix": () => ({ mangle: { properties: { debug: "XYZ" } } }),
				"builtin properties": () => ({ mangle: { toplevel: true, properties: { builtins: true } } }),
				"undeclared properties": () => ({ mangle: { properties: { undeclared: true } } }),
				"annotated properties alone": () => ({ mangle: { properties: { only_annotated: true } } }),
				"reserved properties": () => ({ mangle: { properties: { reserved: ["foo", "p", "value"] } } }),
				"cached properties alone": () => ({
					mangle: { properties: { only_cache: true } },
					nameCache: { props: { props: { $foo: "a", $bar: "zz", $1: "one", $value: "v" } } }
				}),
				"a property name cache": () => ({
					mangle: { properties: {} },
					nameCache: { vars: { props: { $foo: "a" } }, props: { props: { $foo: "a", $1: "b", $length: "q" } } }
				}),
				"identifiers sorted by frequency": () => ({
					mangle: { nth_identifier: sortingIdentifiers(), properties: { nth_identifier: sortingIdentifiers() } }
				}),
				"identifiers ignoring frequency": () => ({ mangle: { nth_identifier: plainIdentifiers(), properties: {} } }),
				"properties and ie8": () => ({ mangle: { ie8: true, safari10: true, keep_fnames: true, properties: {} } })
			};

			for (const source of [
				"class A { #x = 1; #y() { return this.#x; } static #z; get #w() { return 1; } set #w(v) {} static { A.#z = 2; } m(o) { return #x in o && this.#y().#x?.#w; } } new A().m({});",
				"var o = { foo: 1, 'bar': 2, 3: 4, [baz]: 5, get qux() { return 1; }, set qux(v) {}, [k]() {}, *gen() {}, async am() {} }; o.foo = o['bar'] + o.qux + o[3]; Object.defineProperty(o, 'zed', {}); 'foo' in o; o[c ? 'a1' : (0, 'b1')]; console.log(o, window.beta, x.y.z, (await_ => 1)(), this.vee, (-u).neg, (n++).inc, new N().made, f().called, a?.b.chained, (a?.b).parenthesized);",
				"var { alpha: aa, gamma = 2, ...rest } = o, [{ delta }] = p; class C { constructor() {} static eps = 1; 'zeta' = 2; [zz] = 3; if = 4; 1 = 5; method() {} 'quoted'() {} } new C().eps; for (const { theta } of list) theta;",
				"function f(Object) { return Object.defineProperty(a, 'p', { value: 1 }); } var q = { p: 1, /*@__KEY__*/ 'r': 2, 'r2': /*@__KEY__*/ 'p' }; q[/*@__KEY__*/ 'r']; f({}); new Object.defineProperty(b, 'nu', {}); Object['defineProperty'](b, 'xi', {}); Object?.defineProperty(b, 'omicron', {}); Object.defineProperty?.(b, 'pi', {}); Object.defineProperty(b, ...rho); class Sigma { #tau = 1; get() { return this.#tau; } }",
				"var o = { if: 1, null: 2, 1e3: 3, 0x10: 4, 'a b': 5, [`t`]: 6, [function () {}]() {}, [() => 1]() {}, [class {}]() {}, [function named() {}]() {}, [class Named {}]() {}, [NaN]() {}, [void 0]() {}, [x.y]() {} }; o.if + o.null + o[1000] + o['a b'] + o[1];",
				"async function f(a) { return (await a).awaited + (typeof a).length; } function* g(b) { (yield).empty; (yield b).full; } l: for (var key in obj) { if (key.skip) continue l; break l; } f(g);",
				"var o = { ['computed']: 1, value: 2 }; Object.defineProperty(o, c ? 'cond1' : 'cond2', {}); o.foo.bar = 1; window.foo; foo.bar; new Foo().bar; export_ = { value: o.value };"
			]) {
				it(`should mangle properties and private names as terser's mangler does: ${source.slice(0, 60)}`, async () => {
					/** @type {string[]} */
					const differences = [];
					for (const [setName, makeSet] of Object.entries(PROPERTY_OPTION_SETS)) {
						for (const compress of [false, { passes: 2 }]) {
							const found = await mangleDifferences({ "input.js": source }, () => ({
								...makeSet(),
								compress,
								sourceMap: { asObject: true }
							}));
							for (const difference of found) {
								differences.push(`${setName}, ${compress ? "compressed" : "parsed"}: ${difference}`);
							}
						}
					}
					expect(differences).toEqual([]);
				});
			}

			it("should throw as terser's mangler does where `Object.defineProperty` has no descriptor name", async () => {
				const { minify } = await load();
				/** @type {string[]} */
				const messages = [];
				for (const minifier of [terserReference().minify, minify]) {
					try {
						await minifier("Object.defineProperty(o);", { mangle: { properties: {} } });
					} catch (err) {
						messages.push(/** @type {Error} */ (err).message);
					}
				}
				expect(messages).toHaveLength(2);
				expect(messages[1]).toBe(messages[0]);
			});

			it("should fill a name cache without printing as terser does", async () => {
				const { minify } = await load();
				/** @type {EXPECTED_ANY[]} */
				const caches = [];
				for (const minifier of /** @type {Minifying[]} */ ([terserReference().minify, minify])) {
					const nameCache = {};
					await minifier("function f(long) { return long; } f(1); var g = 2;", {
						mangle: { toplevel: true, properties: true },
						format: { code: false },
						nameCache
					});
					caches.push(nameCache);
				}
				expect(caches[1]).toEqual(caches[0]);
			});

			it("should drop a tree it was given once printed, as terser does", async () => {
				const { minify } = await load();
				const source = "function f(long) { return long; } f(1);";
				for (const [minifier, format] of /** @type {[Minifying, EXPECTED_OBJECT][]} */ ([
					[terserReference().minify, { spidermonkey: true }],
					[minify, { spidermonkey: true }],
					[minify, {}]
				])) {
					const { ast } = /** @type {EXPECTED_ANY} */ (
						await minifier(source, { compress: false, mangle: false, format: { ast: true, code: false } })
					);
					const { code } = await minifier(ast, { compress: false, mangle: { toplevel: true }, format });
					expect([code, ast.body[0].body.length, ast.body[0].argnames.length, ast.variables]).toEqual([
						"function n(n){return n}n(1);",
						0,
						0,
						undefined
					]);
				}
			});

			it("should hand the tree back mangled as terser does", async () => {
				const { minify } = await load();
				const source =
					"function f(long) { var o = { foo: 1, 'bar': 2, get baz() { return 3; }, [k]: 4 }; return long + o.foo + o['bar'] + o[/*@__KEY__*/ 'qux']; } class C { #x = 1; static y = 2; 'z' = 3; #w() {} m(p) { return #x in p && this.#x + this.#w(); } } l: for (;;) { f(1); break l; } new C();";
				for (const mangle of [{ toplevel: true }, { toplevel: true, properties: { keep_quoted: true } }, { properties: {} }]) {
					const options = () => /** @type {EXPECTED_ANY} */ ({ compress: false, mangle: { ...mangle }, format: { ast: true } });
					const theirs = /** @type {EXPECTED_ANY} */ (await terserReference().minify(source, options()));
					const ours = /** @type {EXPECTED_ANY} */ (await minify(source, options()));
					expect(ours.code).toBe(theirs.code);
					// Each tree, printed again without mangling, prints the names it took.
					const reprint = { compress: false, mangle: false };
					expect((await minify(ours.ast, reprint)).code).toBe(
						(await terserReference().minify(theirs.ast, reprint)).code
					);
					const estreeOptions = () =>
						/** @type {EXPECTED_ANY} */ ({ compress: false, mangle: { ...mangle }, format: { spidermonkey: true } });
					// Where the parsers place a node apart is no concern of mangling's.
					/**
					 * @param {EXPECTED_ANY} result a result
					 * @returns {string} its ESTree tree, without locations
					 */
					const estreeOf = (result) =>
						JSON.stringify(result.ast, (key, value) => (key === "loc" ? undefined : value));
					expect(estreeOf(await minify(source, estreeOptions()))).toBe(
						estreeOf(await terserReference().minify(source, estreeOptions()))
					);
				}
			});

			it("should mangle what a constant `new Function` body holds as terser does", async () => {
				const { minify } = await load();
				for (const source of [
					"var f = new Function('alpha', 'beta', 'var gamma = alpha + beta; return function inner(delta) { return gamma * delta; }'); console.log(f);",
					"var f = Function('alpha', '{ beta, gamma }', 'return (x => x + alpha + beta)(gamma)'); console.log(f);",
					// A body closing the function early: the first function terser's walk meets is taken.
					"var f = Function('a', '}); function g() { for (;;) s(); return [, s]; } (function () {'); console.log(f);"
				]) {
					const options = () => ({
						compress: { unsafe: true, unsafe_Function: true, unsafe_arrows: true, hoist_funs: true, passes: 2 },
						mangle: true,
						ecma: /** @type {const} */ (2020)
					});
					const ours = await minify(source, options());
					expect(ours.code).toBe((await terserReference().minify(source, options())).code);
				}
			});
		});
	});
});

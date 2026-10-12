"use strict";

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
 * @param {EXPECTED_ANY} input the source, or the sources by name
 * @param {EXPECTED_ANY} options the options
 * @param {boolean} fromTree whether the tree printer may print it
 * @returns {Promise<{ code: string, printedFromTree: number }>} the code, and how often the tree printer printed
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
		const { code } = await minify(input, options);
		return { code, printedFromTree };
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
		["mangled", { compress: false, mangle: true }],
		["wrapped", { compress: false, mangle: false, wrap: "w" }],
		["enclosed", { compress: false, mangle: false, enclose: true }],
		["mapped", { compress: false, mangle: false, sourceMap: true }],
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

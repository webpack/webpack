"use strict";

// cspell:ignore fnames, propmangle, fargs, domprops

const vm = require("vm");
const {
	FORMAT_DEFAULTS,
	IGNORED_FORMAT_OPTIONS,
	createUnicode,
	estreeType,
	load,
	loadSources,
	markEstreeTypes,
	PHASES
} = require("../../lib/javascript/syntax").printer;

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

describe("syntax-printer", () => {
	it("should install onto terser", async () => {
		const terser = await load();
		expect(typeof terser.minify).toBe("function");
		// WHY: whether a runtime reaches terser's own sources is the one thing
		// `load` is written to tolerate, and Deno reaches them only sometimes —
		// so asserting either outcome there failed at random. What it owes
		// everywhere is to install phases this build declares and nothing else;
		// Node, which always reaches the sources, owes the whole set.
		const declared = PHASES.map((phase) => phase.name);
		expect(declared).toEqual(expect.arrayContaining(terser.phases));
		if (!("Deno" in globalThis)) {
			expect(terser.phases).toEqual(expect.arrayContaining(declared));
		}
	});

	for (const [name, source, options] of CASES) {
		it(`should mangle exactly as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = require("terser");
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
		const reference = require("terser");
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
		const reference = require("terser");
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
		const reference = require("terser");
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
			const reference = require("terser");
			for (const settings of OUTPUT_OPTIONS) {
				const options = () => ({ ...settings, format: { ...settings.format } });
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
				expect(ours.code).toBe(theirs.code);
				expect(ours.map).toEqual(theirs.map);
			}
			const { code } = await minify(source, OUTPUT_OPTIONS[0]);
			expect(code).toMatchSnapshot();
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

	it("should decline a terser whose stream it does not know", () => {
		const output =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "output")
			);
		const utils = { defaults: () => ({}) };
		const ast = {
			AST_Node: { prototype: { _print() {}, print_to_string() {} } }
		};
		/**
		 * @param {(options?: object) => object} OutputStream a stream factory
		 * @returns {boolean} whether the phase fits it
		 */
		const fits = (OutputStream) =>
			output.supports({ ast, output: { OutputStream }, utils });
		/**
		 * @param {object=} defs the option set a rejection names
		 * @returns {never} always throws
		 */
		const rejectNaming = (defs) => {
			throw Object.assign(new Error("unsupported"), { defs });
		};

		expect(output.supports({ ast, output: {}, utils })).toBe(false);
		// Accepts an option it should reject, so its option set cannot be read.
		expect(fits(() => ({}))).toBe(false);
		expect(fits(() => rejectNaming())).toBe(false);
		expect(fits(() => rejectNaming({ ...FORMAT_DEFAULTS, added: false }))).toBe(
			false
		);
		/** @type {Record<string, unknown>} */
		const renamed = { ...FORMAT_DEFAULTS, renamed: false };
		delete renamed.width;
		expect(fits(() => rejectNaming(renamed))).toBe(false);
		expect(fits(() => rejectNaming({ ...FORMAT_DEFAULTS, width: 120 }))).toBe(
			false
		);
		// Knows the option set but hands its generators other members.
		expect(
			fits((options) => (options ? rejectNaming(FORMAT_DEFAULTS) : { print() {} }))
		).toBe(false);
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
		["an export of an undeclared name", "export { undeclared };", { module: true }],
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
			const reference = require("terser");
			/**
			 * @param {typeof minify} run a minify
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
			const reference = require("terser");
			/**
			 * @param {typeof minify} run a minify
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
			const reference = require("terser");
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
			const reference = require("terser");
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
			const reference = require("terser");
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
			const reference = require("terser");
			/**
			 * @param {typeof minify} run a minify
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
					return { error: /** @type {Error} */ (err).message };
				}
			};
			expect(await outcome(minify)).toEqual(await outcome(reference.minify));
		});
	}

	it("should drive a minify as terser does: sources inherited by the files object", async () => {
		const { minify } = await load();
		const reference = require("terser");
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
		const reference = require("terser");
		/**
		 * @param {typeof minify} run a minify
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
		const reference = require("terser");
		/**
		 * @param {typeof minify} run a minify
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
		const reference = require("terser");
		/**
		 * @param {typeof minify} run a minify
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
		const reference = require("terser");
		const compressor = { option: () => true, has_directive: () => undefined };
		/**
		 * @param {typeof minify} run a minify
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

	it("should leave terser's debug log to terser", async () => {
		const { minify } = await load();
		/** @type {number[]} */
		const written = [];
		const fs = { writeFileSync: () => written.push(1), mkdirSync() {} };
		/** @type {(files: string, options: object, fs: object) => Promise<{ code?: string }>} */
		const run = /** @type {EXPECTED_ANY} */ (minify);
		const previous = process.env.TERSER_DEBUG_DIR;
		process.env.TERSER_DEBUG_DIR = "debug";
		try {
			const result = await run("sink(1 + 2);", {}, fs);
			expect(result.code).toBe("sink(3);");
		} finally {
			if (previous === undefined) delete process.env.TERSER_DEBUG_DIR;
			else process.env.TERSER_DEBUG_DIR = previous;
		}
		expect(written).toHaveLength(1);
	});

	/** @type {[string, EXPECTED_ANY, EXPECTED_OBJECT][]} */
	const PARSED_BY_TERSER = [
		["an expression rather than a program", "a + b", { parse: { expression: true } }],
		["an option this does not read", "a + b", { parse: { strict: true } }],
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
		["a source webpack's parser refuses", "sink(", {}],
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
			const reference = require("terser");
			/**
			 * @param {typeof minify} run a minify
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
					return { error: /** @type {Error} */ (err).message };
				}
			};
			expect(await outcome(minify)).toEqual(await outcome(reference.minify));
		});
	}

	it("should decline a terser whose names it does not reproduce", () => {
		const frequency =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "frequency")
			);
		/**
		 * @param {string} alphabet the characters it names with
		 * @returns {object} a counter that ignores what it is shown
		 */
		const counter = (alphabet) => ({
			reset() {},
			consider() {},
			sort() {},
			get: (/** @type {number} */ num) => alphabet[num % alphabet.length]
		});
		/**
		 * @param {EXPECTED_ANY[]} items items to sort
		 * @param {(a: EXPECTED_ANY, b: EXPECTED_ANY) => number} compare their order
		 * @returns {EXPECTED_ANY[]} them, sorted
		 */
		const mergeSort = (items, compare) => [...items].sort(compare);
		expect(frequency.supports({ scope: {}, utils: { mergeSort } })).toBe(false);
		expect(
			frequency.supports({ scope: { base54: counter("abc") }, utils: {} })
		).toBe(false);
		expect(
			frequency.supports({ scope: { base54: counter("xyz") }, utils: { mergeSort } })
		).toBe(false);
	});

	it("should decline a terser whose parse it does not reproduce", () => {
		const parse =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "parse")
			);
		expect(parse.supports({ ast: {}, parse: {} })).toBe(false);
		// A parser whose tree differs from what the conversion builds.
		const reference = { AST_Token: class {}, AST_Node: { prototype: { print_to_string() {} } } };
		expect(
			parse.supports({
				ast: reference,
				parse: { parse: () => ({ TYPE: "Toplevel", body: [] }) }
			})
		).toBe(false);
	});

	it("should decline a terser whose walk it does not know", () => {
		const walk =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "walk")
			);
		/**
		 * @param {string} source what the function prints as
		 * @returns {() => void} a function printing as that source
		 */
		const printingAs = (source) =>
			Object.assign(() => {}, { toString: () => source });
		const terserVisit = printingAs(
			"_visit(node, descend) { this.push(node); var ret = this.visit(node, descend ? function() { descend.call(node); } : noop); if (!ret && descend) { descend.call(node); } this.pop(); return ret; }"
		);
		/**
		 * @param {string[]} walks each node class's walk, as its source
		 * @param {Record<string, unknown>=} exports what the ast module exports besides
		 * @returns {boolean} whether the phase fits
		 */
		const fits = (walks, exports = {}) =>
			walk.supports({
				ast: {
					TreeWalker: Object.assign(function TreeWalker() {}, {
						prototype: { _visit: terserVisit }
					}),
					AST_Node: {
						prototype: {
							_walk: printingAs("function(visitor) { return visitor._visit(this); }")
						},
						SUBCLASSES: [
							{ prototype: {}, SUBCLASSES: [] },
							...walks.map((source) => ({
								prototype: { _walk: printingAs(source) },
								SUBCLASSES: []
							}))
						]
					},
					...exports
				},
				utils: { noop() {} }
			});

		expect(walk.supports({ ast: {}, utils: {} })).toBe(false);
		expect(fits([])).toBe(true);
		expect(
			fits([
				"function(visitor) { return visitor._visit(this, this.value && function() { this.value._walk(visitor); }); }"
			])
		).toBe(true);
		// A walk that does not hand its children's walk to the visitor.
		expect(fits(["function(visitor) { visitor.seen(this); }"])).toBe(false);
		// Children walked through a helper the ast module does not export.
		expect(
			fits([
				"function(visitor) { return visitor._visit(this, function() { walk_body(this, visitor); }); }"
			])
		).toBe(false);
		expect(
			fits(
				[
					"function(visitor) { return visitor._visit(this, function() { walk_body(this, visitor); }); }"
				],
				{ walk_body() {} }
			)
		).toBe(true);
		// Children walked by code webpack's parser refuses.
		expect(
			fits([
				"function(visitor) { return visitor._visit(this, function() { this.body._walk(visitor; }); }"
			])
		).toBe(false);
	});

	it("should decline a terser whose transform it does not know", async () => {
		const transform =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "transform")
			);
		const modules = await loadSources();
		expect(transform.supports({ ...modules, compress: {} })).toBe(false);
		expect(
			transform.supports({
				...modules,
				ast: {
					...modules.ast,
					TreeWalker: Object.assign(function TreeWalker() {}, {
						prototype: { push() {}, pop() {} }
					})
				}
			})
		).toBe(false);
	});

	it("should decline a terser whose compressor it does not know", () => {
		const compressor =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "compressor")
			);
		expect(compressor.supports({ compress: {}, flags: {} })).toBe(false);
		expect(
			compressor.supports({
				compress: {
					Compressor: Object.assign(function Compressor() {}, {
						prototype: { before() {}, in_computed_key() {} }
					})
				},
				flags: { SQUEEZED: 256 }
			})
		).toBe(false);
	});

	it("should decline a terser whose sizes it does not know", () => {
		const size =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "size")
			);
		expect(size.supports({ ast: {} })).toBe(false);
	});

	it("should count a node's size inside a size being counted", async () => {
		await load();
		const { parse } = await loadSources();
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

	it("should decline a terser whose equivalence it does not know", () => {
		const equivalent =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "equivalent")
			);
		expect(equivalent.supports({ ast: {} })).toBe(false);
	});

	it("should compare trees as terser does", async () => {
		await load();
		const { parse } = await loadSources();
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
		const reference = await require("terser")
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
		const terser = require("terser");
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
			[{ "b.js": /** @type {string} */ (input.code) }, { content: /** @type {string} */ (input.map) }]
		];
		for (const [files, sourceMap] of cases) {
			const ours = await minify(files, { sourceMap: { ...sourceMap } });
			const reference = await terser.minify(files, { sourceMap: { ...sourceMap } });
			expect(ours.code).toBe(reference.code);
			expect(ours.map).toBe(reference.map);
		}
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
	});

	it("should name each node the ESTree type terser converts it to", async () => {
		const { ast, parse } = await loadSources();
		markEstreeTypes({ ast });
		const source = `"use strict";
			import a, { b as c, "d" as e } from "f"; import * as g from "h";
			export default class extends a { static #p = 1; static { g(); } get [c]() { return #p in this; } set s(v) {} m() {} q = 2; #r() {} }
			export { a as default2, e as "q" }; export * from "i"; export * as j from "k";
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
						parent.TYPE === "Destructuring" || parent instanceof ast.AST_Lambda
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
		await load();
		const { ast, parse, utils } = await loadSources();
		const { AST_SimpleStatement, TreeTransformer } = ast;
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
					if (!(node instanceof AST_SimpleStatement)) return;
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
		await load();
		const { ast, compress, flags, parse } = await loadSources();
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

	it("should decline a terser whose hoisting it does not know", () => {
		const hoist =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "hoist")
			);
		expect(hoist.supports({ ast: {} })).toBe(false);
		expect(
			hoist.supports({
				ast: { AST_Scope: { prototype: { hoist_properties() {} } } }
			})
		).toBe(false);
	});

	it("should decline a terser whose scope analysis it does not know", () => {
		const scope =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "scope")
			);
		const utils = { defaults() {}, push_uniq() {}, string_template() {} };
		const parse = { js_error() {} };
		expect(scope.supports({ ast: {}, parse, utils })).toBe(false);
		expect(
			scope.supports({
				ast: { AST_Scope: { prototype: { figure_out_scope() {} } } },
				parse: {},
				utils
			})
		).toBe(false);
		expect(
			scope.supports({
				ast: { AST_Scope: { prototype: { figure_out_scope() {} } } },
				parse,
				utils
			})
		).toBe(false);
	});

	it("should decline a terser whose driver it does not know", () => {
		const driver =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "minify")
			);
		const modules = {
			version: require("terser/package.json").version,
			minify() {},
			compress: { Compressor() {} },
			domprops: { domprops: [] },
			sourcemap: { SourceMap() {} },
			utils: { map_from_object() {}, map_to_object() {}, HOP() {} }
		};
		// Another release, whose module-private driver the phase cannot read.
		expect(driver.supports({ ...modules, version: "0.0.0" })).toBe(false);
		expect(driver.supports({ ...modules, minify: undefined })).toBe(false);
		// The pinned release, but a `minify` whose source is not the one pinned.
		expect(driver.supports(modules)).toBe(false);
	});

	it("should decline a terser whose unused-name dropping it does not know", () => {
		const unused =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "unused")
			);
		const modules = { common: {}, flags: {}, inference: {}, scope: {}, utils: {} };
		expect(unused.supports({ ...modules, ast: {} })).toBe(false);
		expect(
			unused.supports({
				...modules,
				ast: { AST_Scope: { prototype: { drop_unused() {} } } }
			})
		).toBe(false);
		// Every helper there, but a pass whose source is not the one pinned.
		const helper = () => {};
		expect(
			unused.supports({
				ast: { AST_Scope: { prototype: { drop_unused() {} } } },
				scope: { SymbolDef: helper },
				utils: {
					keep_name: helper,
					make_node: helper,
					map_add: helper,
					remove: helper,
					MAP: helper
				},
				common: {
					make_sequence: helper,
					maintain_this_binding: helper,
					is_empty: helper,
					is_ref_of: helper,
					can_be_evicted_from_block: helper
				},
				inference: { is_used_in_expression: helper },
				flags: { WRITE_ONLY: 1, UNUSED: 2 }
			})
		).toBe(false);
	});

	it("should decline a terser whose flow analysis it does not know", async () => {
		const reduce =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "reduce")
			);
		const modules = await loadSources();
		// Another release, whose module-private helpers the phase cannot read.
		expect(reduce.supports({ ...modules, version: "0.0.0" })).toBe(false);
		expect(reduce.supports({ ...modules, flags: {} })).toBe(false);
		// The pinned release, but a walk running the analysis that is not pinned.
		const ast = {
			...modules.ast,
			AST_Toplevel: { prototype: { reset_opt_flags() {} } }
		};
		expect(reduce.supports({ ...modules, ast })).toBe(false);
	});

	it("should decline a terser whose per-node print it does not know", () => {
		const print =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "print")
			);
		/**
		 * @param {object} prototype the node prototype's print methods
		 * @param {unknown=} MinifiedOutput the stream the output phase installed
		 * @returns {boolean} whether the phase fits
		 */
		const fits = (prototype, MinifiedOutput = class {}) =>
			print.supports({ ast: { AST_Node: { prototype } }, MinifiedOutput });
		/**
		 * @param {unknown} output the stream
		 * @returns {boolean} whether one was given
		 */
		function other(output) {
			return Boolean(output);
		}

		// Without the output phase there is no stream to print into.
		expect(fits({ print: other, _print: other }, undefined)).toBe(false);
		expect(fits({ print: other, _print: undefined })).toBe(false);
		// Already wrapped by something else.
		expect(fits({ print: () => {}, _print: other })).toBe(false);
		// A print terser rewrote.
		expect(fits({ print: other, _print: other })).toBe(false);
	});

	describe("correct phase", () => {
		it("should install", async () => {
			const { phases } = await load();
			expect(phases).toContain("correct");
		});

		it("should decline a terser it cannot read", () => {
			const correct = /** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "correct")
			);
			expect(correct.supports({ ast: {} })).toBe(false);
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
					const reference = await require("terser").minify(input, options);
					expect(uncorrected.code).toBe(reference.code);
					expect(runProgram(/** @type {string} */ (reference.code))).not.toBe(expected);
				} finally {
					corrections.enabled = true;
				}
			});
		}
	});
});

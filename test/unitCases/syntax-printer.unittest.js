"use strict";

// cspell:ignore fnames

const {
	FORMAT_DEFAULTS,
	load,
	PHASES
} = require("../../lib/javascript/syntax").printer;

/**
 * Sources chosen for the decisions the mangler makes: which scope hands out a
 * name, and which names it may not hand out.
 * @type {[string, string, EXPECTED_OBJECT?][]}
 */
const CASES = [
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
				const theirs = await reference.minify(
					{ "input.js": source },
					options()
				);
				expect(ours.code).toBe(theirs.code);
				expect(ours.map).toEqual(theirs.map);
			}
			const { code } = await minify(source, OUTPUT_OPTIONS[0]);
			expect(code).toMatchSnapshot();
		});
	}

	it("should decline a terser whose stream it does not know", () => {
		const output =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "output")
			);
		const utils = { defaults: () => ({}) };
		const unicode = new Proxy({}, { get: () => () => false });
		const ast = {
			AST_Node: { prototype: { _print() {}, print_to_string() {} } }
		};
		/**
		 * @param {(options?: object) => object} OutputStream a stream factory
		 * @returns {boolean} whether the phase fits it
		 */
		const fits = (OutputStream) =>
			output.supports({ ast, output: { OutputStream }, utils, unicode });
		/**
		 * @param {object=} defs the option set a rejection names
		 * @returns {never} always throws
		 */
		const rejectNaming = (defs) => {
			throw Object.assign(new Error("unsupported"), { defs });
		};

		expect(output.supports({ ast, output: {}, utils, unicode })).toBe(false);
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
});

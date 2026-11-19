"use strict";

const { fixture } = require("../../helpers/fixture");
const supportsOptionalChaining = require("../../helpers/supportsOptionalChaining");

// cspell:ignore binop, fnames, propmangle, fargs, domprops, argnames, nondeferred, loopcontrol, Defun, defun, NOINLINE, Funarg, unmangleable, Unmangleable, thedef, funs
// cspell:ignore fnames
// cspell:ignore argnames, bcatch, bfinally, argname, truenull
// cspell:ignore AAAWA MAAH EAAI EAAIA EAAGC ACAA IAAYC EAAWC IAAIC CAAI IAAK EAAE
// cspell:ignore endline, endcol, endpos, nlb, thedef, ymgsid, dgimsy, elta

const vm = require("vm");
const acorn = require("acorn");
const { estree } = require("../../helpers/javascriptParse");
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

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Decodes the first generated line of a source map's mappings.
 * @param {string} mappings the map's `mappings`
 * @returns {Map<number, [number, number]>} by generated column, the zero-based source line and column it maps to
 */
const decodeLine = (mappings) => {
	/** @type {Map<number, [number, number]>} */
	const segments = new Map();
	const fields = [0, 0, 0, 0, 0];
	for (const segment of mappings.split(";")[0].split(",")) {
		let field = 0;
		let value = 0;
		let shift = 0;
		for (const character of segment) {
			const digit = BASE64.indexOf(character);
			value |= (digit & 31) << shift;
			if ((digit & 32) !== 0) {
				shift += 5;
				continue;
			}
			fields[field++] += (value & 1) !== 0 ? -(value >> 1) : value >> 1;
			value = 0;
			shift = 0;
		}
		if (field >= 4) segments.set(fields[0], [fields[2], fields[3]]);
	}
	return segments;
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
	_SyntaxTree: SyntaxTree,
	readParsedTree
} = require("../../../lib/javascript/syntax-parser");

describe("JavaScript minifier printing a SyntaxTree", () => {
	it("should keep a case's `break` where no `;` before it prints", () => {
		const source = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-720");
		const { code } = minifyOnePass(source, {
			compress: {},
			mangle: { toplevel: false },
			format: { semicolons: false }
		});
		expect(code).toMatchSnapshot();
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const beautified = /** @type {{ code: string }} */ (
			new SourceProcessor().process(source, {
				mode: "beautify",
				compress: {},
				mangle: false
			})
		).code;
		expect(beautified).toContain("function e(v) {\nswitch (v) {");
		expect(beautified).toContain("function f(v) {\nswitch (v) {");
		expect(runProgram(beautified)).toBe(runProgram(source));
	});

	it("should compress in the one pass what a long input, the engine or the map decides", () => {
		// A literal read too far on stays where it is, the search for the read bounded.
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-what"), {
				compress: { toplevel: false },
				mangle: false
			}).code
		).toBe(`function f(p){var o=[p];${"g(),".repeat(3000)}h(o)}`);
		// A regexp source this engine rejects, as an older one rejects duplicate group names, stays unread.
		let readsDuplicateGroups = true;
		try {
			// eslint-disable-next-line prefer-regex-literals
			new RegExp("(?<a>x)|(?<a>y)");
		} catch (_err) {
			readsDuplicateGroups = false;
		}
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-706"), {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			}).code
		).toBe(
			readsDuplicateGroups
				? 'function f(){return"(?<a>x)|(?<a>y)"}'
				: "function f(){return/(?<a>x)|(?<a>y)/.source}"
		);
		// Converted to a string, it stays as it is too.
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-26"), {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			}).code
		).toBe(
			readsDuplicateGroups
				? 'function f(){return"/(?<a>x)|(?<a>y)/"}'
				: 'function f(){return""+/(?<a>x)|(?<a>y)/}'
		);
		// Past the 32767 groups V8 compiles, a source every V8 rejects stays unread too.
		const groups = "()".repeat(32768);
		let readsManyGroups = true;
		try {
			// eslint-disable-next-line prefer-regex-literals
			new RegExp(groups);
		} catch (_err) {
			readsManyGroups = false;
		}
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-748"), {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			}).code
		).toBe(
			readsManyGroups
				? `function f(){return"${groups}/${groups}/"}`
				: `function f(){return/${groups}/.source+/${groups}/}`
		);
		// A test printed without its `!` keeps where its names were in the map.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const mapped = /** @type {{ code: string, map: { names: string[] } }} */ (
			new SourceProcessor().process(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-707"),
				{
					mode: "minify",
					compress: { toplevel: false },
					mangle: false,
					source: "a.js"
				}
			)
		);
		expect(mapped.code).toMatchSnapshot();
		expect(mapped.map.names).toEqual(
			expect.arrayContaining(["a", "b", "c", "g", "x"])
		);
		// A brace dropped once printed moves the names after it back in the map.
		const unbraced = /** @type {{ code: string, map: { mappings: string } }} */ (
			new SourceProcessor().process(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-708"),
				{
					mode: "minify",
					compress: { toplevel: false },
					mangle: false,
					source: "a.js"
				}
			)
		);
		expect(unbraced.code).toMatchSnapshot();
		// cspell:disable-next-line
		expect(unbraced.map.mappings).toMatchSnapshot();
		// A case falling into the next keeps its test's place, its body mapping nothing.
		const merged = /** @type {{ code: string, map: { names: string[], mappings: string } }} */ (
			new SourceProcessor().process(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-751"),
				{
					mode: "minify",
					compress: { toplevel: false },
					mangle: false,
					source: "a.js"
				}
			)
		);
		expect(merged.code).toMatchSnapshot();
		expect(merged.map.names).toEqual(["f", "x", "zero", "one", "g", "two", "h"]);
		// cspell:disable-next-line
		expect(merged.map.mappings).toMatchSnapshot();
	});

	it("should map the expressions a for head joins, one printed past a cut `!` too", () => {
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const joined = /** @type {{ code: string, map: { names: string[], mappings: string } }} */ (
			new SourceProcessor().process(
				fixture("javascript", "minify-maps-expressions-joined-into-a-for-head"),
				{
					mode: "minify",
					compress: { toplevel: false },
					mangle: false,
					source: "a.js"
				}
			)
		);
		expect(joined.code).toMatchSnapshot();
		// What the function the head joins without its `!` reads keeps its names.
		expect(joined.map.names).toEqual(["f", "o", "h", "a", "arguments", "k"]);
		const segments = decodeLine(joined.map.mappings);
		// Each part maps where it was written, the loop to its own `for`.
		expect(
			["for(", "h()", "function", "a(", "k()", "o.x", "o.y"].map((part) => [
				part,
				segments.get(joined.code.indexOf(part, joined.code.indexOf("for(")))
			])
		).toEqual([
			["for(", [6, 1]],
			["h()", [1, 1]],
			["function", [2, 2]],
			["a(", [3, 2]],
			["k()", [5, 1]],
			["o.x", [6, 8]],
			["o.y", [6, 15]]
		]);
		// cspell:disable-next-line
		expect(joined.map.mappings).toMatchSnapshot();
	});

	it("should refuse an option it does not know, and a module statement off the top level", () => {
		expect(() => minifyOnePass(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"), { mangle: /** @type {EXPECTED_ANY} */ ({ nope: 1 }) })).toThrow(
			"`nope` is not a supported option"
		);
		expect(() => minifyOnePass(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"), { format: /** @type {EXPECTED_ANY} */ ({ nope: 1 }) })).toThrow(
			"`nope` is not a supported option"
		);
		// A script reads module syntax anywhere, which the scopes then refuse.
		expect(() =>
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-refuse-an-option-it-does-not"), { mangle: true })
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

	it("should forget what the last one-pass print found", () => {
		const source =
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-forget-what-the-last-one-pass");
		const unmangled = () =>
			minifyOnePass(source, { compress: {}, mangle: false }).code;
		const first = unmangled();
		minifyOnePass(source, {
			compress: { side_effects: false },
			mangle: {}
		});
		expect(unmangled()).toBe(first);
		expect(first).toMatchSnapshot();
	});

	it("should keep the parentheses a binary takes under a `!` of `!!`", () => {
		// Each returns `[<expression>]`, which the print is cut down to.
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, {
				compress: {},
				mangle: false
			}).code.slice(25, -2);
		for (const [source, expected] of [
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-parentheses-a-binary"), "!(e&6)"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-parentheses-a-binary-2"), "!(e+t)"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-parentheses-a-binary-3"), "!(e===t)"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-parentheses-a-binary-4"), "e&6?g:t"],
			// Read only for its truth elsewhere, `!!x` still prints as `x`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-parentheses-a-binary-5"), "e&6?t:g"]
		]) {
			expect(print(source)).toBe(expected);
		}
		for (const [source, value] of /** @type {[string, boolean[]][]} */ ([
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-parentheses-a-binary-6"), [false, true]],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-parentheses-a-binary-7"), [false, true]]
		])) {
			const { code } = minifyOnePass(source, {
				compress: {},
				mangle: false
			});
			expect([
				vm.runInNewContext(`${code}f(2,0)`),
				vm.runInNewContext(`${code}f(0,0)`)
			]).toEqual(value);
		}
	});

	it("should map what the one pass joins of templates and of alike branches", () => {
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		// What the joined templates printed maps to where it was read.
		const mapped = new SourceProcessor().process(
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-adding-to-a-template"),
			{ mode: "minify", compress: {}, mangle: false, source: "in.js" }
		);
		expect(mapped.code).toMatchSnapshot();
		expect(mapped.map).toEqual(
			expect.objectContaining({
				mappings: "AAAAA,EAAE,IAAIC,CAAI,IAAIC,IAAK,CAAI,IAAIC"
			})
		);
		// Printed from its text, the shared sequence still maps where it came from.
		const alike =
			/** @type {{ code: string, map: { mappings: string, names: string[] } }} */ (
				new SourceProcessor().process(
					fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-23"),
					{ mode: "minify", compress: {}, mangle: false, source: "a.js" }
				)
			);
		expect(alike.code).toMatchSnapshot();
		expect(alike.map.names).toEqual(expect.arrayContaining(["g", "h"]));
	});

	it("should read terser's compress options that name calls, globals and names", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, unknown>} */ compress = {}
		) => minifyOnePass(source, { compress, mangle: false }).code;
		// `drop_debugger` drops them unless turned off, where no list holds one too.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress"))).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-2"))).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress"), { drop_debugger: false })).toMatchSnapshot();
		// `drop_console` drops a call whole, what its arguments run with it.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-3"), { drop_console: true })).toMatchSnapshot();
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-4"), {
				drop_console: true
			})
		).toMatchSnapshot();
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-5"), { drop_console: ["log"] })
		).toMatchSnapshot();
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-6"), { drop_console: true })
		).toMatchSnapshot();
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-7"), { drop_console: true })
		).toMatchSnapshot();
		// Where no list holds it, it prints as the `undefined` it returns.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-8"), {
				drop_console: true
			})
		).toMatchSnapshot();
		// Where a unary cannot stand, it is grouped.
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-9"),
				{ drop_console: true }
			)
		).toMatchSnapshot();
		// So is one called through `call` or `apply`.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-10"), {
				drop_console: true
			})
		).toMatchSnapshot();
		// As terser walks a chain to its root, one on a `console` member goes too, but `bind` makes a function.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-24"), {
				drop_console: true
			})
		).toMatchSnapshot();
		// A list names the member of `console` the chain starts at.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-25"), {
				drop_console: ["log"]
			})
		).toMatchSnapshot();
		// `pure_funcs` marks the calls it names pure, by how the callee is written.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-11"), {
				pure_funcs: ["foo", "a.b.c"]
			})
		).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-12"), { pure_funcs: ["foo"] })).toMatchSnapshot();
		// `global_defs` replaces a global nothing sets with a primitive value.
		const defs = {
			global_defs: { DEBUG: false, VERSION: "1.2", "@code": "x", O: {} }
		};
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-13"), defs)).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-14"), defs)).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-15"), defs)).toMatchSnapshot();
		// A shorthand prints its key and the value.
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-16"), {
				compress: defs,
				mangle: false,
				ecma: 2015
			}).code
		).toMatchSnapshot();
		// A key with dots names what is read off a global.
		const nested = {
			global_defs: { "process.env.NODE_ENV": "production", "env.DEBUG": 0 }
		};
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-17"),
				nested
			)
		).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-18"), nested)).toMatchSnapshot();
		// A number a sign or point would join to what is around it is grouped.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-19"), { global_defs: { V: -1 } })
		).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-20"), { global_defs: { V: -0 } })).toMatchSnapshot();
		// `top_retain` keeps the top-level names it lists, a pattern or a test keeps.
		const top = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-21");
		expect(print(top, { toplevel: true })).toMatchSnapshot();
		expect(print(top, { toplevel: true, top_retain: "foo, bar" })).toMatchSnapshot();
		expect(print(top, { toplevel: true, top_retain: ["bar"] })).toMatchSnapshot();
		expect(print(top, { toplevel: true, top_retain: /^f/g })).toMatchSnapshot();
		expect(
			print(top, {
				toplevel: true,
				top_retain: (/** @type {{ name: string }} */ definition) =>
					definition.name === "bar"
			})
		).toMatchSnapshot();
		// It implies `toplevel` where that is not given, and keeps a name inlined.
		expect(print(top, { top_retain: "foo" })).toMatchSnapshot();
		expect(print(top, { top_retain: "foo", toplevel: false })).toMatchSnapshot();
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-22"), { toplevel: true, top_retain: "foo" })
		).toMatchSnapshot();
		// `keep_infinity` prints `Infinity` as written.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-23"))).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-23"), { keep_infinity: true })).toMatchSnapshot();
	});

	it("should keep a named function a direct eval in a class or function it returns reads", () => {
		const sources = [
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-named-function-a"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-named-function-a-2"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-named-function-a-3")
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
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source"),
				{ mode: "minify", ...options, wrap: "lib", source: "a.js" }
			)
		);
		expect(wrapped.code).toMatchSnapshot();
		// Only the source's own names map, from its second line.
		expect(wrapped.map.names).toEqual(["exports", "longName", "g"]);
		expect(wrapped.map.mappings).toMatchSnapshot();
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-2"), {
				...options,
				enclose: "y:7"
			}).code
		).toMatchSnapshot();
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-3"), { ...options, enclose: true }).code
		).toMatchSnapshot();
		// `enclose` goes around `wrap`; a hashbang, no longer first, goes.
		const bare = { compress: false, mangle: false };
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-4"), {
				...bare,
				wrap: "lib",
				enclose: "window,undefined:window"
			}).code
		).toMatchSnapshot();
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-5"), { ...bare, enclose: true })
				.code
		).toMatchSnapshot();
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-each-source-with-names-111"), { ...bare, wrap: "lib" }).code
		).toMatchSnapshot();
	});

	it("should print alone the comments it keeps, however they are chosen", () => {
		const bare = { compress: false, mangle: false };
		const print = (/** @type {string} */ source, /** @type {EXPECTED_OBJECT} */ format) =>
			minifyOnePass(source, { ...bare, format }).code;
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it"), {})).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-2"), {})).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-3"), {})).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-4"), { comments: false })).toMatchSnapshot();
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-5"), {
				comments: false,
				preserve_annotations: true
			})
		).toMatchSnapshot();
		// A callback is asked only as each comment prints.
		/** @type {string[]} */
		const asked = [];
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-6"), {
				comments: (/** @type {unknown} */ _node, /** @type {{ value: string }} */ comment) => {
					asked.push(comment.value);
					return /keep/.test(comment.value);
				}
			})
		).toMatchSnapshot();
		expect(asked).toEqual([" drop ", " keep2 ", " keep "]);
		// A global pattern is tested only as each prints, its `lastIndex` moving.
		const pattern = /keep/g;
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-7"), { comments: pattern })
		).toMatchSnapshot();
		expect(pattern.lastIndex).toBe(0);
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-7"), { comments: /keep/y })
		).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-8"), {})).toMatchSnapshot();
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-9"), { comments: "/keep/g" })).toMatchSnapshot();
		expect(() => print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-10"), { nonsense: 1 })).toThrow(
			"`nonsense` is not a supported option"
		);
	});

	it("should keep the names a global pattern keeps, however often it is asked", () => {
		const pattern = /keep/g;
		const { code } = minifyOnePass(
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-names-a-global"),
			{ compress: {}, mangle: { keep_fnames: pattern }, keep_fnames: pattern, toplevel: true }
		);
		expect(code).toMatchSnapshot();
		expect(pattern.lastIndex).toBe(0);
	});

	it("should print a part a node prints as without the parentheses it took as that node's operand", () => {
		const source = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-kept-part-as-its-place-takes");
		const expected = minifyOnePass(source, { compress: {}, mangle: false }).code;
		expect(expected).toMatchSnapshot();
		// Placed without the parentheses, the parts still map where they came from.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const mapped =
			/** @type {{ code: string, map: { names: string[] } }} */ (
				new SourceProcessor().process(source, {
					mode: "minify",
					compress: {},
					mangle: false,
					source: "a.js"
				})
			);
		expect(mapped.code).toBe(expected);
		expect(mapped.map.names).toEqual(expect.arrayContaining(["g", "h", "y"]));
		for (const [input, output, options] of /** @type {[string, string, EXPECTED_OBJECT?][]} */ ([
			// Where the items before it go, what opens the statement takes them;
			// after one left standing, it needs none.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as"), "x,{a:g()}.b;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-2"), "(function(){g()})(),x;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-3"), "x={k:()=>1,[()=>1]:1},y=[()=>1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-4"), "x=(a||f(1)(2),longName);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-5"), "g(),h();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-6"), "g(),h();"],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-7"),
				"export function t(){return[new function(x){if(x)return{b:9}}(1),new F(g()),2]}",
				{ sourceType: "module" }
			],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-8"), "{\nf();\n}", { mode: "beautify", compress: false }]
		])) {
			expect(
				minifyOnePass(input, { compress: {}, mangle: false, ...options }).code
			).toBe(output);
		}
	});

	it("should keep a comment before a value from breaking the line after `return` or `throw`", () => {
		const all = { compress: {}, mangle: true, format: { comments: "all" } };
		for (const [source, expected] of [
			// An `if` printing as `return t?a:b` takes its test's comments before `return`.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value"),
				"function h(e){//c\nreturn e?1:2}console.log(h(0),h(1));"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value-2"),
				"function h(c){\n/*c\n*/\nreturn c.x?c:2}console.log(h({x:1}).x,h({}));"
			],
			// A `new` printing as a call opens with its callee, whose comments go first.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value-3"), '//c\nthrow Error("x");'],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value-4"),
				'function f(){//c\nreturn Error("x")}console.log(f().message);'
			]
		]) {
			const { code } = minifyOnePass(source, all);
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		// A license comment is kept by default, so it breaks the line alike.
		const source =
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value-5");
		expect(
			runProgram(minifyOnePass(source, { compress: {}, mangle: true }).code)
		).toBe("2 1");
	});

	it("should escape a template's text as one run, its folded parts included", () => {
		for (const [name, expected] of [
			// A `$` before a folded `{` stays text, not a substitution.
			["", "console.log(\"%s\",`${globalThis.name} has \\${globalThis.flag=1} left`,globalThis.flag);"],
			["-2", "console.log(`${globalThis.name} has \\${x} and a\\${y} and b\\${z}`);"],
			// Nor do a `\0` and a folded digit, `</script` or `<!--` split across parts.
			["-3", "console.log(`${globalThis.name} \\x001 <\\/script> \\x3c!--`);"],
			// A template within joins in place unless a `$` it ends with meets a folded `{`.
			["-4", "console.log(`${globalThis.name} a${`b${globalThis.name}$`}{z} cd${globalThis.name}e`);"]
		]) {
			const source = fixture("javascript", `javascript-minifier-printing-a-syntax-tree-should-escape-a-template-s-text-as-one-run${name}`);
			const { code } = minifyOnePass(source, { compress: {}, mangle: true });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should print a folded argument a parameter's read takes without the parentheses it no longer needs", () => {
		for (const [name, expected, compress] of /** @type {[string, string, EXPECTED_OBJECT?][]} */ ([
			["", "export const value=URL===URL;"],
			["-2", "export const value=-globalThis.a;"],
			// Left unfolded, a conditional keeps its own parentheses.
			["-2", "export const value=-(1?globalThis.a:0);", { dead_code: false }],
			["-3", "export const value=-globalThis.a;"],
			// A sequence kept prints in its own parentheses alone.
			["-4", "export const value=-(globalThis.a,globalThis.b);"]
		])) {
			const source = fixture("javascript", `javascript-minifier-printing-a-syntax-tree-should-print-a-folded-argument-without-its-parentheses${name}`);
			const options = { compress: compress || {}, mangle: true, module: true };
			const { code } = minifyOnePass(source, options);
			expect(code).toBe(expected);
			expect(minifyOnePass(code, options).code).toBe(code);
		}
	});

	it("should print as `quote_keys`, `inline_script`, `inlinesNames` and import phases ask", () => {
		for (const [source, options, expected] of /** @type {[string, EXPECTED_OBJECT, string][]} */ ([
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline"), { format: { quote_keys: true } }, 'var o={"a":1};console.log(o.a);'],
			// A shorter exponent moves the fraction's digits before it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-2"), {}, "console.log(15e-8,2.25e30);"],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-3"),
				{ module: true },
				'import defer*as o from"./x.js";console.log(o);'
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-4"),
				{ module: true },
				'console.log(import.defer("./x"),import.source("./y"));'
			],
			// A directive spelled with escapes stays as written.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-5"), { format: { inline_script: false } }, "'\\x75se strict';console.log(1);"],
			// An escaped `\\<` gives its backslash up to the `\\x3c` replacing it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-6"), {}, "'\\x3c!--';console.log(1);"],
			// A `join` keeps apart only pieces that meet as `</script`, `<!--` or `-->`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-10"), {}, "f(`<D s={${p.s}} />\\nOnly ${m}.\\n\\nEnd.`),f([`a<`,`/script>${x}`].join(\"\")),f([`a<!`,`-- ${x}`].join(\"\")),f([`a--`,`> ${x}`].join(\"\")),f(`a<${x}/script>`),f([`a${x}<`,\"/script \"].join(\"\")),f(`\\x3c!-- ${x}b`),f(`a${x}\\x3c!-- b`),f(`a<!${--x}${y}`),f(`a\\x3c!--${x}`),f([`a--!`,`> ${x}`].join(\"\")),f([\"</scr\",`ipt>${x}!`,`${y}`].join(\"\")),f([x+\"</script\",\"/\"].join(\"\"));"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-10"), { format: { inline_script: false } }, "f(`<D s={${p.s}} />\\nOnly ${m}.\\n\\nEnd.`),f(`a<${`/script>${x}`}`),f(`a<!${`-- ${x}`}`),f(`a--> ${x}`),f(`a<${x}/script>`),f(`${`a${x}<`}/script `),f(`<!-- ${x}b`),f(`a${x}<!-- b`),f(`a<!${--x}${y}`),f(`a<!--${x}`),f(`a--!> ${x}`),f(`</script>${x}!${y}`),f(x+\"</script/\");"],
			// A reserved list may be a set, as terser reads it; anything else reserves nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-7"), { mangle: { reserved: new Set(["a"]) } }, "function f(f){return f}f(1);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-7"), { mangle: { reserved: "a" } }, "function f(a){return a}f(1);"],
			// Names printed in their parents' text, as a walk that skips them asks.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-8"),
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
			new SourceProcessor().process(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-9"), {
				mode: "minify",
				...inlinesNames,
				source: "in.js"
			})
		);
		expect(mapped.map).toEqual(expect.objectContaining({ names: ["a", "b"] }));
	});

	describe("mangling properties in one pass", () => {
		const PROPERTY_SOURCES = [
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-2"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-3"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-4"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-5"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-6"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-7"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-8"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-9"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-10")
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

		it("should keep a computed key kept quoted together with its reads", () => {
			const { code } = minifyOnePass(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-14"),
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
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-15"),
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-16")
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
			const source = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-17");
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
				fixture("javascript", "javascript-source-processor-printing-should-print-the-whole-source-while"),
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
							fixture("javascript", "javascript-source-processor-printing-should-refuse-a-walk-a-visitor-starts"),
							[],
							undefined
						);
					}
				})
				.process(fixture("javascript", "javascript-source-processor-printing-should-refuse-a-walk-a-visitor-starts"), {})
		).toThrow("process() is already running");
	});

	it("should print one source after another, and a source anew after a parse error", () => {
		const processor = new SourceProcessor();
		expect(processor.process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and"), { mode: "minify" }).code).toMatchSnapshot();
		expect(() => processor.process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and-a"), { mode: "minify" })).toThrow(
			/Unexpected token/
		);
		expect(
			processor.process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and-2"), { mode: "minify" }).code
		).toMatchSnapshot();
	});

	it("should map each node's output to the source's", () => {
		const result = new SourceProcessor().process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and"), {
			mode: "minify",
			source: "in.js"
		});
		expect(result.code).toMatchSnapshot();
		// `a` at 0:0, named, and `1` from column 4 to column 2.
		expect(result.map).toEqual(
			expect.objectContaining({
				sources: ["in.js"],
				names: ["a"],
				mappings: "AAAAA,EAAI"
			})
		);		// A name read twice is given once.
		expect(
			new SourceProcessor().process(fixture("javascript", "javascript-source-processor-printing-should-map-each-node-s-output-to-the"), {
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
});

describe("JavaScript minifier mangling a SyntaxTree", () => {
	it("should read its own tree after a name counter starts another parse", () => {
		const { parseProgram } = require("../../../lib/javascript/syntax").parser;
		const letters = "abcdefghij";
		let resets = 0;
		const { code } = minifyOnePass(
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-read-its-own-tree-after-a-name"),
			{
				sourceType: "script",
				mangle: {
					nthIdentifier: {
						get: (n) => letters[n],
						reset: () => {
							resets++;
							parseProgram(fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-read-its-own-tree-after-a-name-2"), 0, {});
						},
						consider: () => {},
						sort: () => {}
					}
				}
			}
		);
		expect(resets).toBe(1);
		expect(code).toMatchSnapshot();
	});

	it("should name every private name after a name source starts another parse", () => {
		const { isWalkingSyntaxTree } = require("../../../lib/javascript/syntax-parser");
		const { parseProgram } = require("../../../lib/javascript/syntax").parser;
		const letters = "abcdefghij";
		const { code } = minifyOnePass(
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-read-its-own-tree-after-a-name"),
			{
				sourceType: "script",
				mangle: {
					nthIdentifier: {
						get: (n) => {
							if (!isWalkingSyntaxTree()) {
								parseProgram(fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-read-its-own-tree-after-a-name-2"), 0, {});
							}
							return letters[n];
						}
					}
				}
			}
		);
		expect(code).toMatchSnapshot();
	});

	it("should keep a sloppy block's function in its block where a lexical name would clash, in the one pass", () => {
		const source = fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-keep-a-sloppy-block-s-function");
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

	it("should run as the source runs under ie8 or safari10 in the one pass", async () => {
		const sources = [
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-2"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-3"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-4"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-5"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-6"),
			// Moved into the catch, the arrow would read the catch's `e`.
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-7"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-8"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-9"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-10"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-11")
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
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where-2"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where-3"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where-4"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where-5")
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
			/** @type {EXPECTED_ANY} */ (estree(fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-refuse-a-node-its-scope")))
		);
		const types = Uint8Array.from(tree._types);
		types[tree.field(0, Field.body, program)] = 255;
		readParsedTree(tree, fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-refuse-a-node-its-scope"));
		expect(() =>
			analyzeMinifierTree(program, types, {}, () => {
				throw new Error("unreachable");
			})
		).toThrow("The minifier's scope analysis cannot read a node of type 255");
	});

	it("should read a `with`, a loop and a catch where no option asks for more", () => {
		const tree = new SyntaxTree();
		const source = fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-read-a-with-a-loop-and-a");
		const program = tree.addEstree(
			/** @type {EXPECTED_ANY} */ (estree(source))
		);
		readParsedTree(tree, source);
		const analysis = analyzeMinifierTree(
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

const INPUT_MAP = {
	version: 3,
	sources: ["input.js"],
	names: [],
	mappings: ""
};

describe("jsMinify", () => {
	it("takes the minimizer options as optional", async () => {
		const { code } = await jsMinify({ "a.js": fixture("javascript", "js-minify-takes-the-minimizer-options-as-optional") }, undefined);
		expect(code).toMatchSnapshot();
	});

	it("should cache the names it hands out across assets", async () => {
		const nameCache = {};
		const result = await jsMinify(
			{ "cached.js": fixture("javascript", "js-minify-should-cache-the-names-it-hands-out-across-assets") },
			INPUT_MAP,
			{ toplevel: true, nameCache },
			false
		);
		expect(result.code).toMatchSnapshot();
		expect(typeof result.map).toBe("object");
		expect(nameCache).toEqual({ vars: { props: {} } });
		const shared = {};
		const options = { compress: false, toplevel: true, nameCache: shared };
		const first = await jsMinify(
			{ "first.js": fixture("javascript", "js-minify-should-cache-the-names-it-hands-out-across-assets-2") },
			undefined,
			{ ...options },
			false
		);
		const second = await jsMinify(
			{ "second.js": fixture("javascript", "js-minify-should-cache-the-names-it-hands-out-across-assets-3") },
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

	it("should defer invalid comment patterns until a comment is tested", async () => {
		// Exercise a malformed runtime pattern outside the published type union.
		const invalidPattern = /** @type {EXPECTED_ANY} */ ("[");
		const options = { format: { comments: invalidPattern } };
		const input = { "plain.js": fixture("javascript", "js-minify-should-defer-invalid-comment-patterns-until-a-comment-is-tested") };
		expect(
			await jsMinify(input, undefined, options, { condition: invalidPattern })
		).toEqual(
			await jsMinify(input, undefined, { format: { comments: false } }, false)
		);
		const commented = { "commented.js": fixture("javascript", "js-minify-should-defer-invalid-comment-patterns-until-a-comment-is-tested-2") };
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

describe("one-pass minify of statement sequences", () => {
	it("should run what a converging `switch` tests in parentheses", () => {
		for (const [source, expected] of [
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-run-what-a-converging-switch-tests"), "x(),y();"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-run-what-a-converging-switch-tests-2"), "x(),a,y();"]
		]) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
			expect(code).toBe(expected);
			expect(runProgram(`var a=1;function x(){console.log(1)}function y(){console.log(2)}${code}`)).toBe("1\n2");
		}
	});

	it("should fold a labeled `switch` of a known value", () => {
		const cases = [
			[
				fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-labeled-switch-of-a-known"),
				"function s(a,c){a:{a();for(;;)if(c())break a;c();a();c()}}"
			],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-labeled-switch-of-a-known-2"), "function s(c,s){c(),s()}"],
			// A label needs a statement, and an unlabeled `break` its `switch`.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-labeled-switch-of-a-known-3"), "function s(c){c:switch(1){case 2:c()}}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-labeled-switch-of-a-known-4"), "function s(i,a){i:switch(1){case 1:i();if(a())break;if(i())break i;a()}}"]
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
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known"), "function s(c,s,a){c(),a(),s()}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-2"), "function s(a,c,e){a(),c(),e()}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-3"), "function s(c,s,w){c(),w(),s()}"],
			// A comment on what it tests prints with it.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-4"), "function s(c,s,w){/*! c */c(),42,w()}"],
			// What it runs first joins only expressions, before a match it ran
			// a case's test, and running nothing else it stays.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-5"), "function s(c,i,s){switch(c(),42){case 42:if(i)s()}}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-6"), "function s(c,s,w){switch(c(),42){case s():w()}}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-7"), "function s(c,s){switch(c(),42){case 13:s()}}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-8"), "function s(c,s){switch(c(),s()){case 13:s()}}"]
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

	it("should print a binary expression folding to an infinity or `NaN` as `1/0`, `-1/0` or `NaN`", () => {
		// A division needs the parentheses its place gave the expression; `**` binds tighter. `NaN` prints as the global's name, `0/0` only where `with`, `eval` or a binding may take it.
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-a-binary-expression-folding");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toMatchSnapshot();
		expect(runProgram(`function f(){return 1}${code}`)).toBe(
			runProgram(`function f(){return 1}${source}`)
		);
		// Where a scope binds `NaN`, it prints as the division.
		const shadowed = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-a-binary-expression-folding-2");
		expect(
			minifyOnePass(shadowed, { compress: {}, mangle: false }).code
		).toMatchSnapshot();
	});

	it("should parenthesize a fold or element read keeping an infinity, which prints as a division", () => {
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-parenthesize-a-fold-or-element");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toMatchSnapshot();
		expect(() => acorn.parse(code, { ecmaVersion: "latest" })).not.toThrow();
		expect(runProgram(`var a;${code}`)).toBe(runProgram(`var a;${source}`));
	});
});

describe("one-pass minify of reads and calls on literals", () => {
	it("should drop the trailing parameters nothing reads under `keep_fargs: false`", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-the-trailing");
		const { code } = minifyOnePass(source, { compress: { keep_fargs: false }, mangle: false });
		// A setter's one parameter, `arguments` and `eval` keep theirs.
		expect(code).toMatchSnapshot();
		// By default they stay.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-the-trailing-2"), { compress: {}, mangle: false }).code).toMatchSnapshot();
	});

	it("should keep only what the sides of an unread loose equality run", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-sides");
		// A relation throws on a symbol, which `==` does not: it stays.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toMatchSnapshot();
		// An object's `valueOf` may run where conversions are not taken as pure.
		expect(minifyOnePass(source, { compress: { pure_conversions: false }, mangle: false }).code).toMatchSnapshot();
	});

	it("should drop only the reads `pure_getters` takes as running nothing", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-only-the-reads");
		// "strict", the default: a read of what may be nullish or hold a getter stays whole.
		const strict = minifyOnePass(source, { compress: {}, mangle: false }).code;
		expect(strict).toMatchSnapshot();
		expect(minifyOnePass(source, { compress: { pure_getters: "strict" }, mangle: false }).code).toBe(strict);
		// true: only a read of what may be nullish stays, as its object alone, without the member's parentheses.
		expect(minifyOnePass(source, { compress: { pureGetters: true }, mangle: false }).code).toMatchSnapshot();
		// false: every read but an optional one stays; a literal's `length` folds to a constant first.
		expect(minifyOnePass(source, { compress: { pure_getters: false }, mangle: false }).code).toMatchSnapshot();
		// A write target, a callee, `super`, a logical assignment, a nullish branch, a key running code and an optional read keep the member; what opens ambiguously keeps its parentheses.
		const kept = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-only-the-reads-2");
		expect(minifyOnePass(kept, { compress: { pure_getters: true }, mangle: false }).code).toMatchSnapshot();
		expect(minifyOnePass(kept, { compress: { pure_getters: true, side_effects: false }, mangle: false }).code).toBe(minifyOnePass(kept, { compress: { side_effects: false }, mangle: false }).code);
		const program = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-only-the-reads-3");
		const { code } = minifyOnePass(program, { compress: { pure_getters: true }, mangle: false });
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(program));
		// A name known to hold `null` or `undefined` keeps its read, and a key converting by running code keeps its member where conversions run code.
		const nullish = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-only-the-reads-4");
		const converted = minifyOnePass(nullish, { compress: { pure_getters: true, pure_conversions: false, toplevel: true }, mangle: false }).code;
		expect(converted).toMatchSnapshot();
		expect(runProgram(converted)).toBe(runProgram(nullish));
		expect(minifyOnePass(nullish, { compress: { pure_getters: true, toplevel: true }, mangle: false }).code).toMatchSnapshot();
		// A name printing as the value folded into it keeps the read of that value.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-only-the-reads-5"), { compress: { pure_getters: true, toplevel: true }, mangle: false }).code).toMatchSnapshot();
		// So does one a sequence, a branch, a logical side or an assignment gives.
		const given = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-only-the-reads-6");
		const throwing = minifyOnePass(given, { compress: { pure_getters: true, toplevel: true }, mangle: false }).code;
		expect(throwing).toMatchSnapshot();
		expect(runProgram(throwing)).toBe(runProgram(given));
	});

	it("should print a number constant where a member reads it, as a name would print", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-print-a-number");
		const { code } = minifyOnePass(source, { compress: { toplevel: true }, mangle: false });
		// A number opening with `0` would print parenthesized there: its name stays.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep only what the computed keys and values of an unread object run", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the");
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toMatchSnapshot();
		// A key may convert an object running its `toString` where conversions are not taken as pure.
		expect(minifyOnePass(source, { compress: { pure_conversions: false }, mangle: false }).code).toMatchSnapshot();
	});

	it("should keep only what the computed keys of an unread class run", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-2");
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toMatchSnapshot();
		// A static block, `extends` or key that may name `prototype`, or a key reading the class's own name, keeps it; a static value prints after the keys.
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-3"), { compress: {}, mangle: false }).code
		).toMatchSnapshot();
		// A direct `eval` in a key may read the class's name too.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-4"), { compress: {}, mangle: false }).code).toMatchSnapshot();
		// Beside a key that runs code, a static `prototype` keeps the class too, as making it throws.
		const throwing = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-5");
		expect(minifyOnePass(throwing, { compress: {}, mangle: false }).code).toMatchSnapshot();
		const program = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-6");
		expect(runProgram(minifyOnePass(program, { compress: {}, mangle: false }).code)).toBe("TypeError\nTypeError\nTypeError");
	});

	it("should fold a value read only by its null check into the optional chain it prints as", () => {
		const source =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-read-only-by");
		// A member called bare would bind its object as `this`, so it stays apart.
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2020 }).code).toMatchSnapshot();
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2019 }).code).toMatchSnapshot();
		// Kept apart: a value printing in parentheses before `?.`, another branch
		// than `undefined`, a chain on another name, another test, no chain.
		const kept =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-read-only-by-2");
		expect(minifyOnePass(kept, { compress: {}, mangle: false, ecma: 2020 }).code).toMatchSnapshot();
		// A value printing as a constant: the test picks, or `?.` takes it whole.
		const constant =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-read-only-by-3");
		const constantCode = minifyOnePass(constant, { compress: {}, mangle: false, ecma: 2020 }).code;
		expect(constantCode).toMatchSnapshot();
		const program = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-read-only-by-4");
		const code = minifyOnePass(program, { compress: {}, mangle: false, ecma: 2020 }).code;
		// What an engine without `?.` cannot parse runs only where it can.
		if (supportsOptionalChaining()) {
			expect(runProgram(code)).toBe(runProgram(program));
			expect(runProgram(`${constantCode}console.log(i(),j(),q(),r())`)).toBe(runProgram(`${constant}console.log(i(),j(),q(),r())`));
		}
	});

	it("should fold an update into the `return` or `throw` giving the name it sets", () => {
		const source =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the");
		// `x++` a declarator took gives the old value still; a value that runs
		// code, or a read deeper in the value, stays apart, as it gzips bigger.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toMatchSnapshot();
		// A script's global may be an accessor of the global object; a module's is not.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the-2"), { compress: {}, mangle: false }).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the-2"), { compress: {}, mangle: false, module: true }).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the-3"), { compress: {}, mangle: false, format: { ascii_only: true } }).code).toMatchSnapshot();
		const program = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the-4");
		expect(runProgram(minifyOnePass(program, { compress: {}, mangle: false }).code)).toBe("2 9 4");
	});

	it("should merge the calls of a conditional differing in what one spread spreads", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-merge-the-calls-of-a");
		// A spread against a plain argument, or one printing as its items, stays.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toMatchSnapshot();
	});

	it("should merge the calls an `if` returns or throws from both branches", () => {
		const source =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-merge-the-calls-an-if");
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toMatchSnapshot();
		// Parts longer than what the branches share, or spreads printing as their
		// items, stay apart.
		const kept =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-merge-the-calls-an-if-2");
		expect(minifyOnePass(kept, { compress: {}, mangle: false }).code).toMatchSnapshot();
		const program =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-merge-the-calls-an-if-3");
		const { code } = minifyOnePass(program, { compress: {}, mangle: false });
		expect(code).toContain("return f(x?2:1)");
		expect(runProgram(code)).toBe("1 2 3");
	});

	it("should fold a value running nothing into the compound assignment after it", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-running");
		// A value running code would run after the target is read.
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2021 }).code).toMatchSnapshot();
		// A global's read may run a getter, which could set the value first.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-running-2"), { compress: {}, mangle: false }).code).toMatchSnapshot();
	});

	it("should keep a null check whose chain a call, `delete` or tag reads as a reference", () => {
		// `(x?.m)()` would call `m` on `x`, and `delete(x?.m)` delete it.
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-a-null-check-whose");
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2020 }).code).toMatchSnapshot();
	});

	it("should drop a `for`'s own declarator nothing reads", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-a-for-s-own");
		// A value running code stays, as does a constant its reads print.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toMatchSnapshot();
	});

	it("should print a kept global constant's value where it reads shorter", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-print-a-kept-global");
		// A shorthand keeps the name it keys, and a name read three times stays, as it measured smaller once gzipped.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toMatchSnapshot();
	});

	it("should lift a computed key reading a constant as the key it names", () => {
		for (const [source, toplevel, expected] of /** @type {[string, boolean, string][]} */ ([
			// Inlined, the read prints as the plain key; `__proto__` and a class's `constructor` mean something else bare.
			[fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-lift-a-computed-key"), true, 'class X{FOO=1;static get FOO(){return 2}["constructor"](){}}console.log(new X,{FOO:1,["__proto__"]:2,12:3});'],
			// Kept for its size, it lifts only where the key prints shorter than the name in brackets.
			[fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-lift-a-computed-key-2"), false, 'const prop="_foo",x="FOO";console.log({_foo:1,[x]:2});']
		])) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: false, toplevel });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});
});

describe("one-pass minify, family I round 6", () => {
	const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };

	it("should read a parameter for a `var` alias a function made after it reads", () => {
		const source = fixture("javascript", "one-pass-i3-1");
		const { code } = minifyOnePass(source, options);
		// A declared function, or one made before the alias is set, may run while it is still `undefined`.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold a value past an array literal of constants and names nothing writes", () => {
		const source = fixture("javascript", "one-pass-i3-2");
		const { code } = minifyOnePass(source, options);
		// A spread iterates and a call runs code, so the value stays before them.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family K round 6", () => {
	const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };

	it("should read a name a null check assigns as its optional chain", () => {
		const source = fixture("javascript", "one-pass-K3-1");
		const { code } = minifyOnePass(source, options);
		// Babel's `(n=a.x)==null?void 0:n.y`, `===null||n===void 0` too; a `??` would leave `n` set and unread.
		expect(code).toMatchSnapshot();
		// Node 10 cannot parse the `?.` the output prints.
		if (supportsOptionalChaining()) expect(runProgram(code)).toBe(runProgram(source));
		// Before ES2020 there is no `?.`.
		expect(
			minifyOnePass(source, { ...options, compress: { ecma: 2019 }, ecma: 2019 })
				.code
		).toContain("return(n=a.x)==null?void 0:n.y()");
	});

	it("should keep a null check whose chain reads another name, a global, a `with`'s or `eval`", () => {
		const source = fixture("javascript", "one-pass-K3-2");
		expect(minifyOnePass(source, options).code).toMatchSnapshot();
	});

	it("should drop the `!!` of a boolean `&&` or `||` where its parentheses go too", () => {
		const source = fixture("javascript", "one-pass-K3-3");
		// Beside a `,`, under another `&&` or an operator, the parentheses stay and so does `!!`.
		expect(minifyOnePass(source, options).code).toMatchSnapshot();
	});

	it("should merge the calls of a built-in's member a pure test picks between", () => {
		const source = fixture("javascript", "one-pass-K3-4");
		const { code } = minifyOnePass(source, options);
		// A local object's member may be a getter, a test may run code, and a computed key stays.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a script's global a null check assigns, which may be an accessor", () => {
		const source = fixture("javascript", "one-pass-minify-family-k-round-6-should-keep-a-script-s-global-a-null-check");
		expect(minifyOnePass(source, options).code).toBe(source);
		expect(minifyOnePass(source, { ...options, module: true }).code).toMatchSnapshot();
	});
});

describe("one-pass minify, family L round 6", () => {
	it("should fold a `var` set after calls that reach no function of the body reading it", () => {
		const source = fixture("javascript", "one-pass-l3-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// An `if` calling `read` runs it before `value` is set, as a function or class handed to a call may; a global's call, a parameter or `eval` reaches none.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family J round 6", () => {
	it("should drop an unread `pure_funcs` call, keeping what its arguments run", () => {
		const options = { compress: { ecma: 2020, pure_funcs: ["debug"] }, ecma: 2020, mangle: false };
		// terser's `pure_funcs`: the call goes, a call or a member read in its arguments stays; a returned one stays whole.
		expect(minifyOnePass(fixture("javascript", "one-pass-j3-1"), options).code).toMatchSnapshot();
	});

	it("should guard what follows a run of `if`s leaving alike by their negated tests", () => {
		const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };
		const source = fixture("javascript", "one-pass-j3-2");
		const { code } = minifyOnePass(source, options);
		// Tests join negated where a second pass would push the `!` into them, `false||!a` and `b<2` among them; a run guarding several statements, or ending its function, stays.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// A test folding to a `!` drops it where what it negates needs no parentheses, as a comparison before `&&`; an assignment keeps it.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-j-round-6-should-guard-what-follows-a-run-of-if-s-leaving"), options).code).toMatchSnapshot();
	});
	it("should keep the arguments of an unread pure call in a loop head together", () => {
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-family-j-round-6-should-keep-the-arguments-of-an-unread-pure-cal"), { compress: {}, mangle: false }).code
		).toMatchSnapshot();
	});
});

describe("one-pass minify, round 6 review", () => {
	const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };

	it("should keep an alias of a `let` or `const` its declarator reads before the name is set", () => {
		const source =
			fixture("javascript", "one-pass-minify-round-6-review-should-keep-an-alias-of-a-let-or-const-its");
		expect(minifyOnePass(source, options).code).toMatchSnapshot();
		const program =
			fixture("javascript", "one-pass-minify-round-6-review-should-keep-an-alias-of-a-let-or-const-its-2");
		expect(runProgram(minifyOnePass(program, options).code)).toBe(
			runProgram(program)
		);
	});

	it("should keep an alias of a name a `switch` case sets, which a later case may enter past", () => {
		const source =
			fixture("javascript", "one-pass-minify-round-6-review-should-keep-an-alias-of-a-name-a-switch-case-sets");
		const { code } = minifyOnePass(source, options);
		expect(code).toContain("let a=x");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should read a name a loop's head sets through its alias, which a cycle reads in its dead zone", () => {
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-round-6-review-should-read-a-name-a-loop-s-head-sets-through-its"),
				options
			).code
		).toMatchSnapshot();
		expect(runProgram("function c(){const a=b,b=a;return a}try{c()}catch(e){console.log(e.name)}")).toBe(
			runProgram(minifyOnePass(fixture("javascript", "one-pass-minify-round-6-review-should-read-a-name-a-loop-s-head-sets-through-its-2"), options).code)
		);
	});

	it("should keep the parentheses of a `!!` whose operand opens an arrow's body with an object", () => {
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-round-6-review-should-keep-the-parentheses-of-a-whose-operand-op"),
				options
			).code
		).toMatchSnapshot();
	});

	it("should end a `return` pair folding an `else` exit before a function declaration", () => {
		const source =
			fixture("javascript", "one-pass-minify-round-6-review-should-end-a-return-pair-folding-an-else-exit-bef");
		const { code } = minifyOnePass(source, options);
		expect(code).toContain("return a&&g(b);function g");
		expect(code).toContain("return a===1&&b(g,g);function g");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should parenthesize an arrow's returned value that a fold opens with an object", () => {
		const source =
			fixture("javascript", "one-pass-minify-round-6-review-should-parenthesize-an-arrow-s-returned-value-tha");
		const { code } = minifyOnePass(source, options);
		expect(code).toMatchSnapshot();
		const program =
			fixture("javascript", "one-pass-minify-round-6-review-should-parenthesize-an-arrow-s-returned-value-tha-2");
		expect(runProgram(minifyOnePass(program, options).code)).toBe(
			runProgram(program)
		);
	});

	it("should treat a pattern's defaults as reaching the body's functions", () => {
		const source =
			fixture("javascript", "one-pass-minify-round-6-review-should-treat-a-pattern-s-defaults-as-reaching-the");
		const { code } = minifyOnePass(source, options);
		expect(code).toContain("var v=1");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a null check assigning a function expression's own name", () => {
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-round-6-review-should-keep-a-null-check-assigning-a-function-exp"),
				options
			).code
		).toMatchSnapshot();
	});
});

describe("one-pass minify, family O round 7", () => {
	it("should lift a test's or exit's operator past a sequence where it prints bare", () => {
		const source = fixture("javascript", "one-pass-o4-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A test the `if` joins to another, prints as a branch of `?:` or negates whole, or a last value an operator would take in parentheses, keeps the operator outside.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };
		// `await` lifts too; a template or regular expression in the text, or a `yield` last, keeps it.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a-2"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a-3"), options).code).toMatchSnapshot();
		// A sequence printing one value keeps no comma; a `!` of what takes parentheses stays.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a-4"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a-5"), options).code).toMatchSnapshot();
	});

	it("should negate a chain of `||` or `&&` whose links each flip only equalities or drop `!`s", () => {
		const source = fixture("javascript", "one-pass-o4-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A value read keeps a `!` that would leave no boolean; a link adding characters takes `!(`; an operand of `??`, `+` or a branch of `?:` keeps the chain whole.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family R round 7", () => {
	it("should count a constant's reads that are computed keys as printing its value as cheaply", () => {
		const source = fixture("javascript", "one-pass-r4-1");
		const options = { compress: { ecma: 2022 }, ecma: 2022, module: true };
		// A member's key prints `.a` either way, and a key, a pattern's too, `a` for `[n]`; a number, or a string no name spells, reads as other names do.
		expect(minifyOnePass(source, options).code).toMatchSnapshot();
		// Kept computed, or renamed, a key reads as other names do.
		expect(
			minifyOnePass(source, { ...options, compress: { ecma: 2022, computed_props: false } }).code
		).toMatchSnapshot();
		expect(
			minifyOnePass(source, { ...options, mangle: { properties: { regex: /^_/ } } }).code
		).toMatchSnapshot();
	});

	it("should print a `return` pair with a boolean as `||` or `&&`", () => {
		const source = fixture("javascript", "one-pass-r4-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A test giving a boolean only; a conditional or an assignment test takes parentheses, one setting nothing printing its value.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// Negating the test measured larger gzipped.
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-family-r-round-7-should-print-a-return-pair-with-a-boolean-as-or"),
				{ compress: {}, mangle: false }
			).code
		).toMatchSnapshot();
	});
});

describe("one-pass minify, family P round 7", () => {
	it("should join a `var` to the one before it where a later declarator prints apart", () => {
		const source = fixture("javascript", "one-pass-p4-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// The statement after it is no `var` to join; one opening with a value printed apart, or a `let`, stays apart.
		expect(code).toMatchSnapshot();
		// Every call returns a function, so the source runs to its end.
		expect(runProgram(source)).not.toContain("throws");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a call in place passed `this` as its statements", () => {
		const source = fixture("javascript", "one-pass-p4-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// Only a function declaration's or a program's `this`, which no `super()` sets; a parameter `delete` takes stays.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should pair an `if` leaving with the exit after statements running nothing", () => {
		const source = fixture("javascript", "one-pass-p4-3");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A `;` or an `if` of a literal with an empty body goes; one reading a name stays between.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should join statements into the `return` an `if` of a known test keeps", () => {
		const source = fixture("javascript", "one-pass-p4-4");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A branch printing as no `return`, or `var`s the gone one hoists, stay apart.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// A call of a name spelled as `return` opens is no `return`.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-p-round-7-should-join-statements-into-the-return-an-if-of"), { compress: {}, mangle: false }).code).toMatchSnapshot();
	});

	it("should drop a directive no engine reads", () => {
		const source = fixture("javascript", "one-pass-p4-5");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// terser's `directives`: `use strict` and `use asm` stay, as does one spelled with escapes.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family W round 8", () => {
	it("should print an arrow body ending in an `if` returning in its `else` too as one `?:`", () => {
		const source = fixture("javascript", "one-pass-w5-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// What follows it never runs; a `var` it hoists keeps the braces, and a test a fold opens with `{` takes parentheses.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print the expressions opening an arrow body before its `return` chain as one sequence", () => {
		const source = fixture("javascript", "one-pass-w5-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// Setting a property of a fresh object runs only its value, here nothing.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop what follows a `switch` folding to a branch that always leaves", () => {
		const source = fixture("javascript", "one-pass-w5-3");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A `break`, a `var` it hoists or a label holding it keeps what follows.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family T round 8", () => {
	it("should evaluate an argument at its parameter's one read, run first", () => {
		const source = fixture("javascript", "one-pass-t5-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A later argument running code, a read after code, statements before the `return` or a call staying a call keep it passed.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should declare a parameter set to the argument before the declarator its call is the value of", () => {
		const source = fixture("javascript", "one-pass-t5-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// `var`s share a name; a `let` or `const` beside one of it, a name the holder has, a declarator gone, a body written twice or two arguments keep the call.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// A program's names are its own only with `toplevel`.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument"), { compress: { toplevel: true }, mangle: false }).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-2"), { compress: {}, mangle: false }).code).toMatchSnapshot();
		// Mangled, a `using`, a spread passed or a function reading its `this` keeps the call.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-3"), { compress: {}, mangle: true }).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-4"), { compress: {}, mangle: false }).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-5"), { compress: {}, mangle: false }).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-6"), { compress: {}, mangle: false }).code).toMatchSnapshot();
	});
});

describe("one-pass minify, family V round 8", () => {
	it("should join a `var` set by both branches of an `if` as its value", () => {
		const source = fixture("javascript", "one-pass-v5-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// An `else` chain joins; an `if` without `else`, a branch running more, setting another or compounding, or a comment, keeps it apart.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// A function the assignment names, or a test or value reading the name, stays apart.
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-family-v-round-8-should-join-a-var-set-by-both-branches-of-an-if"),
				{ compress: {}, mangle: false }
			).code
		).toMatchSnapshot();
		// Branches printing alike as an operation print once, after the test.
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-family-v-round-8-should-join-a-var-set-by-both-branches-of-an-if-2"), {
				compress: {},
				mangle: false
			}).code
		).toMatchSnapshot();
	});

	it("should print a `return` pair giving its test back as `||`", () => {
		const source = fixture("javascript", "one-pass-v5-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A side taking parentheses, another name returned or a comment keeps `?:`.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// `&&` on the other side measured larger gzipped, and a comment on the test stays.
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-family-v-round-8-should-print-a-return-pair-giving-its-test-back"),
				{ compress: {}, mangle: false }
			).code
		).toMatchSnapshot();
	});
});

describe("one-pass minify, family S round 8", () => {
	const keeps = { compress: { keepFnames: true, keepClassnames: true }, mangle: false };
	const folds = { compress: {}, mangle: false };

	it("should keep the name a declarator gives an anonymous function or class its one read would lose, where `keepFnames` or `keepClassnames` keeps it", () => {
		const source = fixture("javascript", "one-pass-s5-1");
		const { code } = minifyOnePass(source, keeps);
		// Only a call or a tag of a function shows nothing of its name, but through `arguments.callee`; a class's static block reads its own.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// Under the defaults, as terser, no name is promised: the old folds stay.
		expect(minifyOnePass(source, folds).code).toMatchSnapshot();
	});

	it("should keep the name an assignment gives an anonymous function its read would lose, where `keepFnames` keeps it", () => {
		const source = fixture("javascript", "one-pass-s5-2");
		const { code } = minifyOnePass(source, keeps);
		// The default folds it, the value taking no parentheses the assignment took.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// Under the defaults, as terser, no name is promised: the old folds stay.
		expect(minifyOnePass(source, folds).code).toMatchSnapshot();
	});

	it("should keep a folded anonymous function or class a naming place holds unnamed as `(0,f)`, where `keepFnames` or `keepClassnames` keeps names", () => {
		const source = fixture("javascript", "one-pass-s5-3");
		const { code } = minifyOnePass(source, keeps);
		// Where the test and the part going are no longer than `(0,)`, the expression stays; a computed key or an element names nothing; a known test keeps a function or class unnamed in either mode.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// Under the defaults, as terser, no name is promised: the old folds stay.
		expect(minifyOnePass(source, folds).code).toMatchSnapshot();
		const modules = { compress: { keepFnames: true, keepClassnames: true }, mangle: false, module: true };
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or"), modules).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-2"), modules).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-3"), { ...modules, compress: {} }).code).toMatchSnapshot();
		// An `if` or `?:` setting one name either way keeps the value it names.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-4"), keeps).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-5"), keeps).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-6"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-7"), keeps).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-8"), keeps).code).toMatchSnapshot();
	});

	it("should keep a call in place returning an anonymous function where its place would name it, where `keepFnames` keeps names", () => {
		const source = fixture("javascript", "one-pass-s5-4");
		const { code } = minifyOnePass(source, keeps);
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// Under the defaults, as terser, no name is promised: the old folds stay.
		expect(minifyOnePass(source, folds).code).toMatchSnapshot();
	});

	it("should print the value of an assignment setting nothing without the parentheses the assignment took", () => {
		// Opening a statement, a function keeps them; a value set through two names alike.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting-2"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting-3"), { ...folds, module: true }).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting-4"), { ...folds, module: true }).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting-5"), { ...folds, module: true }).code).toMatchSnapshot();
	});

	it("should keep a moved function or a folded value from printing bare as a picked element read off", () => {
		// A low-binding value stays in its literal under a member, call or operator.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-2"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-3"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-4"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-5"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-6"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-7"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-8"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-9"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-10"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-11"), folds).code).toMatchSnapshot();
		expect(runProgram("function g(a,b){var r=a+b;return[r][0].toFixed(1)}console.log(g(1,2))")).toBe(runProgram(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-12"), folds).code));
	});
});

describe("one-pass minify, family S round 8, switches", () => {
	const options = { compress: {}, mangle: false };

	it("should print a `switch` of a case and a `default` each running one expression as `?:`", () => {
		const source = fixture("javascript", "one-pass-s5-5");
		const { code } = minifyOnePass(source, options);
		// One `=` setting the same name takes the test as its value.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep the `if` a `switch` prints as where `?:` would read otherwise or grow", () => {
		// A call of one callee, a part one side repeats, a sequence, or a test opening as a declaration.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-2"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-3"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-4"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-5"), options).code).toMatchSnapshot();
		// An assignment printing as another operator sets no name the other's `=` shares.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-6"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-7"), options).code).toMatchSnapshot();
	});
});

describe("one-pass minify, family B round 9", () => {
	const options = { compress: {}, mangle: false };

	it("should join string literals where the joined one prints shorter in the quotes it takes", () => {
		const source = fixture("javascript", "one-pass-b9-1");
		const { code } = minifyOnePass(source, options);
		// Counted in the quotes it prints with, not as JSON escapes them; one
		// whose quotes the joined string would escape stays apart.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family Y round 9", () => {
	const options = { compress: {}, mangle: false };

	it("should merge the tests of a chain of conditionals sharing a branch in one pass", () => {
		const source = fixture("javascript", "one-pass-y9-1");
		const { code } = minifyOnePass(source, options);
		// `a?x:b?x:c?x:y` joins all three tests, with `&&` and `||` mixed.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should merge the tests of nested `if`s printing as a conditional sharing a branch", () => {
		const source = fixture("javascript", "one-pass-y9-2");
		const { code } = minifyOnePass(source, options);
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a third test apart where the merged branches share `void 0`, and parenthesize a merged test as needed", () => {
		// Babel's optional chains merge two links at a time, as before.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-y-round-9-should-keep-a-third-test-apart-where-the-merged"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-y-round-9-should-keep-a-third-test-apart-where-the-merged-2"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-y-round-9-should-keep-a-third-test-apart-where-the-merged-3"), options).code).toMatchSnapshot();
	});
});

describe("one-pass minify, family Z round 9", () => {
	const options = { compress: {}, mangle: false };

	it("should join the tests of `if`s returning or throwing the same before a last exit with `||`", () => {
		const source = fixture("javascript", "one-pass-Z6-1");
		const { code } = minifyOnePass(source, options);
		// A test `||` would read otherwise keeps parentheses.
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// A negated test joins as it is; an assignment setting nothing as its value.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-join-the-tests-of-if-s-returning-or-thro"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-join-the-tests-of-if-s-returning-or-thro-2"), options).code).toMatchSnapshot();
	});

	it("should keep `?:` of `if`s returning the same where another fold or gzip favors it", () => {
		// A value of four characters or fewer, a boolean, or the last exit giving it too.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an-2"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an-3"), options).code).toMatchSnapshot();
		// The second test reading the name returned, there or after: `||` or `&&` of it.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an-4"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an-5"), options).code).toMatchSnapshot();
	});

	it("should print an `else` after an `if` leaving its function or loop bare inside the negated `if`, the expressions after joining it", () => {
		const source = fixture("javascript", "one-pass-Z6-2");
		const { code } = minifyOnePass(source, options);
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// A dropped expression of the `else`, and a statement printing nothing after.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-print-an-else-after-an-if-leaving-its-fu"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-print-an-else-after-an-if-leaving-its-fu-2"), options).code).toMatchSnapshot();
	});

	it("should keep `return;` before an `else` where the block would not print as one expression", () => {
		// An `else` or a statement after that is no expression, an exit after, or an `if` returning a value.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-return-before-an-else-where-the-blo"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-return-before-an-else-where-the-blo-2"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-return-before-an-else-where-the-blo-3"), options).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-return-before-an-else-where-the-blo-4"), options).code).toMatchSnapshot();
	});
});

describe("one-pass minify, family X round 9", () => {
	const folds = { compress: {}, mangle: false };

	it("should print the `!!x` a call in place returns as `x` where only its truth is read", () => {
		const source = fixture("javascript", "one-pass-x6-1");
		const { code } = minifyOnePass(source, folds);
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		// A test takes any operation bare, a `?:` test not every one; `!x`, a sequence or a folded `!!` stay.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-2"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-3"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-4"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-5"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-6"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-7"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-8"), folds).code).toMatchSnapshot();
	});

	it("should print an `&&` or `||` a call in place returns bare beside the same operator", () => {
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-or-a-call-in-place-returns-bare"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-or-a-call-in-place-returns-bare-2"), folds).code).toMatchSnapshot();
		// Another operator, or one that is no such chain, keeps them.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-or-a-call-in-place-returns-bare-3"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-or-a-call-in-place-returns-bare-4"), folds).code).toMatchSnapshot();
	});

	it("should print an `if` setting one member alike in both branches as one assignment of `?:`", () => {
		const source = fixture("javascript", "one-pass-x6-2");
		const { code } = minifyOnePass(source, folds);
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in"), folds).code).toMatchSnapshot();
		// A test that may change the object, a part longer than what both share,
		// a branch of two statements, no `else`, a known test or a local name keep their forms.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-2"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-3"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-4"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-5"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-6"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-7"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-8"), folds).code).toMatchSnapshot();
	});

	it("should join the `var` a block printing its statements in place opens or ends with to those around it", () => {
		const source = fixture("javascript", "one-pass-x6-3");
		const { code } = minifyOnePass(source, folds);
		expect(code).toMatchSnapshot();
		expect(runProgram(code)).toBe(runProgram(source));
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its-2"), folds).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its-3"), folds).code).toMatchSnapshot();
		// A comment before the block stays before its statements; beautified, each stays its own.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its-4"), { ...folds, format: { comments: "all" } }).code).toMatchSnapshot();
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const beautified = /** @type {{ code: string }} */ (new SourceProcessor().process(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its-5"), { mode: "beautify", compress: {}, mangle: false })).code;
		expect(beautified).toMatchSnapshot();
	});
});

describe("printing again what the one pass printed", () => {
	it("should print a conditional's merged call and a call printing as its argument without parentheses a reprint drops", () => {
		const options = { compress: {}, mangle: false };
		for (const [source, expected, sourceType] of [
			// A conditional printing as one call takes back the `(` it opened with, but as `new`'s callee, an `await`'s argument or a tag.
			[fixture("javascript", "printing-again-what-the-one-pass-printed-should-print-a-conditional-s-merged"), "function f(e,t){t&&console.error(e?\"a\":\"b\",e)}"],
			[fixture("javascript", "printing-again-what-the-one-pass-printed-should-print-a-conditional-s-merged-2"), "function f(i,a){return 3*Math.abs(0!==i?i:a)}"],
			[fixture("javascript", "printing-again-what-the-one-pass-printed-should-print-a-conditional-s-merged-3"), "function f(e,t,g){x=new(e?g(\"aaaa\",e,t,1):g(\"bbbb\",e,t,1))}"],
			// A merged assignment keeps them: `t&&x=a` sets an rvalue.
			[fixture("javascript", "printing-again-what-the-one-pass-printed-should-print-a-conditional-s-merged-4"), "function f(t,s){t&&(s?this.v=g(1,t,s,\"aa\"):this.v=g(2,t,s,\"aa\"))}"],
			[fixture("javascript", "printing-again-what-the-one-pass-printed-should-print-a-conditional-s-merged-5"), "function f(e,t,g){x=(e?g(\"aaaa\",e,t,1):g(\"bbbb\",e,t,1))`q`}"],
			[fixture("javascript", "printing-again-what-the-one-pass-printed-should-print-a-conditional-s-merged-6"), "let flag=\"function\"==typeof Promise;export const picked=await(flag?Promise.resolve(4):Promise.resolve(5));", "module"],
			// A call printing as the argument its parameter's one read evaluates parenthesizes it as that argument.
			[fixture("javascript", "printing-again-what-the-one-pass-printed-should-print-a-conditional-s-merged-7"), "function w(a){x=a||g()}"],
			[fixture("javascript", "printing-again-what-the-one-pass-printed-should-print-a-conditional-s-merged-8"), "function w(a){x=y*(a||g())}"]
		]) {
			const settled = sourceType === "module" ? { sourceType: /** @type {const} */ ("module") } : {};
			const once = minifyOnePass(source, { ...options, ...settled }).code;
			expect(once).toBe(expected);
			expect(minifyOnePass(once, { ...options, ...settled }).code).toBe(once);
		}
	});
});

describe("folding a `var` set after calls", () => {
	it("should fold a constant set after calls that reach none of the functions reading it, and keep one a function run first reads", () => {
		const options = { compress: {}, mangle: false };
		for (const [source, expected, sourceType] of [
			// Calls before it reach no function of the body: its reads fold, and fold on.
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach"), "init(),window.f=function(x){return x&5};"],
			// A function handed out, named or called before it reads the name as it is then.
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-2"), "!function(){h();var A=4;function h(){console.log(A)}h()}();"],
			// A name of a function read later names it there, made once the name is set.
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-3"), "!function(){init();var A=4;console.log(function(){return A}())}();"],
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-4"), "!function(){var k=function(){return A};init(k);var A=4;console.log(k())}();"],
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-5"), "!function(){class C{m(){return A}}init(C);var A=4;console.log((new C).m())}();"],
			// `eval` and a function no statement of the body declares may run anything.
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-6"), '!function(){eval("g()");var A=4;function g(){return A}console.log(g(),g())}();'],
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-7"), "!function(){if(init()){function g(){return A}}init(g);var A=4;console.log(g(),g())}();"],
			// A default runs before the body; one naming nothing of it leaves the fold.
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-8"), "!function(x=init()){function g(){return 4}console.log(g(),g())}();"],
			// What a module exports an import cycle may call before its body runs.
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-9"), "init();var A=4;export function f(){return A}function g(){return A}console.log(g(),g());", "module"],
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-10"), "init();var A=4;function f(){return A}export{f};console.log(f(),f());", "module"],
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-11"), "init();var A=4;export default function(){return A}function g(){return A}console.log(g(),g());", "module"],
			// A static block runs as its class is made, before the `var` after it is set.
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-12"), 'function f(report){class C{static{report(value)}}var value=1;report(C)}f(function(v){console.log("function"==typeof v?"fn":v)});'],
			// Unmangled, a value folds where it prints shorter than the name read.
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-13"), '!function(){init(function(){});function g(a){return a==="transition"?1:a==="transition1"?2:"transition"}window.g=g,window.h=g}();'],
			[fixture("javascript", "folding-a-var-set-after-calls-should-fold-a-constant-set-after-calls-that-reach-14"), '!function(){init(function(){});var N="transition";function g(a){return a===N?1:a===N+1?2:N}window.g=g,window.h=g}();']
		]) {
			const settled = sourceType === "module" ? { sourceType: /** @type {const} */ ("module") } : {};
			expect(minifyOnePass(source, { ...options, ...settled }).code).toBe(expected);
		}
		// Mangled, only a value of one character folds: a longer one repeated gzips larger than the letter the name gets.
		const mangled = { compress: {}, mangle: true };
		expect(minifyOnePass(fixture("javascript", "one-pass-fold-var-mangled-string"), mangled).code).toMatchSnapshot();
		expect(minifyOnePass(fixture("javascript", "one-pass-fold-var-mangled-number"), mangled).code).toMatchSnapshot();
		// Read before it is set, it reads `undefined` printed or not.
		for (const name of ["one-pass-var-read-early-escaped", "one-pass-var-read-early-called", "one-pass-var-read-early-toplevel"]) {
			const source = fixture("javascript", name);
			expect(runProgram(minifyOnePass(source, { compress: { toplevel: true }, mangle: false }).code)).toBe(runProgram(source));
		}
	});
});

describe("moving a value made of names", () => {
	it("should move a value of names nothing writes to its one later read, but one reading a `var` its declarator sets after", () => {
		const options = { compress: {}, mangle: false };
		// Calls the cases declaring `f`, so that each moved value runs.
		const CALL_F = 'function g(){}console.log(JSON.stringify([f({w:3,p:1},{}),f({},{}),f(0,{}),f("s",{})]))';
		for (const [source, expected, call = ""] of [
			// Read before its declarator, the `var` is `undefined` there, not where the value is read later.
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its"), "function h(){var n=[r],r=4;return[n,function(){return r}]}console.log(JSON.stringify(h()));"],
			// Its function's declarator cannot run between the value and its read.
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-2"), "function o(){function i(){g();return[r]}var r=g();return[i(),i()]}function g(){return{}}console.log(JSON.stringify(o()));"],
			// Names nothing writes under operators that convert nothing give the same value later.
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-3"), "function f(o,t){var a=o.w;return t.x=1,g(),t.w=a!==void 0&&a,t}", CALL_F],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-4"), 'function f(o,t){return g(),t.w="string"==typeof o?!o:void 0,t}', CALL_F],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-5"), 'function f(o,t){return g(),t.w=o||"x",t}', CALL_F],
			// A conversion, a member read or a name written between may run code or read another value.
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-6"), "function f(o,t){var w=o+1;return g(),t.w=w,t}", CALL_F],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-7"), "function f(o,t){var w=o==1;return g(),t.w=w,t}", CALL_F],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-8"), "function f(o,t){var w=-o;return g(),t.w=w,t}", CALL_F],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-9"), "function f(o,t){var w=o.p;return g(),t.w=w,t}", CALL_F],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-10"), "function f(o,t){var w=o;return o=2,t.w=w,t}", CALL_F],
			// A name a value moved into already prints that value, run where it is read; a boolean prints as `!0`, which a member read would take in.
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-11"), 'function f(){var b=!read();return middle(),b}function read(){return console.log("read"),1}function middle(){console.log("middle")}console.log(f());'],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-12"), "function f(){return middle(),true.toString()}function middle(){}console.log(f());"],
			// An outer `var` read before an `await` or a `yield` may be set while the function, or the generator owning it, waits.
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-13"), "function f(p){var t=async function(){var n=!r;return await p,n}(),r=1;return t}f(0);"],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-14"), "function f(){var t=function*(){var n=!r;return yield,n}();t.next();var r=1;return t.next().value}console.log(f());"],
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-15"), "function*o(g,a){g(function(){var n=!r;return a(),n}),yield 0;var r=1}let i,t=o(function(f){i=f},function(){t.next()});t.next(),console.log(i());"],
			// Set by then, it holds its value wherever later the value is made.
			[fixture("javascript", "moving-a-value-made-of-names-should-move-a-value-of-names-nothing-writes-to-its-16"), "function h(){return[[4],function(){return 4}]}console.log(JSON.stringify(h()));"]
		]) {
			const { code } = minifyOnePass(source, options);
			expect(code).toBe(expected);
			expect(runProgram(code + call)).toBe(runProgram(source + call));
		}
	});
});

describe("printing Babel's default parameters as ES2015 ones", () => {
	it("should print the leading `var`s Babel writes for defaults as parameters, where the output may use them and nothing tells the two apart", () => {
		const options = { compress: {}, mangle: false, ecma: 2020 };
		// Calls each `f` missing, passing `undefined` and passing a value, and reads its `length`.
		const CALL_F = 'var r=[];function g(){r.push("g");return 7}console.log(JSON.stringify([f(1),f(1,void 0),f(1,2),f(1,2,3),f.length,r]))';
		for (const [source, expected] of [
			// Each default may read the parameters and defaults before it, and runs only where the argument is missing.
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var"), "function f(a,b=g(),c=a+b){return[a,b,c]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-2"), "function f(a,b={x:a}){return[b,a]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-3"), "var o={m(a,b=5){return a+b}};function f(a,b){return o.m(a,b)}"],
			// Another read of `arguments`, a name the body binds, the wrong index or a generator keep the `var`.
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-4"), "function f(a){return[arguments.length>1&&arguments[1]!==void 0?arguments[1]:5,arguments.length]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-5"), "function f(a){var b=arguments.length>1&&arguments[1]!==void 0?arguments[1]:x,x=1;return[b,x]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-6"), "function f(a){return[arguments.length>2&&arguments[2]!==void 0?arguments[2]:5]}"],
			// A default may not wait, read `eval` or make a function; an accessor, a rest or a repeated parameter, a function of the name or a value nothing reads keep them.
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-7"), "async function h(a){return arguments.length>1&&arguments[1]!==void 0?arguments[1]:await a}function f(a){return 0}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-8"), "function f(a){var b=arguments.length>1&&arguments[1]!==void 0?arguments[1]:eval(`a`);return b}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-9"), "function f(a){return typeof(arguments.length>1&&arguments[1]!==void 0?arguments[1]:function(){return a})}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-10"), "var o={set v(a){this.x=arguments.length>1&&arguments[1]!==void 0?arguments[1]:5}};function f(a){return o.v=a,o.x}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-11"), "function f(...a){return arguments.length>1&&arguments[1]!==void 0?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-12"), "function f(a,a){return arguments.length>2&&arguments[2]!==void 0?arguments[2]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-13"), "function f(a){var b=arguments.length>1&&arguments[1]!==void 0?arguments[1]:5;function b(){}return typeof b}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-14"), "function f(a){arguments.length>1&&arguments[1]!==void 0?arguments[1]:g();return a}"],
			// A function inside reads its own `arguments`; a value not written as Babel writes defaults stays.
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-15"), "function f(a,b=5){return[b,function(){return arguments.length}(1)]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-16"), "function f(a,b=5){return[b,function(){return arguments.length}(1)]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-17"), "function f(a=g()){return[a]}"],
			// After a default, the `var` Babel writes for a parameter with none prints as one: the function's `length` stays.
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-18"), "function f(a=g(),b,c=b){return[a,b,c]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-19"), "function f(){return[arguments.length>0?arguments[0]:void 0]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-20"), "function f(a){return[arguments.length>1&&arguments[1]!==void 0?arguments[1]:5,arguments.length>2?arguments[2]:void 0,arguments.length]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-21"), "function f(){arguments.length>0&&arguments[0]!==void 0?arguments[0]:1;var b=arguments.length>1?arguments[1]:void 0;return[b]}"],
			// Parameters other than names, one named `arguments` or a `var` of that name keep them.
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-22"), "function f({a}){return[a,arguments.length>1&&arguments[1]!==void 0?arguments[1]:5]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-23"), "function o(value){return function(a=value){return[a,arguments.length>1&&arguments[1]!==void 0?arguments[1]:1]}}var f=o(7);"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-24"), "function f(arguments){return arguments.length>1&&arguments[1]!==void 0?arguments[1]:9}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-25"), "function f(a){var arguments;return arguments.length>1&&arguments[1]!==void 0?arguments[1]:9}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-26"), "function f(a){var b=arguments.length>1&&arguments[1]!==void 0?arguments[1]:5,c=arguments.length>2&&arguments[2]!==void 0?arguments[2]:x,x=b;return[b,c,x]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-27"), "function f(a){return a?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-28"), "function f(a){return arguments.length>1||arguments[1]!==void 0?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-29"), "function f(a){return arguments.length>=1&&arguments[1]!==void 0?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-30"), "function f(a){return arguments.length>1&&arguments[1]!=null?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-31"), "function f(a){return arguments.length>1&&arguments[1]!==null?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-32"), "function f(a){return arguments.length>1&&arguments[1]!==void 0?arguments[2]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-33"), "function f(a){return arguments.length>1&&a!==void 0?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-34"), "function f(a){return a.length>1&&arguments[1]!==void 0?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-35"), "function f(a){return arguments.size>1&&arguments[1]!==void 0?arguments[1]:5}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-36"), "function f(a,b=5){return[b,a]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-37"), "function f(a,b=5,c=b){return[b,c,c]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-38"), "function f(a,b=5){return[b]}"],
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-print-the-leading-var-39"), "function f(a){return[...h(a)]}function*h(a){yield a+(arguments.length>1&&arguments[1]!==void 0?arguments[1]:g())}"]
		]) {
			const { code } = minifyOnePass(source, options);
			expect(code).toBe(expected);
			expect(runProgram(code + CALL_F)).toBe(runProgram(source + CALL_F));
		}
	});

	it("should keep the `var`s where the output may not use default parameters", () => {
		for (const [source, expected] of [
			[fixture("javascript", "printing-babel-s-default-parameters-as-es2015-ones-should-keep-the-var-s-where"), "export function f(a){return a+(arguments.length>1&&arguments[1]!==void 0?arguments[1]:5)}"]
		]) {
			expect(minifyOnePass(source, { compress: {}, mangle: false, module: true }).code).toBe(expected);
		}
	});
});

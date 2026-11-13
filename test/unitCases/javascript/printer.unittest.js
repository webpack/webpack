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
	_SyntaxTree: SyntaxTree,
	WebpackParser,
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
		expect(code).toBe("function a(c){if(c===E){let{data:a}=c\ncall(a)}}function b(c){if(c===E){function a(){}call(a)}}function c(c,a){if(c===E)call(c)\nelse a()}function d(c){if(c===E)call(c)}function e(c){switch(c){case E:{let c=h()\ng(c,c)\nbreak}}}function f(c){switch(c){case E:g(),h()\nbreak}return 1}function i(c){switch(c){case E:}}function j(c){switch(c){case E:if(c)break\ng()\nbreak}}function k(c){switch(c){case E:g()\nbreak\ndefault:m()}}");
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
		expect(mapped.code).toBe("function f(a,b){if(a!=b)g(c?2:1,a!==b||x)}");
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
		expect(unbraced.code).toBe("function f(){for(;;)if(!xx)yy(),zz()}");
		// cspell:disable-next-line
		expect(unbraced.map.mappings).toBe("AAAA,SAASA,IAAI,OAAQ,IAAGC,GAAYC");
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
		expect(first).toBe("it(()=>[g(1),g(2)]);");
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
		expect(mapped.code).toBe("f(`a${x}b${y}`,`cd${z}e`);");
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
		expect(alike.code).toBe("function f(c){g(),h()}");
		expect(alike.map.names).toEqual(expect.arrayContaining(["g", "h"]));
	});

	it("should read terser's compress options that name calls, globals and names", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, unknown>} */ compress = {}
		) => minifyOnePass(source, { compress, mangle: false }).code;
		// `drop_debugger` drops them unless turned off, where no list holds one too.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress"))).toBe("f();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-2"))).toBe("a;f();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress"), { drop_debugger: false })).toBe(
			"debugger;f();"
		);
		// `drop_console` drops a call whole, what its arguments run with it.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-3"), { drop_console: true })).toBe(
			"g();"
		);
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-4"), {
				drop_console: true
			})
		).toBe("f();g();");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-5"), { drop_console: ["log"] })
		).toBe("console.warn(2),g();");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-6"), { drop_console: true })
		).toBe("console[m](1),c.console.log(1);");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-7"), { drop_console: true })
		).toBe("var console=k;console.log(1);");
		// Where no list holds it, it prints as the `undefined` it returns.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-8"), {
				drop_console: true
			})
		).toBe("if(a);for(;;);x=void 0;");
		// Where a unary cannot stand, it is grouped.
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-9"),
				{ drop_console: true }
			)
		).toBe("x=(void 0)**2,y=(void 0).a,z=(void 0)(),w=new(void 0);");
		// So is one called through `call` or `apply`.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-10"), {
				drop_console: true
			})
		).toBe("g();");
		// `pure_funcs` marks the calls it names pure, by how the callee is written.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-11"), {
				pure_funcs: ["foo", "a.b.c"]
			})
		).toBe("a.b.d(3),a[b].c(4),foo(5);");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-12"), { pure_funcs: ["foo"] })).toBe(
			"var x=foo(1);h(x);"
		);
		// `global_defs` replaces a global nothing sets with a primitive value.
		const defs = {
			global_defs: { DEBUG: false, VERSION: "1.2", "@code": "x", O: {} }
		};
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-13"), defs)).toBe('g("1.2",O);');
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-14"), defs)).toBe("DEBUG=1,g(DEBUG);");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-15"), defs)).toBe(
			"!function(DEBUG){g(DEBUG)}(h);"
		);
		// A shorthand prints its key and the value.
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-16"), {
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
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-17"),
				nested
			)
		).toBe("g(0,a.env.DEBUG,delete env.DEBUG);");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-18"), nested)).toBe(
			"var env={};g(env.DEBUG);"
		);
		// A number a sign or point would join to what is around it is grouped.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-19"), { global_defs: { V: -1 } })
		).toBe('g((-1).toLocaleString(),1,"number");');
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-20"), { global_defs: { V: -0 } })).toBe("g(a/(-0));");
		// `top_retain` keeps the top-level names it lists, a pattern or a test keeps.
		const top = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-21");
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
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-22"), { toplevel: true, top_retain: "foo" })
		).toBe("var foo=1;g(foo);");
		// `keep_infinity` prints `Infinity` as written.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-23"))).toBe("x(1/0);");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-23"), { keep_infinity: true })).toBe(
			"x(Infinity);"
		);
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
		expect(wrapped.code).toBe(
			'!function(e){e.a=1+g()}(typeof lib>"u"?lib={}:lib);'
		);
		// Only the source's own names map, from its second line.
		expect(wrapped.map.names).toEqual(["exports", "longName", "g"]);
		expect(wrapped.map.mappings).toBe("aACAA,IAAYC,EAAWC");
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-2"), {
				...options,
				enclose: "y:7"
			}).code
		).toBe("window.v=8;");
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-3"), { ...options, enclose: true }).code
		).toBe("!function(){window.v=y}();");
		// `enclose` goes around `wrap`; a hashbang, no longer first, goes.
		const bare = { compress: false, mangle: false };
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-4"), {
				...bare,
				wrap: "lib",
				enclose: "window,undefined:window"
			}).code
		).toBe(
			'(function(window,undefined){(function(exports){exports.x=undefined})(typeof lib=="undefined"?lib={}:lib)})(window);'
		);
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-5"), { ...bare, enclose: true })
				.code
		).toBe("(function(){foo()})();");
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-each-source-with-names-111"), { ...bare, wrap: "lib" }).code
		).toBe('(function(exports){})(typeof lib=="undefined"?lib={}:lib);');
	});

	it("should print alone the comments it keeps, however they are chosen", () => {
		const bare = { compress: false, mangle: false };
		const print = (/** @type {string} */ source, /** @type {EXPECTED_OBJECT} */ format) =>
			minifyOnePass(source, { ...bare, format }).code;
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it"), {})).toBe("/*! a */f();g();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-2"), {})).toBe("f();/*! late */g();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-3"), {})).toBe("f();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-4"), { comments: false })).toBe("f();");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-5"), {
				comments: false,
				preserve_annotations: true
			})
		).toBe("/*#__PURE__*/f();g();");
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
		).toBe("/* keep */f();g();/* keep2 */h();");
		expect(asked).toEqual([" drop ", " keep2 ", " keep "]);
		// A global pattern is tested only as each prints, its `lastIndex` moving.
		const pattern = /keep/g;
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-7"), { comments: pattern })
		).toBe("f();/* keep */g();");
		expect(pattern.lastIndex).toBe(0);
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-7"), { comments: /keep/y })
		).toBe("f();g();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-8"), {})).toBe("/*! a */ /*! b */");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-9"), { comments: "/keep/g" })).toBe(
			"/* keep */f();g();"
		);
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
		expect(code).toBe(
			"function keepMe(){}function keepToo(){}function e(){}g(keepMe,keepToo,e),g(keepMe,keepToo,e);"
		);
		expect(pattern.lastIndex).toBe(0);
	});

	it("should print a part a node prints as without the parentheses it took as that node's operand", () => {
		const source = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-kept-part-as-its-place-takes");
		const expected =
			"const s=(g(),h());g(),h(),g(),h(),a,b,f([a]=[1],({b:b}={b:2}),([c]=[1])),x=a?y=1:c,x=(a||f(),c),g``,(a,b)``,(x={}.y)(()=>{}),a=- -b;a in b,c;x=!a&&b in c,x=a<b&&c;if(!b&&c)f();a(),- -b;({a:g()}).b;({a:g()}).b.c();({m(){}}).m()?a():b();(function(){g()})(),x;x=function(){g()}()==x,a=c;function k(i){return i++**2}function n(){return 1..a}x=new[1,2],x=new function(){this.b=1},k(1),n(),x={k:a=1,[b=1]:1},x=a?c:(f(1)(2),c);if(x=a?c:(g()+1,c)){({}).a?b():c();y()}x=new F(1);";
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
			expected
		);
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
			// Where the items before it go, what opens the statement keeps them.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as"), "x,({a:g()}.b);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-2"), "(function(){g()}()),x;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-3"), "x={k:()=>1,[()=>1]:1},y=[()=>1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-4"), "x=(a||(f(1)(2)),longName);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-5"), "g(),h();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-6"), "g(),h();"],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-7"),
				"export function t(){return[new function(){return{b:9}},new F(g()),2]}",
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
		expect(processor.process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and"), { mode: "minify" }).code).toBe(
			"a(1);"
		);
		expect(() => processor.process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and-a"), { mode: "minify" })).toThrow(
			/Unexpected token/
		);
		expect(
			processor.process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and-2"), { mode: "minify" }).code
		).toBe("let x=[1,2];");
	});

	it("should map each node's output to the source's", () => {
		const result = new SourceProcessor().process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and"), {
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
		expect(code).toBe(
			"class K{#a=1;#b=2;get(){return this.#a+this.#b}}console.log((new K).get());"
		);
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
		expect(code).toBe(
			"class K{#a=1;#b=2;get(){return this.#a+this.#b}}console.log((new K).get());"
		);
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
			/** @type {EXPECTED_ANY} */ (WebpackParser.parse(fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-refuse-a-node-its-scope"), {}))
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
			/** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(source, { ecmaVersion: "latest" })
			)
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
		expect(code).toBe("var a=1;");
	});

	it("should cache the names it hands out across assets", async () => {
		const nameCache = {};
		const result = await jsMinify(
			{ "cached.js": fixture("javascript", "js-minify-should-cache-the-names-it-hands-out-across-assets") },
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
		expect(code).toBe(
			'var a=2;console.log(1/0,2/0,1/0,-1/0,NaN,NaN,a/(2/0),a- -2/0,-(2/0),(2/0).toLocaleString(),2**2e3,a**(2/0),f()/0,a/(1/0),a- -1/0,-(1/0),(1/0).toLocaleString(),a**(1/0));'
		);
		expect(runProgram(`function f(){return 1}${code}`)).toBe(
			runProgram(`function f(){return 1}${source}`)
		);
		// Where a scope binds `NaN`, it prints as the division.
		const shadowed = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-a-binary-expression-folding-2");
		expect(
			minifyOnePass(shadowed, { compress: {}, mangle: false }).code
		).toBe('!function(NaN){eval(""),console.log(0/0,NaN)}(5);');
	});

	it("should parenthesize a fold or element read keeping an infinity, which prints as a division", () => {
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-parenthesize-a-fold-or-element");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'console.log((1/0).toString(),(1/0).toFixed(),(-1/0).toString(),new(1/0),(1/0).x,[1/0][0].toFixed(),{a:1/0}.a.toFixed(),"number",0,1/0);'
		);
		expect(() => acorn.parse(code, { ecmaVersion: "latest" })).not.toThrow();
		expect(runProgram(`var a;${code}`)).toBe(runProgram(`var a;${source}`));
	});
});

describe("one-pass minify of reads and calls on literals", () => {
	it("should drop the trailing parameters nothing reads under `keep_fargs: false`", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-the-trailing");
		const { code } = minifyOnePass(source, { compress: { keep_fargs: false }, mangle: false });
		// A setter's one parameter, `arguments` and `eval` keep theirs.
		expect(code).toBe('function f(a){return a}var g=a=>a,o={set x(v){},m(){}};function h(a){return arguments}function k(a){eval("a")}console.log(f.length,g.length,o.m.length,h.length,k.length);');
		// By default they stay.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-the-trailing-2"), { compress: {}, mangle: false }).code).toBe("function f(a,b){return a}console.log(f.length);");
	});

	it("should keep only what the sides of an unread loose equality run", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-sides");
		// A relation throws on a symbol, which `==` does not: it stays.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("a,b,c(),d,a()<b;");
		// An object's `valueOf` may run where conversions are not taken as pure.
		expect(minifyOnePass(source, { compress: { pure_conversions: false }, mangle: false }).code).toBe("a==b,c()!=d,a()<b;");
	});

	it("should keep only what the computed keys and values of an unread object run", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the");
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("a,x(),b(),c(),f();");
		// A key may convert an object running its `toString` where conversions are not taken as pure.
		expect(minifyOnePass(source, { compress: { pure_conversions: false }, mangle: false }).code).toBe("({[a]:x(),[b()]:1,get[c()](){},set d(v){},e:f()});");
	});

	it("should keep only what the computed keys of an unread class run", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-2");
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("a,c,x=(e,1);");
		// A static value, block, `extends` or key that may name `prototype`, or a key reading the class's own name, keeps it.
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-3"), { compress: {}, mangle: false }).code
		).toBe('(class{[a];static b=f()}),class{[a];static{f()}},class extends B{[a]},class{static[f()]=1},class{static["prototype"](){}},class C{[r(()=>C)](){}};');
		// A direct `eval` in a key may read the class's name too.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-4"), { compress: {}, mangle: false }).code).toBe('(class C{[r(()=>eval("C"))](){}});');
		// Beside a key that runs code, a static `prototype` keeps the class too, as making it throws.
		const throwing = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-5");
		expect(minifyOnePass(throwing, { compress: {}, mangle: false }).code).toBe('(class{[a()](){}static["prototype"](){}}),class{[a()];static["prototype"]=1},class{[a()];static[k()]=1};');
		const program = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-only-what-the-6");
		expect(runProgram(minifyOnePass(program, { compress: {}, mangle: false }).code)).toBe("TypeError\nTypeError\nTypeError");
	});

	it("should fold a value read only by its null check into the optional chain it prints as", () => {
		const source =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-read-only-by");
		// A member called bare would bind its object as `this`, so it stays apart.
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2020 }).code).toBe(
			"function f(){return g()?.b}function h(){return g()?.b.c[d](e)}function k(a){return a?.b}function l(){let a=o.m;return a?.()}function n(){return g()?.(1)}function p(){return o.m?.x()}"
		);
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2019 }).code).toBe(
			"function f(){let a=g();return a!=null?a.b:void 0}function h(){let a=g();return a==null?void 0:a?.b.c[d](e)}function k(a){return a!=null?a.b:void 0}function l(){let a=o.m;return a!=null?a():void 0}function n(){let a=g();return null!=a?a(1):void 0}function p(){let a=o.m;return a!=null?a.x():void 0}"
		);
		// Kept apart: a value printing in parentheses before `?.`, another branch
		// than `undefined`, a chain on another name, another test, no chain.
		const kept =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-read-only-by-2");
		expect(minifyOnePass(kept, { compress: {}, mangle: false, ecma: 2020 }).code).toBe(
			"function s(){let a=x+y;return a?.b}function t(){let a=g();return a!=null?a.b:1}function u(){let a=g();return a!=null?b.c(a):void 0}function v(){let a=g();return a!=null&&x?a.b:void 0}function w(){let a=g();return a!=null?a:void 0}function y(){let a=g();return b!=null?a.b(a):void 0}function z(){let a=g();return a===b?a.b:void 0}"
		);
		// A value printing as a constant: the test picks, or `?.` takes it whole.
		const constant =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-read-only-by-3");
		const constantCode = minifyOnePass(constant, { compress: {}, mangle: false, ecma: 2020 }).code;
		expect(constantCode).toBe("function i(){return`a`.y}function j(){return{p:-1}.p?.y}function q(){return(-1)?.y}function r(){return`1`.y}");
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
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
			"function f(a){return a+=1,a+=2}function h(i){return++i}function k(i){throw--i}function l(i){return i++**2}function n(a){return a+=g(),a}function p(i){return i++,i+1}function q(){const c=1;return c+=1,c}function r(a){with(o)a+=1;return a}"
		);
		// A script's global may be an accessor of the global object; a module's is not.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the-2"), { compress: {}, mangle: false }).code).toBe("var x;x++;throw x;");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the-2"), { compress: {}, mangle: false, module: true }).code).toBe("var x;throw++x;");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the-3"), { compress: {}, mangle: false, format: { ascii_only: true } }).code).toBe(
			"function f(caf\\u00e9){return++caf\\u00e9}g(f);"
		);
		const program = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-an-update-into-the-4");
		expect(runProgram(minifyOnePass(program, { compress: {}, mangle: false }).code)).toBe("2 9 4");
	});

	it("should merge the calls of a conditional differing in what one spread spreads", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-merge-the-calls-of-a");
		// A spread against a plain argument, or one printing as its items, stays.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
			"let x=g(),b=h();b(...x?c:d),b(...x||c),b(1,...x?c:d,2),new b(...x?c:d),x?b(...c):b(d),x?b(1,2):b(...d);"
		);
	});

	it("should merge the calls an `if` returns or throws from both branches", () => {
		const source =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-merge-the-calls-an-if");
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
			"function f(a){return[a]}function r(x){return f(x?1:2)}function t(x){throw f(x?1:2)}function n(x){return new f(x?2:1)}function c(x,y){return x?0:f(y?1:2)}g(r,t,n,c);"
		);
		// Parts longer than what the branches share, or spreads printing as their
		// items, stay apart.
		const kept =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-merge-the-calls-an-if-2");
		expect(minifyOnePass(kept, { compress: {}, mangle: false }).code).toBe(
			"function f(a){return[a]}function l(x){return x?f({a:1,b:2}):f({c:3,d:4})}function s(x){return x?f(1):f(2)}g(l,s);"
		);
		const program =
			fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-merge-the-calls-an-if-3");
		const { code } = minifyOnePass(program, { compress: {}, mangle: false });
		expect(code).toContain("return f(x?2:1)");
		expect(runProgram(code)).toBe("1 2 3");
	});

	it("should fold a value running nothing into the compound assignment after it", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-running");
		// A value running code would run after the target is read.
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2021 }).code).toBe(
			"var foo;function w(a){return a+=foo}function v(a){return a||=foo}function u(a){let x=g();return a+=x,a}w(),v(),u();"
		);
		// A global's read may run a getter, which could set the value first.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-fold-a-value-running-2"), { compress: {}, mangle: false }).code).toBe(
			"var foo;function w(a){let x=foo;return slot+=x,a}w();"
		);
	});

	it("should keep a null check whose chain a call, `delete` or tag reads as a reference", () => {
		// `(x?.m)()` would call `m` on `x`, and `delete(x?.m)` delete it.
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-keep-a-null-check-whose");
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2020 }).code).toBe(
			"function f(x){return(x!=null?x.m:void 0)()}function g(x){return delete(x!=null?x.m:void 0)}function h(x){return(x!=null?x.m:void 0)``}function k(x){return x?.m}"
		);
	});

	it("should drop a `for`'s own declarator nothing reads", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-drop-a-for-s-own");
		// A value running code stays, as does a constant its reads print.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("function f(){for(;;);}function g(){for(let i=0,n=h();;)k(i)}function m(){for(let c=32,d=0;d<c;d++)k(d)}k(f,g,m);");
	});

	it("should print a kept global constant's value where it reads shorter", () => {
		const source = fixture("javascript", "one-pass-minify-of-reads-and-calls-on-literals-should-print-a-kept-global");
		// A shorthand keeps the name it keys, and a name read three times stays, as it measured smaller once gzipped.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("const foo=1;log(1,{foo:foo});const many=2;log(many,many,many);");
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
		expect(code).toBe(
			"function made(x){return function(){return x}}function arrow(x){return()=>x}function declared(x){var outer=x;function g(){return outer}return[g,g]}function before(x){var f=function(){return outer},outer=x;return[f,f]}console.log(made(1)(),arrow(2)(),declared(3)[0](),before(4)[1]());"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold a value past an array literal of constants and names nothing writes", () => {
		const source = fixture("javascript", "one-pass-i3-2");
		const { code } = minifyOnePass(source, options);
		// A spread iterates and a call runs code, so the value stays before them.
		expect(code).toBe(
			"function nested(x){return[[3],[g(x),x]]}function holes(x){return[[,1],g(x)]}function spread(x){var y=g(x);return[[...x],y]}function call(x){var y=g(x);return[[h()],y]}function g(v){return v+1}function h(){return 0}console.log(nested(1),holes(2),spread([3]),call(4));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family K round 6", () => {
	const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };

	it("should read a name a null check assigns as its optional chain", () => {
		const source = fixture("javascript", "one-pass-K3-1");
		const { code } = minifyOnePass(source, options);
		// Babel's `(n=a.x)==null?void 0:n.y`, `===null||n===void 0` too; a `??` would leave `n` set and unread.
		expect(code).toBe(
			"function f(a){var n;return(n=a.x)?.y()}function g(a){var n;return(n=a.x)?.y}function h(a){var n;return(n=a.x)?.[0]}function k(a){var n;return(n=a.x)?.(1)}function l(a){var n;return(n=a.x)?.y}function m(a){var n;return(n=a.x)!=null?n:7}function p(a){var n;(n=a.x)?.y()}function q(a){var n;(n=a.x)?.y()}console.log(f({x:{y:()=>1}}),f({}),g({x:{y:2}}),h({x:[3]}),k({x:v=>v}),l({}),m({x:0})),p({x:{y:()=>console.log(`p`)}}),q({x:{y:()=>console.log(`q`)}}),p({}),q({});"
		);
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
		expect(minifyOnePass(source, options).code).toBe(
			"function f(a){var m;return a.x==null?void 0:m.y}function g(a){return(x=a.x)==null?void 0:x.y}function h(a){return a.x!=null?m:7}function k(a){var n;return(n+=a.x)==null?void 0:n.y}function l(a){var n;with(a)return(n=a.x)==null?void 0:n.y}function r(a){var eval;return(eval=a.x)==null?void 0:eval(1)}function s(a,b){var n;return(n=a.x)==b?void 0:n.y}function t(a,b){var n;return(n=a.x)===null||b?void 0:n.y}function u(a){var n;return(n=a.x)==null?void 0:n.y}"
		);
	});

	it("should drop the `!!` of a boolean `&&` or `||` where its parentheses go too", () => {
		const source = fixture("javascript", "one-pass-K3-3");
		// Beside a `,`, under another `&&` or an operator, the parentheses stay and so does `!!`.
		expect(minifyOnePass(source, options).code).toBe(
			"var v=a==b||c==d,w=a==b&&(c<d||e in f),x=a==b?c==d:!e,y=!!(a==b||c),z=[!!(g(a,b)==b||c==d)],u=p&&!!(a==b||c==d),t=a==b||c==d,s=!!(a==b||c==d)+1;console.log(v,w,x,y,z,u,t,s);"
		);
	});

	it("should merge the calls of a built-in's member a pure test picks between", () => {
		const source = fixture("javascript", "one-pass-K3-4");
		const { code } = minifyOnePass(source, options);
		// A local object's member may be a getter, a test may run code, and a computed key stays.
		expect(code).toBe(
			"function f(e,o){console.log(e||JSON.stringify(o))}function g(e){return Math.max(e?1:2,e)}function h(e,o){e?o.log(1):o.log(2)}function k(e){e()?console.log(1):console.log(2)}function l(e){e?console[e](1):console[e](2)}f(0,{a:1}),f(`x`),console.log(g(5),g(0));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a script's global a null check assigns, which may be an accessor", () => {
		const source = fixture("javascript", "one-pass-minify-family-k-round-6-should-keep-a-script-s-global-a-null-check");
		expect(minifyOnePass(source, options).code).toBe(source);
		expect(minifyOnePass(source, { ...options, module: true }).code).toBe(
			"var name;g((name=a.x)?.y);"
		);
	});
});

describe("one-pass minify, family L round 6", () => {
	it("should fold a `var` set after calls that reach no function of the body reading it", () => {
		const source = fixture("javascript", "one-pass-l3-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// An `if` calling `read` runs it before `value` is set, as a function or class handed to a call may; a global's call, a parameter or `eval` reaches none.
		expect(code).toBe("function early(){read()?console.log(\"set\"):console.log(\"unset\");var value=1;function read(){return value}return[read,read]}console.log(early()[1]());function builtIn(){console.log(\"built-in\");function read(){return 2}return[read,read]}console.log(builtIn()[1]());function handed(run){run(function(){return read()});var value=3;function read(){return value}return[read,read]}console.log(handed(function(f){console.log(f())})[1]());function arrow(run){run(()=>read());var value=4;function read(){return value}return[read,read]}console.log(arrow(function(f){console.log(f())})[1]());function named(run){run(read);var value=5;function read(){return value}return[read,read]}console.log(named(function(f){console.log(f())})[1]());function classes(run){class Reader{get(){return read()}}run(new Reader);var value=6;function read(){return value}return[read,read]}console.log(classes(function(r){console.log(r.get())})[1]());function expressed(run){run(new class{get(){return read()}});var value=7;function read(){return value}return[read,read]}console.log(expressed(function(r){console.log(r.get())})[1]());function passed(run){run(run);function read(){return 8}return[read,read]}console.log(passed(function(){})[1]());function evaluated(run){run(eval);var value=9;function read(){return value}return[read,read]}console.log(evaluated(function(){})[1]());function kept(target){var size=target.size(1),key=\"orientationchange\";function fire(){target.trigger(key)}target.bind(\"resize\",fire),target.bind(\"scroll\",fire),target.on[key]=function(handler){return handler?target.bind(key,handler):target.trigger(key)};if(target.flags)target.flags[key]=size}var target={size:function(n){return n},trigger:function(name){console.log(\"trigger\",name)},bind:function(name,f){console.log(\"bind\",name);if(\"function\"==typeof f)f()},on:{},flags:{}};kept(target),console.log(Object.keys(target.on).join(),target.flags.orientationchange);");
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family J round 6", () => {
	it("should drop an unread `pure_funcs` call, keeping what its arguments run", () => {
		const options = { compress: { ecma: 2020, pure_funcs: ["debug"] }, ecma: 2020, mangle: false };
		// terser's `pure_funcs`: the call goes, a call or a member read in its arguments stays; a returned one stays whole.
		expect(minifyOnePass(fixture("javascript", "one-pass-j3-1"), options).code).toBe(
			"function log(value){return console.log(value),value}function f(a,b){return log(a),b.length,debug(log(b))}f(1,[2,3]);"
		);
	});

	it("should guard what follows a run of `if`s leaving alike by their negated tests", () => {
		const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };
		const source = fixture("javascript", "one-pass-j3-2");
		const { code } = minifyOnePass(source, options);
		// Only tests dropping a `!` or flipping an equality join, `false||!a` among them; a run whose tests add a `!`, guarding an `if` or several statements, or ending its function stays.
		expect(code).toBe(
			"function log(value){console.log(value)}function guards(a,b,c){if(a!=1&&b&&c===a)log(`guards`)}function folds(a,b){if(a&&b!==2)log(`folds`)}function keepsName(a,b){if(a||!b)return;log(`keepsName`)}function keepsCompare(a,b){if(!a||b<2)return;log(`keepsCompare`)}function keepsIf(a,b){if(!a||!b)return;if(a>b)log(`keepsIf`)}function keepsSeveral(a,b){if(!a||!b)return;log(`keepsSeveral`),log(a+b)}function tests(a,b){!a||!b}function loops(list){for(var i=0;i<list.length;i++)if(list[i]&&list[i]==3)log(i)}for(var a=0;a<4;a++)for(var b=0;b<4;b++)guards(a,b,a),folds(a,b),keepsName(a,b),keepsCompare(a,b),keepsIf(a,b),keepsSeveral(a,b),tests(a,b);loops([0,3,1,3]);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
		// A test folding to a `!` drops it where what it negates needs no parentheses, as a comparison before `&&`; an assignment keeps it.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-j-round-6-should-guard-what-follows-a-run-of-if-s-leaving"), options).code).toBe("for(;a&&b<c;)d();!(b=c)?a():d();");
	});
	it("should keep the arguments of an unread pure call in a loop head together", () => {
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-family-j-round-6-should-keep-the-arguments-of-an-unread-pure-cal"), { compress: {}, mangle: false }).code
		).toBe("for((g(),h());a;);");
	});
});

describe("one-pass minify, round 6 review", () => {
	const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };

	it("should keep an alias of a `let` or `const` its declarator reads before the name is set", () => {
		const source =
			fixture("javascript", "one-pass-minify-round-6-review-should-keep-an-alias-of-a-let-or-const-its");
		expect(minifyOnePass(source, options).code).toBe(
			"function a(){var x=y;let y=1;return function(){return x}}function b(){var x=y;let y=1;return x}function c(){var x=g();return x+x}h(a,b,c);"
		);
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
		).toBe("function f(l){for(let x of l)g(()=>x)}function c(){let a=a;return a}h(f,c);");
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
		).toBe(
			"h((a,b,c)=>!!({}===a||b===c),(a,b)=>a===b||b===1,()=>[{value:1}][0].missing);"
		);
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
		expect(code).toBe("g(()=>({value:1}.missing),()=>({value:1}));");
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
		).toBe(
			"h(function f(v){return(f=v)!=null?f.answer:void 0},function(v){var n;return(n=v)?.answer});"
		);
	});
});

describe("one-pass minify, family O round 7", () => {
	it("should lift a test's or exit's operator past a sequence where it prints bare", () => {
		const source = fixture("javascript", "one-pass-o4-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A test the `if` joins to another, prints as a branch of `?:` or negates whole, or a last value an operator would take in parentheses, keeps the operator outside.
		expect(code).toBe("function step(value){return console.log(\"step\",value),value}function tests(x){if(step(1),!x)console.log(\"not\",x);if(step(2),-x)console.log(\"minus\",x);while(step(3),!x)x=1;if(step(4),!x)console.log(\"else\",x)}function exits(x){return x>1?-(step(5),x):!(step(6),x)}function guards(x){if(step(7),!x)console.log(\"guarded\",x)}function keeps(x,y){if(!(step(8),x+y))console.log(\"sum\",x);if(!(step(9),!x&&!y))console.log(\"both\",x);if(!y&&-(step(10),x))console.log(\"joined\",x)}function branches(c,x){return c?-(step(11),x)?console.log(\"then\",x):console.log(\"else\",x):console.log(\"other\",x),c?1:-(step(12),x)}function anded(t,a,b){if(!t&&(a!=1||b!=2))console.log(\"anded\",a,b)}function either(t,a,b){if(!t&&a!=1&&b!=2)console.log(\"either\",a,b)}function lone(x){if(!(step(13),x+1))console.log(\"lone\",x);while(step(14),-x)x=0;return step(15),-x}function negates(x){return!(step(16),!x)}function thrower(x){throw step(17),-x}for(let x of[0,1,2]){tests(x),console.log(exits(x)),guards(x),keeps(x,x-1),console.log(branches(x===1,x)),anded(x===2,x,2),either(x===2,x,2),console.log(lone(x),negates(x));try{thrower(x)}catch(error){console.log(\"caught\",error)}}");
		expect(runProgram(code)).toBe(runProgram(source));
		const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };
		// `await` lifts too; a template or regular expression in the text, or a `yield` last, keeps it.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a"), options).code).toBe("async function f(){if(a(),await b)c()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a-2"), options).code).toBe("if(!(a(`x`),b))c();");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a-3"), options).code).toBe("function*g(){if(!(a(),yield))c()}");
		// A sequence printing one value keeps no comma; a `!` of what takes parentheses stays.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a-4"), options).code).toBe("if(!x)y();");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-o-round-7-should-lift-a-test-s-or-exit-s-operator-past-a-5"), options).code).toBe("if(!(a(),!(b+c)))d();");
	});

	it("should negate a chain of `||` or `&&` whose links each flip only equalities or drop `!`s", () => {
		const source = fixture("javascript", "one-pass-o4-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A value read keeps a `!` that would leave no boolean; a link adding characters takes `!(`; an operand of `??`, `+` or a branch of `?:` keeps the chain whole.
		expect(code).toBe("function chains(a,b,c){if(a!=1&&b!=2&&c!=3)console.log(\"none\",a,b,c);if(a!==1||b!==2||c!==3)console.log(\"not all\",a,b,c);var v=!(a===1||b===2||!c),w=a!=1&&b!=2&&!c,u=!(a==1||b<2||c==3),t=a&&a!=1&&b!=2&&c!=3,s=a||a!=1||b!=2||c!=3,r=a&&!(a==1&&b==2&&c==3),q=c??!(a==1||b==2||c==3),p=1+!(a==1||b==2||c==3),o=c?!(a==1||b==2||c==3):0,n=a==1||b==2||c==3?2:1;if(!(a<1||b<2)&&c)console.log(\"unlinked\",a,b,c);console.log(v,w,u,t,s,r,q,p,o,n)}for(let a of[0,1])for(let b of[1,2])for(let c of[0,3])chains(a,b,c);");
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family R round 7", () => {
	it("should count a constant's reads that are computed keys as printing its value as cheaply", () => {
		const source = fixture("javascript", "one-pass-r4-1");
		const options = { compress: { ecma: 2022 }, ecma: 2022, module: true };
		// A member's key prints `.a` either way, and a key, a pattern's too, `a` for `[n]`; a number, or a string no name spells, reads as other names do.
		expect(minifyOnePass(source, options).code).toBe(
			"export function keys(o){let{_foo:k}=o;return[{_foo:o._foo,k},class{_foo(){return o._foo}static _foo=1},o[1],o[1],o[`a-b`],o[`a-b`],{\"a-b\":1},{\"a-b\":2},o.x]}export function plain(o){return[o._bar,o._bar,{[o.x]:`_bar`,k:`_bar`},`_bar`.big,`_bar`[o.i]]}"
		);
		// Kept computed, or renamed, a key reads as other names do.
		const kept =
			"export function keys(o){let t=`_foo`,{[t]:k}=o;return[{[t]:o._foo,k},class{[t](){return o._foo}static[t]=1},o[1],o[1],o[`a-b`],o[`a-b`],{[`a-b`]:1},{[`a-b`]:2},o.x]}export function plain(o){return[o._bar,o._bar,{[o.x]:`_bar`,k:`_bar`},`_bar`.big,`_bar`[o.i]]}";
		expect(
			minifyOnePass(source, { ...options, compress: { ecma: 2022, computed_props: false } }).code
		).toBe(kept);
		expect(
			minifyOnePass(source, { ...options, mangle: { properties: { regex: /^_/ } } }).code
		).toBe(
			"export function keys(o){let t=`_foo`,{[`_foo`]:k}=o;return[{[`_foo`]:o._foo,k},class{[`_foo`](){return o._foo}static[`_foo`]=1},o[1],o[1],o[`a-b`],o[`a-b`],{[`a-b`]:1},{[`a-b`]:2},o.x]}export function plain(o){return[o._bar,o._bar,{[o.x]:`_bar`,k:`_bar`},`_bar`.big,`_bar`[o.i]]}"
		);
	});

	it("should print a `return` pair with a boolean as `||` or `&&`", () => {
		const source = fixture("javascript", "one-pass-r4-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A test giving a boolean only; a conditional or an assignment test takes parentheses, one setting nothing printing its value.
		expect(code).toBe(
			'function or(t,e){return t===0||e.length}function and(t,e){return t>1&&e.length}function orElse(t,e){return t===0||e.length}function andElse(t,e){return t>1&&e.length}function wrapped(a,b,e){return(a?b<0:b>9)||e.length}function setting(a,b,e){return(b?b<0:b>9)||e.length}function value(t,e){return t?!0:e.length}for(let t of[0,1,2,-1,10])console.log(or(t,"ab"),and(t,"ab"),orElse(t,"ab"),andElse(t,"ab")),console.log(wrapped(t,t,"ab"),setting(t,t,"ab"),value(t,"ab"));'
		);
		expect(runProgram(code)).toBe(runProgram(source));
		// Negating the test measured larger gzipped.
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-family-r-round-7-should-print-a-return-pair-with-a-boolean-as-or"),
				{ compress: {}, mangle: false }
			).code
		).toBe("function f(t,e){return t===0?!1:e.length}function g(t,e){return t>1?e.length:!0}");
	});
});

describe("one-pass minify, family P round 7", () => {
	it("should join a `var` to the one before it where a later declarator prints apart", () => {
		const source = fixture("javascript", "one-pass-p4-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// The statement after it is no `var` to join; one opening with a value printed apart, or a `let`, stays apart.
		expect(code).toBe("function make(name){return function(value){return console.log(name,value),function(next){return console.log(name,value,next),next}}}function joins(require){var first=require(1),second=first(2);first(3);var third=first(4);return[second,second,third,third]}console.log(joins(make(\"joins\")));function opensApart(require){var first=require(1);first(2);var second=first(3);return[second,second]}console.log(opensApart(make(\"opensApart\")));function opensNew(require){var first=require(1);new first(2);var[second]=[first(3)];return[second,second]}console.log(opensNew(make(\"opensNew\")));function lets(require){let first=require(1),second=first(2);first(3);return[second,second]}console.log(lets(make(\"lets\")));");
		// Every call returns a function, so the source runs to its end.
		expect(runProgram(source)).not.toContain("throws");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a call in place passed `this` as its statements", () => {
		const source = fixture("javascript", "one-pass-p4-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// Only a function declaration's or a program's `this`, which no `super()` sets; a parameter `delete` takes stays.
		expect(code).toBe("function Item(name){if(!(this instanceof Item))throw TypeError(\"Cannot call a class as a function\");this.name=name}console.log(new Item(\"item\").name);try{Item(\"called\")}catch(error){console.log(error.message)}function Short(value){console.log({self:typeof this}),this.value=value}console.log(new Short(1).value);function Deletes(){!function(self){console.log(delete self)}(this)}new Deletes;var Expressed=function(){!function(self){self.kept=1}(this)};console.log((new Expressed).kept);class Base{}class Derived extends Base{constructor(){super();var arrow=()=>{!function(self){self.set=1}(this)};arrow(),arrow()}}console.log((new Derived).set),console.log(typeof this);class Early extends Base{constructor(){!function(self){console.log(\"before\"),self.early=1}(this),super()}}try{new Early}catch(error){console.log(error.constructor.name)}");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should pair an `if` leaving with the exit after statements running nothing", () => {
		const source = fixture("javascript", "one-pass-p4-3");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A `;` or an `if` of a literal with an empty body goes; one reading a name stays between.
		expect(code).toBe("function loading(props){return props.pastDelay,null}console.log(loading({pastDelay:!0}),loading({}));function chained(props){return props.error?\"error\":props.timedOut?\"timed out\":\"loading\"}console.log(chained({error:1}),chained({timedOut:1}),chained({}));function thrown(props){throw props.error?\"error\":\"other\"}try{thrown({})}catch(error){console.log(error)}function kept(props){if(props.error)return\"error\";props.read;return\"kept\"}console.log(kept({read:1}));function commented(props){return props.error?\"error\":\"commented\"}console.log(commented({}));function last(props){if(props.error)return\"error\"}console.log(last({}));");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should join statements into the `return` an `if` of a known test keeps", () => {
		const source = fixture("javascript", "one-pass-p4-4");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A branch printing as no `return`, or `var`s the gone one hoists, stay apart.
		expect(code).toBe("function noSSR(initializer,options){return delete options.webpack,delete options.modules,initializer(options)}function log(value){return console.log(Object.keys(value).join()),value}console.log(noSSR(log,{webpack:1,modules:2,loading:3}).loading);function elseKept(options){return log(options),options.loading}console.log(elseKept({loading:4}));function several(options){return log(options),log(options),options.loading}console.log(several({loading:5}));function nothing(options){log(options)}console.log(nothing({loading:6}));function hoisted(options){log(options);var kept;return kept}console.log(hoisted({loading:7}));function branchless(options){return log(options),options.loading}console.log(branchless({loading:8}));");
		expect(runProgram(code)).toBe(runProgram(source));
		// A call of a name spelled as `return` opens is no `return`.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-p-round-7-should-join-statements-into-the-return-an-if-of"), { compress: {}, mangle: false }).code).toBe("function f(o){g(o);returnValue(o)}");
	});

	it("should drop a directive no engine reads", () => {
		const source = fixture("javascript", "one-pass-p4-5");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// terser's `directives`: `use strict` and `use asm` stay, as does one spelled with escapes.
		expect(code).toBe("function typeOf(value){return typeof value}console.log(typeOf(1));function strict(){\"use strict\";return this}console.log(strict());function escaped(){\"\\x75se custom\";return 2}console.log(escaped());");
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family W round 8", () => {
	it("should print an arrow body ending in an `if` returning in its `else` too as one `?:`", () => {
		const source = fixture("javascript", "one-pass-w5-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// What follows it never runs; a `var` it hoists keeps the braces, and a test a fold opens with `{` takes parentheses.
		expect(code).toBe("const pick=value=>value?\"yes\":\"no\",chain=value=>value===1?\"one\":value===2?\"two\":\"many\",object=value=>value?1:2,hoisted=value=>{return value?later:2;var later},folded=value=>({a:value}.a()?1:2);console.log(pick(1),pick(0),chain(1),chain(2),chain(3)),console.log(object(1),object(0),hoisted(1),hoisted(0),folded(()=>1),folded(()=>0));");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print the expressions opening an arrow body before its `return` chain as one sequence", () => {
		const source = fixture("javascript", "one-pass-w5-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A statement opening with `{` keeps the braces.
		expect(code).toBe("const log=value=>console.log(\"log\",value),sequence=value=>(log(value),value?1:2),several=value=>(log(value),log(value>1?value:-value),value?1:value===0?0:2),ambiguous=value=>{({}).a=value;return value?1:2};console.log(sequence(1),sequence(0),several(2),several(0),ambiguous(1));");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop what follows a `switch` folding to a branch that always leaves", () => {
		const source = fixture("javascript", "one-pass-w5-3");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A `break`, a `var` it hoists or a label holding it keeps what follows.
		expect(code).toBe("const mode=\"production\";function picked(){for(let item of[1])console.log(item);console.log(\"production\");return\"expected\"}function broken(){console.log(\"broken\");return\"after\"}function hoisting(){return later;var later}function labeled(flag){label:{if(flag)break label;return\"labeled\"}return\"rest\"}console.log(picked(),broken(),hoisting(),labeled(1),labeled(0));");
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family T round 8", () => {
	it("should evaluate an argument at its parameter's one read, run first", () => {
		const source = fixture("javascript", "one-pass-t5-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A later argument running code, a read after code, statements before the `return` or a call staying a call keep it passed.
		expect(code).toBe("function make(name){return function(value){return console.log(name,\"object\"==typeof value?JSON.stringify(value):value),value}}var load=make(\"load\");function first(require){return require({value:1}).value+1}console.log(first(load));function arrow(require){return require({value:2}).value*2}console.log(arrow(load));function constantAfter(require){return require({value:3}).value+4}console.log(constantAfter(load));function laterRuns(require){return function(module,extra){return module.value+extra}(require({value:5}),require(6))}console.log(laterRuns(load));function readLater(require){return function(module){return require(7)+module.value}(require({value:8}))}console.log(readLater(load));function statements(require){return function(module){return console.log(\"runs\"),module.value}(require({value:9}))}console.log(statements(load));function written(require){var base=10;return base++,function(offset,module){return module.value+offset}(base,require({value:11}))}console.log(written(load));");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should declare a parameter set to the argument before the declarator its call is the value of", () => {
		const source = fixture("javascript", "one-pass-t5-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// `var`s share a name; a `let` or `const` beside one of it, a name the holder has, a declarator gone, a body written twice or two arguments keep the call.
		expect(code).toBe("function make(name){return function(value){return console.log(name,\"object\"==typeof value?JSON.stringify(value):value),value}}var load=make(\"load\");function interop(require){var obj=require({__esModule:!0,default:\"react\"}),_react=obj&&obj.__esModule?obj:{default:obj};return[_react.default,_react.default]}console.log(interop(load));function shared(require){var obj=require({x:1}),a=obj&&obj.x?obj:{x:obj},obj=require({y:2}),b=(obj.y,obj);return[a.x,a.x,b.y,b.y]}console.log(shared(load));function lexical(require){let o=require({x:3}),a=o.x+o.x;console.log(a,a);{let b=function(o){return o.y*o.y}(require({y:4}));console.log(b,b)}}lexical(load);function written(require,value){var o=value=require(value),a=o-o;return[a,a]}console.log(written(load,5));function collides(require){var o=require(1),a=function(o){return o/o}(require(2));return[a,a,o]}console.log(collides(load));function collapsed(require){return function(o){return o+1+o}(require(7))}console.log(collapsed(load));function repeated(require){var a=function(o){return o+2+o}(require(8)),b=function(o){return o+2+o}(require(9)),c;return[a,a,b,b,c]}console.log(repeated(load));function twoArguments(require){var a=function(o){return o+3+o}(require(10),1);return[a,a]}console.log(twoArguments(load));");
		expect(runProgram(code)).toBe(runProgram(source));
		// A program's names are its own only with `toplevel`.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument"), { compress: { toplevel: true }, mangle: false }).code).toBe("var o=r(1),a=o.x+o.y;use(a,a);");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-2"), { compress: {}, mangle: false }).code).toBe("var a=function(o){return o.x+o.y}(r(1));use(a,a);");
		// Mangled, a `using`, a spread passed or a function reading its `this` keeps the call.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-3"), { compress: {}, mangle: true }).code).toBe("function f(r){var n=function(r){return r.x+r.y}(r(1));return[n,n]}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-4"), { compress: {}, mangle: false }).code).toBe("function f(r){{using a=function(o){return o.x+o.y}(r(1));use(a,a)}}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-5"), { compress: {}, mangle: false }).code).toBe("function f(r){var a=function(o){return o.x+o.y}(...r);return[a,a]}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-t-round-8-should-declare-a-parameter-set-to-the-argument-6"), { compress: {}, mangle: false }).code).toBe("function f(r){var a=function(o){return this.x+o.y+o}(r());return[a,a]}");
	});
});

describe("one-pass minify, family V round 8", () => {
	it("should join a `var` set by both branches of an `if` as its value", () => {
		const source = fixture("javascript", "one-pass-v5-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// An `else` chain joins; an `if` without `else`, a branch running more, setting another or compounding, or a comment, keeps it apart.
		expect(code).toBe("function pick(flag){return(flag?\"yes\":flag===0?\"zero\":\"no\")+\"!\"}console.log(pick(1),pick(0),pick(\"\"));function partial(flag){var value;if(flag)value=\"set\";return value}console.log(partial(1),partial(0));function more(flag){var value;if(flag){value=1;for(var key in flag)console.log(key)}else value=2;return value}console.log(more({a:1}),more(0));function other(flag,box){var value;return flag?value=1:box.value=2,value}console.log(other(1,{}),other(0,{}));function adds(flag){var value;return flag?value=1:value+=2,value}console.log(adds(1),adds(0));function calls(flag){var value;return flag?value=1:console.log(\"calls\"),value}console.log(calls(1),calls(0));function exits(flag){var value;if(flag)value=1;else return 2;return value}console.log(exits(1),exits(0));function commented(flag){var value;if(flag)value=1;/*! kept */else value=2;return value}console.log(commented(1),commented(0));");
		expect(runProgram(code)).toBe(runProgram(source));
		// A function the assignment names, or a test or value reading the name, stays apart.
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-family-v-round-8-should-join-a-var-set-by-both-branches-of-an-if"),
				{ compress: {}, mangle: false }
			).code
		).toBe(
			"function f(t){var v;v=t?function(){}:2;return[v]}function g(t){var v;v=t?class{}:()=>{};return[v]}function h(t){var v;v=t?\"a\":typeof v;return[v]}function k(t){var v;v=v===t?\"a\":\"b\";return[v]}function m(t){var v;v=t?function(){}:2;return[v]}"
		);
		// Branches printing alike as an operation print once, after the test.
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-family-v-round-8-should-join-a-var-set-by-both-branches-of-an-if-2"), {
				compress: {},
				mangle: false
			}).code
		).toBe("var x=(y,2);g(x,(y,a+b));");
	});

	it("should print a `return` pair giving its test back as `||`", () => {
		const source = fixture("javascript", "one-pass-v5-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		// A side taking parentheses, another name returned or a comment keeps `?:`.
		expect(code).toBe("function first(value,fallback){return value||fallback()}console.log(first(\"given\",String),first(\"\",()=>\"fallback\"));function withElse(value){return value||\"else\"}console.log(withElse(1),withElse(0));function joined(value,other){return value||other||\"none\"}console.log(joined(1,2),joined(0,2),joined(0,0));function conditional(value,other){return value?value:other?\"yes\":\"no\"}console.log(conditional(1,0),conditional(0,1),conditional(0,0));function nullish(value,other){return value?value:other??\"nullish\"}console.log(nullish(1,2),nullish(0,null));function differs(value,other){return value?other:\"differs\"}console.log(differs(1,2),differs(0,2));function commentedValue(value,other){return value?/*! value */value:other}console.log(commentedValue(1,2),commentedValue(0,2));");
		expect(runProgram(code)).toBe(runProgram(source));
		// `&&` on the other side measured larger gzipped, and a comment on the test stays.
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-family-v-round-8-should-print-a-return-pair-giving-its-test-back"),
				{ compress: {}, mangle: false }
			).code
		).toBe("function f(v,o){return v?v:o&&o.length}function g(v,o){/*! c */return v?v:o}");
	});
});

describe("one-pass minify, family S round 8", () => {
	const keeps = { compress: { keepFnames: true, keepClassnames: true }, mangle: false };
	const folds = { compress: {}, mangle: false };

	it("should keep the name a declarator gives an anonymous function or class its one read would lose, where `keepFnames` or `keepClassnames` keeps it", () => {
		const source = fixture("javascript", "one-pass-s5-1");
		const { code } = minifyOnePass(source, keeps);
		// Only a call or a tag of a function shows nothing of its name, but through `arguments.callee`; a class's static block reads its own.
		expect(code).toBe("function show(value){return value.name}function declared(){var made=function(){};return show(made)}function classes(){var made=class{};return made.name}function arrows(){var made=()=>1;return made.name}function properties(){var made=function(){};return made.name}function called(){return\"called\"}function tagged(){return(parts=>parts[0])`tagged`}function callee(){var made=function(){return arguments.callee.name};return made()}function staticName(){var made=class{static{console.log(\"static\",this.name)}};try{made()}catch(error){return error.constructor.name}}console.log(declared(),classes(),arrows(),properties(),called(),tagged(),callee(),staticName());");
		expect(runProgram(code)).toBe(runProgram(source));
		// Under the defaults, as terser, no name is promised: the old folds stay.
		expect(minifyOnePass(source, folds).code).toBe("function show(value){return value.name}function declared(){return show(function(){})}function classes(){return class{}.name}function arrows(){return[()=>1][0].name}function properties(){return{other:function(){}}.other.name}function called(){return\"called\"}function tagged(){return(parts=>parts[0])`tagged`}function callee(){return function(){return arguments.callee.name}()}function staticName(){var made=class{static{console.log(\"static\",this.name)}};try{made()}catch(error){return error.constructor.name}}console.log(declared(),classes(),arrows(),properties(),called(),tagged(),callee(),staticName());");
	});

	it("should keep the name an assignment gives an anonymous function its read would lose, where `keepFnames` keeps it", () => {
		const source = fixture("javascript", "one-pass-s5-2");
		const { code } = minifyOnePass(source, keeps);
		// The default folds it, the value taking no parentheses the assignment took.
		expect(code).toBe("function show(value){return value.name}function assigned(){var made=function(){};return show(made)}function inPlace(made){return(made=function(){}).name}function chained(){var inner;return(outer=inner=function(){}).name}function calledAssigned(){return\"called\"}var outer;console.log(assigned(),inPlace(),chained(),calledAssigned());");
		expect(runProgram(code)).toBe(runProgram(source));
		// Under the defaults, as terser, no name is promised: the old folds stay.
		expect(minifyOnePass(source, folds).code).toBe("function show(value){return value.name}function assigned(){return show(function(){})}function inPlace(made){return function(){}.name}function chained(){return(outer=function(){}).name}function calledAssigned(){return\"called\"}var outer;console.log(assigned(),inPlace(),chained(),calledAssigned());");
	});

	it("should keep a folded anonymous function or class a naming place holds unnamed as `(0,f)`, where `keepFnames` or `keepClassnames` keeps names", () => {
		const source = fixture("javascript", "one-pass-s5-3");
		const { code } = minifyOnePass(source, keeps);
		// Where the test and the part going are no longer than `(0,)`, the expression stays; a computed key or an element names nothing; a known test keeps a function or class unnamed in either mode.
		expect(code).toBe("var or=0||function(){},nullish=(0,function(){}),wrapped=(0,()=>1),picked=(0,()=>1),kept=1?function(){}:0,keyed={[()=>1]:1},bare=[()=>1],assigned=(0,class{});function defaulted(value=(0,()=>1)){return value.name}var object={value:(0,()=>1)};class Field{value=(0,()=>1)}console.log(or.name,nullish.name,wrapped.name,picked.name,kept.name,Object.keys(keyed).length,bare[0].name),console.log(assigned.name,defaulted(),object.value.name,(new Field).value.name);");
		expect(runProgram(code)).toBe(runProgram(source));
		// Under the defaults, as terser, no name is promised: the old folds stay.
		expect(minifyOnePass(source, folds).code).toBe("var or=function(){},nullish=function(){},wrapped=()=>1,picked=()=>1,kept=1?function(){}:0,keyed={[()=>1]:1},bare=[()=>1],assigned=class{};function defaulted(value=()=>1){return value.name}var object={value:()=>1};class Field{value=()=>1}console.log(or.name,nullish.name,wrapped.name,picked.name,kept.name,Object.keys(keyed).length,bare[0].name),console.log(assigned.name,defaulted(),object.value.name,(new Field).value.name);");
		const modules = { compress: { keepFnames: true, keepClassnames: true }, mangle: false, module: true };
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or"), modules).code).toBe("x=void 0??(()=>/*! c */1);");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-2"), modules).code).toBe("var r=function(){};export default r;");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-3"), { ...modules, compress: {} }).code).toBe("export default(0,class{});");
		// An `if` or `?:` setting one name either way keeps the value it names.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-4"), keeps).code).toBe("function f(y){var x;return y?x=function(){}:x=2,x}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-5"), keeps).code).toBe("function f(y){var x;return y?x=function(){}:x=2,x}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-6"), folds).code).toBe("function f(y){var x;return x=y?function(){}:2,x}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-7"), keeps).code).toBe("function f(y,o){o.p=y?function(){}:2}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-folded-anonymous-function-or-8"), keeps).code).toBe("function f(y){var x;return y===1?x=function(){}:x=2,x}");
	});

	it("should keep a call in place returning an anonymous function where its place would name it, where `keepFnames` keeps names", () => {
		const source = fixture("javascript", "one-pass-s5-4");
		const { code } = minifyOnePass(source, keeps);
		expect(code).toBe("var made=function(){return function(){}}(),arrow=(()=>()=>1)();console.log(made.name,arrow.name,[()=>1][0].name);");
		expect(runProgram(code)).toBe(runProgram(source));
		// Under the defaults, as terser, no name is promised: the old folds stay.
		expect(minifyOnePass(source, folds).code).toBe("var made=function(){},arrow=()=>1;console.log(made.name,arrow.name,[()=>1][0].name);");
	});

	it("should print the value of an assignment setting nothing without the parentheses the assignment took", () => {
		// Opening a statement, a function keeps them; a value set through two names alike.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting"), folds).code).toBe("function f(o,i){return[1].length}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting-2"), folds).code).toBe("function f(o,i){(function(){}).x=1}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting-3"), { ...folds, module: true }).code).toBe("export function r(){return function(){}.name}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting-4"), { ...folds, module: true }).code).toBe("export function r(){return 2}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-print-the-value-of-an-assignment-setting-5"), { ...folds, module: true }).code).toBe("export function r(){return(0,a.b)()}");
	});

	it("should keep a moved function or a folded value from printing bare as a picked element read off", () => {
		// A low-binding value stays in its literal under a member, call or operator.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value"), folds).code).toBe("function g(){return[()=>1][0].name}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-2"), folds).code).toBe("function g(a,b){return[a+b][0].x}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-3"), folds).code).toBe("function g(a,b){return{k:a?b:1}.k*2}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-4"), folds).code).toBe("function g(a,b){return[(a(),b)][0]}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-5"), folds).code).toBe("function g(a,b){var r=a+b;h(r),k({p:r})}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-6"), folds).code).toBe("function g(a,b){return a+b}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-7"), folds).code).toBe("function g(a,b){throw a+b}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-8"), folds).code).toBe("function g(a,b){return x=a+b}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-9"), folds).code).toBe("function g(a,b){h(a+b)}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-10"), folds).code).toBe("function g(a,b){return[a+b]}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-11"), folds).code).toBe("function g(a,b){return{p:a+b}}");
		expect(runProgram("function g(a,b){var r=a+b;return[r][0].toFixed(1)}console.log(g(1,2))")).toBe(runProgram(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-should-keep-a-moved-function-or-a-folded-value-12"), folds).code));
	});
});

describe("one-pass minify, family S round 8, switches", () => {
	const options = { compress: {}, mangle: false };

	it("should print a `switch` of a case and a `default` each running one expression as `?:`", () => {
		const source = fixture("javascript", "one-pass-s5-5");
		const { code } = minifyOnePass(source, options);
		// One `=` setting the same name takes the test as its value.
		expect(code).toBe("function one(){console.log(\"one\")}function other(){console.log(\"other\")}var result;function runs(kind){kind===1?one():other(),console.log(\"after\")}function sets(kind){result=kind===1?\"one\":\"other\"}runs(1),runs(2),sets(1),console.log(result),sets(2),console.log(result);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep the `if` a `switch` prints as where `?:` would read otherwise or grow", () => {
		// A call of one callee, a part one side repeats, a sequence, or a test opening as a declaration.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as"), options).code).toBe("a===1?f():g();");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-2"), options).code).toBe("if(a===1)f(1);else f(2);");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-3"), options).code).toBe("if(a===1)f(b);else b;");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-4"), options).code).toBe("if(a===1)f(),g();else h();");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-5"), options).code).toBe("if(function(){}.x===1)f();else g();");
		// An assignment printing as another operator sets no name the other's `=` shares.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-6"), options).code).toBe("function f(a){var y=g();return a===1?y+=1:y=b,y}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-s-round-8-switches-should-keep-the-if-a-switch-prints-as-7"), options).code).toBe("function f(a){var y=g();return a===1?y=b:y+=1,y}");
	});
});

describe("one-pass minify, family B round 9", () => {
	const options = { compress: {}, mangle: false };

	it("should join string literals where the joined one prints shorter in the quotes it takes", () => {
		const source = fixture("javascript", "one-pass-b9-1");
		const { code } = minifyOnePass(source, options);
		// Counted in the quotes it prints with, not as JSON escapes them; one
		// whose quotes the joined string would escape stays apart.
		expect(code).toBe("function warn(name,ref){console.log('Component \"%s\" contains the string ref \"%s\". Support for string refs will be removed in a future major release.',name,ref)}function quoted(){return'Say \"hi\" or \"bye\"'}function escaped(){return\"tab\\tnew\\nline\"}warn(\"a\",\"b\"),console.log(quoted(),escaped());function mixed(){return\"''''\"+'\"\"\"\"'}console.log(mixed());");
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify, family Y round 9", () => {
	const options = { compress: {}, mangle: false };

	it("should merge the tests of a chain of conditionals sharing a branch in one pass", () => {
		const source = fixture("javascript", "one-pass-y9-1");
		const { code } = minifyOnePass(source, options);
		// `a?x:b?x:c?x:y` joins all three tests, with `&&` and `||` mixed.
		expect(code).toBe("function kind(a,b,c){return a||b||c?\"small\":\"large\"}function all(a,b,c){return a&&b&&c?\"yes\":\"no\"}function mixed(a,b,c){return a&&(b||c)?1:2}function other(a,b,c){return a||b&&c?1:2}function x(){console.log(\"x\")}function y(){console.log(\"y\")}function run(a,b,c){a||b||c?x():y()}for(let a of[0,1])for(let b of[0,1])for(let c of[0,1])console.log(kind(a,b,c),all(a,b,c),mixed(a,b,c),other(a,b,c)),run(a,b,c);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should merge the tests of nested `if`s printing as a conditional sharing a branch", () => {
		const source = fixture("javascript", "one-pass-y9-2");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe("function x(){console.log(\"x\")}function y(){console.log(\"y\")}function nested(a,b,c){a&&(b||c)?x():y()}nested(1,0,1),nested(0,1,1),nested.length||nested?x():y();");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a third test apart where the merged branches share `void 0`, and parenthesize a merged test as needed", () => {
		// Babel's optional chains merge two links at a time, as before.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-y-round-9-should-keep-a-third-test-apart-where-the-merged"), options).code).toBe("f(a==null?void 0:b==null||c==null?void 0:c.d);");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-y-round-9-should-keep-a-third-test-apart-where-the-merged-2"), options).code).toBe("f(a||b||(c=g())?1:2,a&&b&&(c??d)?1:2);");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-y-round-9-should-keep-a-third-test-apart-where-the-merged-3"), options).code).toBe("f(a&&(b||c&&d)?1:2,a||b&&(c||d)?1:2);");
	});
});

describe("one-pass minify, family Z round 9", () => {
	const options = { compress: {}, mangle: false };

	it("should join the tests of `if`s returning or throwing the same before a last exit with `||`", () => {
		const source = fixture("javascript", "one-pass-Z6-1");
		const { code } = minifyOnePass(source, options);
		// A test `||` would read otherwise keeps parentheses.
		expect(code).toBe("function label(node){return node.type===\"a\"||node.type===\"b\"&&node.flag||!node.type?node.value.name:\"other\"}function check(node){throw node.bad||node.type==null?Error(\"invalid \"+node.type):TypeError(\"unknown \"+node.type)}function pick(a,b,c){return(a??b)||(b??c)||(a=b)?String(c):String(a)}const nodes=[{type:\"a\",value:{name:\"x\"}},{type:\"b\",flag:!0,value:{name:\"y\"}},{type:\"b\",value:{name:\"z\"}},{value:{name:\"w\"}}];for(let node of nodes)console.log(label(node));for(let node of[{bad:!0,type:\"q\"},{},{type:\"r\"}])try{check(node)}catch(error){console.log(error.message)}console.log(pick(null,0,1),pick(null,null,2),pick(null,null,null));");
		expect(runProgram(code)).toBe(runProgram(source));
		// A negated test joins as it is; an assignment setting nothing as its value.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-join-the-tests-of-if-s-returning-or-thro"), options).code).toBe("function f(a,b){return a||!b?o.value:g()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-join-the-tests-of-if-s-returning-or-thro-2"), options).code).toBe("function f(){return g()||c?o.value:d()}");
	});

	it("should keep `?:` of `if`s returning the same where another fold or gzip favors it", () => {
		// A value of four characters or fewer, a boolean, or the last exit giving it too.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an"), options).code).toBe("function f(a,b){return a?x.y:b?x.y:g()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an-2"), options).code).toBe("function f(a,b){return a?!0:b?!0:c()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an-3"), options).code).toBe("function f(a,b){return a?o.value:o.value}");
		// The second test reading the name returned, there or after: `||` or `&&` of it.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an-4"), options).code).toBe("function f(a,value){return a?value:value||g()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-of-if-s-returning-the-same-where-an-5"), options).code).toBe("function f(a,other){return a?o.value:other&&o.value}");
	});

	it("should print an `else` after an `if` leaving its function or loop bare inside the negated `if`, the expressions after joining it", () => {
		const source = fixture("javascript", "one-pass-Z6-2");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe("const log=[];function track(event){if(event)log.push(\"event\"),log.push(event)}function flush(queue){if(queue.length!==0)log.push(\"flush\"),log.push(queue.length),queue.length=0,log.push(\"done\")}function each(items){for(let item of items)if(item!==0)log.push(\"item\"),log.push(item)}track(\"a\"),track(\"\"),flush([1,2]),flush([]),each([1,0,2]),console.log(log.join());");
		expect(runProgram(code)).toBe(runProgram(source));
		// A dropped expression of the `else`, and a statement printing nothing after.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-print-an-else-after-an-if-leaving-its-fu"), options).code).toBe("function f(){if(!x)g(),w()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-print-an-else-after-an-if-leaving-its-fu-2"), options).code).toBe("function f(){if(!x)z(),w()}");
	});

	it("should keep `return;` before an `else` where the block would not print as one expression", () => {
		// An `else` or a statement after that is no expression, an exit after, or an `if` returning a value.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-return-before-an-else-where-the-blo"), options).code).toBe("function f(){if(x)return;for(;;)g();w()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-return-before-an-else-where-the-blo-2"), options).code).toBe("function f(){if(x)return;z();w();if(q)v()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-return-before-an-else-where-the-blo-3"), options).code).toBe("function f(){if(x)return;z();return w(),5}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-z-round-9-should-keep-return-before-an-else-where-the-blo-4"), options).code).toBe("function f(){if(x)return 1;g();w()}");
	});
});

describe("one-pass minify, family X round 9", () => {
	const folds = { compress: {}, mangle: false };

	it("should print the `!!x` a call in place returns as `x` where only its truth is read", () => {
		const source = fixture("javascript", "one-pass-x6-1");
		const { code } = minifyOnePass(source, folds);
		expect(code).toBe("function check(node){if(node.flags&4)console.log(\"flagged\");if(node.c&&(node.a||node.b))console.log(\"either\");if(node.c||node.a&&node.b)console.log(\"listed\");if(!node.name)console.log(\"unnamed\");if(!(node.flags&8))console.log(\"unmarked\")}function value(node){return!!(node.flags&4)}check({flags:4,a:1,b:1,c:1}),check({flags:8,name:\"n\"}),console.log(value({flags:4}));");
		expect(runProgram(code)).toBe(runProgram(source));
		// A test takes any operation bare, a `?:` test not every one; `!x`, a sequence or a folded `!!` stay.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x"), folds).code).toBe("function f(t){if(t.a??t.b)k()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-2"), folds).code).toBe("function f(t){if(t.a||t.b)k()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-3"), folds).code).toBe("function f(t){if(c||t.a||t.b)k()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-4"), folds).code).toBe("function f(t){if(!(t.a||t.b))k()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-5"), folds).code).toBe("function f(t){return(t.a?t.b:t.c)?1:2}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-6"), folds).code).toBe("function f(t){if(!t.x)k()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-7"), folds).code).toBe("function f(t){if((g(),!!t.x))k()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-the-x-a-call-in-place-returns-as-x-8"), folds).code).toBe("function f(t,u){if((t===u))k()}");
	});

	it("should print an `&&` or `||` a call in place returns bare beside the same operator", () => {
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-or-a-call-in-place-returns-bare"), folds).code).toBe("function f(e){if(c&&e.a&&e.b)g()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-or-a-call-in-place-returns-bare-2"), folds).code).toBe("function f(e){return c||e.a||e.b}");
		// Another operator, or one that is no such chain, keeps them.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-or-a-call-in-place-returns-bare-3"), folds).code).toBe("function f(e){return c&&(e.a||e.b)}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-or-a-call-in-place-returns-bare-4"), folds).code).toBe("function f(e){return c+(e.a+e.b)}");
	});

	it("should print an `if` setting one member alike in both branches as one assignment of `?:`", () => {
		const source = fixture("javascript", "one-pass-x6-2");
		const { code } = minifyOnePass(source, folds);
		expect(code).toBe("var copied={};function Shape(){this.points=null}Shape.prototype.copy=function(source){return console.log(\"copy\"),this.points=source.points!==void 0?source.n:source.s,this};function store(key,value){copied.value=value||key}function apart(key,value){value?copied.value=value:copied.other=key,value?copied.value+=value:copied.value+=key}var shape=(new Shape).copy({points:[1,2],n:2});console.log(shape.points,(new Shape).copy({s:3}).points),store(\"key\",0),console.log(copied.value),store(\"key\",\"value\"),apart(\"a\",\"b\"),console.log(copied.value,copied.other);");
		expect(runProgram(code)).toBe(runProgram(source));
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in"), folds).code).toBe("function f(u,t,o){u?g():o.a=t?1:2}");
		// A test that may change the object, a part longer than what both share,
		// a branch of two statements, no `else`, a known test or a local name keep their forms.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-2"), folds).code).toBe("function f(t,o){t()?o.a=x():o.a=y()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-3"), folds).code).toBe("function f(t,o){t?o.a=x+y+z:o.a=1}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-4"), folds).code).toBe("function f(t,o){if(t)o.a=1,g();else o.a=2}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-5"), folds).code).toBe("function f(t,o){if(t)o.a=1;g()}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-6"), folds).code).toBe("function f(t,o){o.a=1}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-7"), folds).code).toBe("function f(t,a){return a=t?1:2,a}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-print-an-if-setting-one-member-alike-in-8"), folds).code).toBe("function f(t,o){return(o.a=t)?1:2}");
	});

	it("should join the `var` a block printing its statements in place opens or ends with to those around it", () => {
		const source = fixture("javascript", "one-pass-x6-3");
		const { code } = minifyOnePass(source, folds);
		expect(code).toBe("var join=function(){},first=1,second=[first];function counted(list){var total=0,seen=list.length;total+=seen;var last=list[seen-1];return[total,last]}function gather(list){var out=list.slice(0,0),limit=list.length-1;list.forEach(function(item,index){if(index<limit)out.push(item)}),console.log(out)}console.log(join(),first,second,counted([1,2])),gather([3,4,5]);");
		expect(runProgram(code)).toBe(runProgram(source));
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its"), folds).code).toBe("function f(){g();var a=1,b=g(a);return[a,b]}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its-2"), folds).code).toBe("function f(){var a=g(),b=a;h(b);return[a,b,k()]}");
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its-3"), folds).code).toBe("function f(l){var o=[],n=l.length;l.forEach(function(i){o.push(i+n)});return o}");
		// A comment before the block stays before its statements; beautified, each stays its own.
		expect(minifyOnePass(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its-4"), { ...folds, format: { comments: "all" } }).code).toBe("function f(){var a=g();/* c */var b=h(a);k(b);return[a,b]}");
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const beautified = /** @type {{ code: string }} */ (new SourceProcessor().process(fixture("javascript", "one-pass-minify-family-x-round-9-should-join-the-var-a-block-printing-its-5"), { mode: "beautify", compress: {}, mangle: false })).code;
		expect(beautified).toBe("function f() {\nvar a = g();\n\nvar b = h(a);\nreturn [ a, b ];\n}");
	});
});

describe("printing again what the one pass printed", () => {
	it("should print a conditional's merged call and a call printing as its argument without parentheses a reprint drops", () => {
		const options = { compress: {}, mangle: false };
		for (const [source, expected, sourceType] of [
			// A conditional printing as one call takes back the `(` it opened with, but as `new`'s callee, an `await`'s argument or a tag.
			["function f(e,t){t&&(e?console.error(\"a\",e):console.error(\"b\",e))}", "function f(e,t){t&&console.error(e?\"a\":\"b\",e)}"],
			["function f(i,a){return 3*(0!==i?Math.abs(i):Math.abs(a))}", "function f(i,a){return 3*Math.abs(0!==i?i:a)}"],
			["function f(e,t,g){x=new (e?g(\"aaaa\",e,t,1):g(\"bbbb\",e,t,1))}", "function f(e,t,g){x=new(e?g(\"aaaa\",e,t,1):g(\"bbbb\",e,t,1))}"],
			// A merged assignment keeps them: `t&&x=a` sets an rvalue.
			["function f(t,s){t&&(s?this.v=g(1,t,s,\"aa\"):this.v=g(2,t,s,\"aa\"))}", "function f(t,s){t&&(s?this.v=g(1,t,s,\"aa\"):this.v=g(2,t,s,\"aa\"))}"],
			["function f(e,t,g){x=(e?g(\"aaaa\",e,t,1):g(\"bbbb\",e,t,1))`q`}", "function f(e,t,g){x=(e?g(\"aaaa\",e,t,1):g(\"bbbb\",e,t,1))`q`}"],
			["const flag=typeof Promise===\"function\";export const picked=await(flag?Promise.resolve(4):Promise.resolve(5));", "let flag=\"function\"==typeof Promise;export const picked=await(flag?Promise.resolve(4):Promise.resolve(5));", "module"],
			// A call printing as the argument its parameter's one read evaluates parenthesizes it as that argument.
			["function w(a){x=(function(b){return b})(a||g())}", "function w(a){x=a||g()}"],
			["function w(a){x=y*(function(b){return b})(a||g())}", "function w(a){x=y*(a||g())}"]
		]) {
			const settled = sourceType === "module" ? { sourceType: /** @type {const} */ ("module") } : {};
			const once = minifyOnePass(source, { ...options, ...settled }).code;
			expect(once).toBe(expected);
			expect(minifyOnePass(once, { ...options, ...settled }).code).toBe(once);
		}
	});
});

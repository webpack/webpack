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
	it("should compress in the one pass where nothing outside a node decides it", () => {
		/** @type {[string, import("../../../lib/javascript/syntax-printer").MinifyOptions, string][]} */
		const cases = [
			// What nothing reads goes where its value makes nothing happen.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-32"),
				{},
				"function f(n){g();q;({...o});`${n}`;g();var t=0;return n}var top=1;function topFunction(){}"
			],
			// A statement folds into the next one's first read, where nothing runs before it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-52"),
				{},
				"function f(x){var e=g();return e=g(),e=g(),h(...e),e=g(),delete e.y,e=g(),e=g(),e=g(),k,e=g(),new x(e=g()),e=g(),new x(...e),new U(e=g()),e=g(),[...e],`${e=g()}`,-(e=g()),e}"
			],
			// A `break` under a label leaves as one bare does: what follows it goes, and a case running only it runs nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-718"), { compress: {} }, "function a(e){}function b(){for(;;)break}function c(){return 1}function d(e){if(e===1)p();else q()}function e(){p()}function k(){for(;;)g()}function m(){h()}function n(e){}function p(e){switch(e){case 1:q();/*! c */e:break;default:r()}}"],
			// A `switch` whose cases run nothing runs what it tests and its first test, where no later test runs code.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-719"), { compress: {} }, "function a(c){g()}function b(){g(),h()}function c(c){g()}function d(c){switch(c){case g():case h():}}function e(c){switch(c){case 1:case h():}}function f(c){switch(c){case g():case 2:h()}}function i(c,s){if(s)g();else h()}function j(c){a(),b()}function k(c){y=1}function l(c){g()}x,g();function m(c){switch(c){/*! c */case g():}}"],
			// A case's block keeping its braces is the `if`'s body, a `break` ending it dropped.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-720"), { compress: {} }, "function a(c){if(c===E){let{data:a}=c;call(a)}}function b(c){if(c===E){function a(){}call(a)}}function c(c,a){if(c===E)call(c);else a()}function d(c){if(c===E)call(c)}function e(c){if(c===E){let c=h();g(c,c)}}function f(c){if(c===E){g(),h()}return 1}function i(c){switch(c){case E:}}function j(c){switch(c){case E:if(c)break;g()}}function k(c){switch(c){case E:g();break;default:m()}}"],
			// A block whose `break` no `;` precedes once printed, or a discriminant holding a comment, stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-721"), { compress: {} }, "function a(e){switch(e){case E:try{w()}finally{c()}break}}function b(c){if(c===E){if(c)g()}}1+/*! keep */2,probe();function c(e){switch(e){case E:try{w()}finally{c()}break}}function d(c,e){if(e){if(c===E){g(),h()}}else k()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-12"), { compress: {} }, "f(),g(),e(),h;"],
			// A loop head's declarator folds into the next, and an alias nothing reads goes from it, but not one a value folds into.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-write-a-value-at-its-one-read-2"),
				{},
				"function f(){for(var a=foo;bar;)return a}function g(){for(let o=foo,a=bar;baz;)return[o,a]}function h(){for(let a=foo();bar;a++)use(()=>a)}function k(){for(let o=foo(),a=o.x,f=1;f;f--)use(o,a)}function m(o){for(;o;)return o}function n(){for(let a=foo(),f=1;f;f--)use(f)}"
			],
			// esbuild's `-(a,b)` as `a,-b`, and `yield` or `await` alike, where a sequence stands bare, but where its first value would open the statement as a block.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-488"), {}, "a(),-b,a(),b,~c,a(),+1,a(),- -b,x=-(a(),b),f(),-g();async function h(){c(),await d,c(),await(d+e)}function*k(){c(),yield d,c(),yield*d}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-507"), {}, "a,b;var v=a!=b;function g(){return a!==b}"],
			// `!!b` is `b` where `b` is a boolean; a key an integer spells is that number; a static block running nothing goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-514"), {}, "a=delete b,a=b==c,a=(b==c)+1,a=!(b<c);if(!(b<c))d();a=!b;(function(){g()})(),x;(function(){g()})(),x;x[0],x[-123],x[\"-0\"],x[\"01\"],x?.[5];class P{foo}class Q{}class R{static{g()}}"],
			// What nobody reads: an operator running only its operand goes, a branch running nothing goes, an array or object prints what its parts run, `x==null&&y` is `x??y`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-522"), {}, "x.y,x?.y,x.y,x.y.z(),delete x.y,delete x,x,g(),a,b,f(),a<b,g(),a=b;({}).a+1;foo(),foo()||bar(),foo()&&bar(),a,b||c(),(a??b)||c(),x=foo()?1:2,c||(a=b),c||(d,e),c&&d;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-523"), {}, "a,foo(),[...c,a],foo(),foo(),bar(),foo(),g(),h(),x=[a(),b()],g(),g(),a(),b(),b,x=(f(),1);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-537"), {}, "x,x(),x,a(),b,a,b(),f(a===b,c()),g(),a(),b(),h(),x,b(),b;"],
			// terser's `switches`: cases ending a `switch` that run nothing go; one with none left runs its test, or goes from its list.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-546"), {}, "a();a;if(a===3)b();if(a===3)b();a,f();a,b();switch(a){case 1:b();break;case 2:c()}if(x)y;else z();function f(a){g()}switch(a){case 1:/*! k */}"],
			// terser's `switches` of one case and a `default`: `if…else` after a `break`, the other after where one falls into it, in a list, its block keeping braces.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-592"), {}, "if(a===1)b();else c();if(a===1)b();c();if(a===1)b();else c();if(a!==1)c();b();if(a!==1)b();if(a!==1)b();if(a===1)b();else if(y)z();w();if(a===1){if(y)z()}else w();if(a===1){let a=g();f(a,a)}else h();switch(a){case 1:f();if(x)break;g();break;default:h()}for(;;)switch(a){case 1:f();break;default:g()}if(x){if(a===1)f();g()}else h();switch(a){/*! c */case 1:b();break;default:c()}if(b()===1)c();else d();if(a===f())c();else d();"],
			// Nobody reading it, a loose or ordering comparison of two primitives runs only its sides, as a strict one does, which print bare in the sequence; one side that may be an object stays.
			[fixture("javascript", "e-conditions-14"), { mangle: false }, "a+\"\",b|c,b+\"\",a|0,b|0,a,b,f(),g(),h(),a,b,a+\"\"<b,x=a+\"\"==(b|c);"]
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
			minifyOnePass(`function f(p){var o=[p];${"g();".repeat(3000)}h(o)}`, {
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
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-3"), "x={k:()=>1,[(()=>1)]:1},y=[()=>1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-4"), "x=(a||(f(1)(2)),longName);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-5"), "!(g(),h());"],
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
							"f()",
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
		expect(() => processor.process("a(", { mode: "minify" })).toThrow(
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
			"class K { #first = 1; #second = 2; get() { return this.#first + this.#second; } } console.log(new K().get());",
			{
				sourceType: "script",
				mangle: {
					nthIdentifier: {
						get: (n) => letters[n],
						reset: () => {
							resets++;
							parseProgram("var other = 1;", 0, {});
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
			"class K { #first = 1; #second = 2; get() { return this.#first + this.#second; } } console.log(new K().get());",
			{
				sourceType: "script",
				mangle: {
					nthIdentifier: {
						get: (n) => {
							if (!isWalkingSyntaxTree()) {
								parseProgram("var other = 1;", 0, {});
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
			/** @type {EXPECTED_ANY} */ (WebpackParser.parse("a;", {}))
		);
		const types = Uint8Array.from(tree._types);
		types[tree.field(0, Field.body, program)] = 255;
		readParsedTree(tree, "a;");
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
		const { code } = await jsMinify({ "a.js": "var a = 1;" }, undefined);
		expect(code).toBe("var a=1;");
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

describe("one-pass minify spellings", () => {
	it("should drop the `break` ending a block the last case of a `switch` ends with", () => {
		const source = fixture("javascript", "j-spellings-11");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"function f(a,q){switch(a){default:console.log(1);break;case 1:console.log(2)}if(q===2){let y=a+1;console.log(y,y)}}f(1,2),f(0,0);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify of reads and calls on literals", () => {
	it("should drop the trailing parameters nothing reads under `keep_fargs: false`", () => {
		const source = 'function f(a,b){return a}var g=(a,b)=>a,o={set x(v){},m(a){}};function h(a){return arguments}function k(a){eval("a")}console.log(f.length,g.length,o.m.length,h.length,k.length)';
		const { code } = minifyOnePass(source, { compress: { keep_fargs: false }, mangle: false });
		// A setter's one parameter, `arguments` and `eval` keep theirs.
		expect(code).toBe('function f(a){return a}var g=a=>a,o={set x(v){},m(){}};function h(a){return arguments}function k(a){eval("a")}console.log(f.length,g.length,o.m.length,h.length,k.length);');
		// By default they stay.
		expect(minifyOnePass("function f(a,b){return a}console.log(f.length)", { compress: {}, mangle: false }).code).toBe("function f(a,b){return a}console.log(f.length);");
	});

	it("should keep only what the sides of an unread loose equality run", () => {
		const source = "a==b;c()!=d;a()<b;";
		// A relation throws on a symbol, which `==` does not: it stays.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("a,b,c(),d,a()<b;");
		// An object's `valueOf` may run where conversions are not taken as pure.
		expect(minifyOnePass(source, { compress: { pure_conversions: false }, mangle: false }).code).toBe("a==b,c()!=d,a()<b;");
	});

	it("should keep only what the computed keys and values of an unread object run", () => {
		const source = "({[a]:x(),[b()]:1,get[c()](){},set d(v){},e:f()});";
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("a,x(),b(),c(),f();");
		// A key may convert an object running its `toString` where conversions are not taken as pure.
		expect(minifyOnePass(source, { compress: { pure_conversions: false }, mangle: false }).code).toBe("({[a]:x(),[b()]:1,get[c()](){},set d(v){},e:f()});");
	});

	it("should keep only what the computed keys of an unread class run", () => {
		const source = '(class{[a](){}static["b"]=1;#p;get[c](){}static{}static d=1}),x=(class{[e]},1);';
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("a,c,x=(e,1);");
		// A static value, block, `extends` or key that may name `prototype`, or a key reading the class's own name, keeps it.
		expect(
			minifyOnePass('(class{[a];static b=f()}),(class{[a];static{f()}}),(class extends B{[a]}),(class{static[f()]=1}),(class{static["prototype"](){}}),(class C{[r(()=>C)](){}});', { compress: {}, mangle: false }).code
		).toBe('(class{[a];static b=f()}),class{[a];static{f()}},class extends B{[a]},class{static[f()]=1},class{static["prototype"](){}},class C{[r(()=>C)](){}};');
		// A direct `eval` in a key may read the class's name too.
		expect(minifyOnePass('(class C{[r(()=>eval("C"))](){}});', { compress: {}, mangle: false }).code).toBe('(class C{[r(()=>eval("C"))](){}});');
		// Beside a key that runs code, a static `prototype` keeps the class too, as making it throws.
		const throwing = '(class{[a()](){}static["prototype"](){}}),(class{[a()];static["prototype"]=1}),(class{[a()];static[k()]=1});';
		expect(minifyOnePass(throwing, { compress: {}, mangle: false }).code).toBe('(class{[a()](){}static["prototype"](){}}),class{[a()];static["prototype"]=1},class{[a()];static[k()]=1};');
		const program = `var a=()=>"k",k=()=>"prototype";try{(class{[a()](){}static["prototype"](){}})}catch(e){console.log(e.name)}try{(class{[a()];static["prototype"]=1})}catch(e){console.log(e.name)}try{(class{[a()];static[k()]=1})}catch(e){console.log(e.name)}`;
		expect(runProgram(minifyOnePass(program, { compress: {}, mangle: false }).code)).toBe("TypeError\nTypeError\nTypeError");
	});

	it("should fold a value read only by its null check into the optional chain it prints as", () => {
		const source =
			"function f(){let a=g();return a!=null?a.b:void 0}function h(){let a=g();return a==null?void 0:a?.b.c[d](e)}function k(a){return a!=undefined?a.b:undefined}function l(){let a=o.m;return a!=null?a():void 0}function n(){let a=g();return null!=a?a(1):void 0}function p(){let a=o.m;return a!=null?a.x():void 0}";
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
			"function s(){let a=x+y;return a!=null?a.b:void 0}function t(){let a=g();return a!=null?a.b:1}function u(){let a=g();return a!=null?b.c(a):void 0}function v(){let a=g();return a!=null&&x?a.b:void 0}function w(){let a=g();return a!=null?a:void 0}function y(){let a=g();return b!=null?a.b(a):void 0}function z(){let a=g();return a===b?a.b:void 0}";
		expect(minifyOnePass(kept, { compress: {}, mangle: false, ecma: 2020 }).code).toBe(
			"function s(){let a=x+y;return a?.b}function t(){let a=g();return a!=null?a.b:1}function u(){let a=g();return a!=null?b.c(a):void 0}function v(){let a=g();return a!=null&&x?a.b:void 0}function w(){let a=g();return a!=null?a:void 0}function y(){let a=g();return b!=null?a.b(a):void 0}function z(){let a=g();return a===b?a.b:void 0}"
		);
		// A value printing as a constant: the test picks, or `?.` takes it whole.
		const constant =
			'function i(){var s="a";var x=s;return x!=null?x.y:void 0}function j(){const o={p:-1};let x=o.p;return x!=null?x.y:void 0}function q(){let x=(()=>-1)();return x!=null?x.y:void 0}function r(){let x=String(1);return x!=null?x.y:void 0}';
		const constantCode = minifyOnePass(constant, { compress: {}, mangle: false, ecma: 2020 }).code;
		expect(constantCode).toBe("function i(){return`a`.y}function j(){return{p:-1}.p?.y}function q(){return(-1)?.y}function r(){return`1`.y}");
		const program = "var o={m(){return this===o}};function l(){let a=o.m;return a!=null?a():void 0}function p(){let a=o;return a!=null?a.m():void 0}console.log(l(),p())";
		const code = minifyOnePass(program, { compress: {}, mangle: false, ecma: 2020 }).code;
		// What an engine without `?.` cannot parse runs only where it can.
		if (supportsOptionalChaining()) {
			expect(runProgram(code)).toBe(runProgram(program));
			expect(runProgram(`${constantCode}console.log(i(),j(),q(),r())`)).toBe(runProgram(`${constant}console.log(i(),j(),q(),r())`));
		}
	});

	it("should fold an update into the `return` or `throw` giving the name it sets", () => {
		const source =
			"function f(a){a+=1;a+=2;return a}function h(i){i++;return i}function k(i){i--;throw i}function l(i){var x=i++;return x**2}function n(a){a+=g();return a}function p(i){i++;return i+1}function q(){const c=1;c+=1;return c}function r(a){with(o)a+=1;return a}";
		// `x++` a declarator took gives the old value still; a value that runs
		// code, or a read deeper in the value, stays apart, as it gzips bigger.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
			"function f(a){return a+=1,a+=2}function h(i){return++i}function k(i){throw--i}function l(i){return i++**2}function n(a){return a+=g(),a}function p(i){return i++,i+1}function q(){const c=1;return c+=1,c}function r(a){with(o)a+=1;return a}"
		);
		// A script's global may be an accessor of the global object; a module's is not.
		expect(minifyOnePass("var x;x++;throw x", { compress: {}, mangle: false }).code).toBe("var x;x++;throw x;");
		expect(minifyOnePass("var x;x++;throw x", { compress: {}, mangle: false, module: true }).code).toBe("var x;throw++x;");
		expect(minifyOnePass("function f(café){café++;return café}g(f)", { compress: {}, mangle: false, format: { ascii_only: true } }).code).toBe(
			"function f(caf\\u00e9){return++caf\\u00e9}g(f);"
		);
		const program = "function h(i){i++;return i}function l(i){var x=i++;return x**2}function f(a){a+=1;a+=2;return a}console.log(h(1),l(3),f(1))";
		expect(runProgram(minifyOnePass(program, { compress: {}, mangle: false }).code)).toBe("2 9 4");
	});

	it("should merge the calls of a conditional differing in what one spread spreads", () => {
		const source = "let x=g(),b=h();x?b(...c):b(...d);x?b(...x):b(...c);x?b(1,...c,2):b(1,...d,2);x?new b(...c):new b(...d);x?b(...c):b(d);x?b(...[1,2]):b(...d);";
		// A spread against a plain argument, or one printing as its items, stays.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
			"let x=g(),b=h();b(...x?c:d),b(...x||c),b(1,...x?c:d,2),new b(...x?c:d),x?b(...c):b(d),x?b(1,2):b(...d);"
		);
	});

	it("should merge the calls an `if` returns or throws from both branches", () => {
		const source =
			"function f(a){return[a]}function r(x){if(x)return f(1);else return f(2)}function t(x){if(x){throw f(1)}else{throw f(2)}}function n(x){if(!x)return new f(1);else return new f(2)}function c(x,y){if(x)return 0;else if(y)return f(1,y);else return f(2,y)}g(r,t,n,c);";
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
			"function f(a){return[a]}function r(x){return f(x?1:2)}function t(x){throw f(x?1:2)}function n(x){return new f(x?2:1)}function c(x,y){return x?0:f(y?1:2)}g(r,t,n,c);"
		);
		// Parts longer than what the branches share, or spreads printing as their
		// items, stay apart.
		const kept =
			"function f(a){return[a]}function l(x){if(x)return f({a:1,b:2});else return f({c:3,d:4})}function s(x){if(x)return f(...[1]);else return f(...[2])}g(l,s);";
		expect(minifyOnePass(kept, { compress: {}, mangle: false }).code).toBe(
			"function f(a){return[a]}function l(x){return x?f({a:1,b:2}):f({c:3,d:4})}function s(x){return x?f(1):f(2)}g(l,s);"
		);
		const program =
			"function f(a){return[a]}function r(x){if(!x)return f(1);else return f(2)}console.log(r(0)[0],r(1)[0],(x=>!x?f(3):f(4))(0)[0])";
		const { code } = minifyOnePass(program, { compress: {}, mangle: false });
		expect(code).toContain("return f(x?2:1)");
		expect(runProgram(code)).toBe("1 2 3");
	});

	it("should fold a value running nothing into the compound assignment after it", () => {
		const source = "var foo;function w(a){let x=foo;a+=x;return a}function v(a){let x=foo;a||=x;return a}function u(a){let x=g();a+=x;return a}w(),v(),u();";
		// A value running code would run after the target is read.
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2021 }).code).toBe(
			"var foo;function w(a){return a+=foo}function v(a){return a||=foo}function u(a){let x=g();return a+=x,a}w(),v(),u();"
		);
		// A global's read may run a getter, which could set the value first.
		expect(minifyOnePass("var foo;function w(a){let x=foo;slot+=x;return a}w();", { compress: {}, mangle: false }).code).toBe(
			"var foo;function w(a){let x=foo;return slot+=x,a}w();"
		);
	});

	it("should keep a null check whose chain a call, `delete` or tag reads as a reference", () => {
		// `(x?.m)()` would call `m` on `x`, and `delete(x?.m)` delete it.
		const source = "function f(x){return(x!=null?x.m:void 0)()}function g(x){return delete(x!=null?x.m:void 0)}function h(x){return(x!=null?x.m:void 0)``}function k(x){return x!=null?x.m:void 0}";
		expect(minifyOnePass(source, { compress: {}, mangle: false, ecma: 2020 }).code).toBe(
			"function f(x){return(x!=null?x.m:void 0)()}function g(x){return delete(x!=null?x.m:void 0)}function h(x){return(x!=null?x.m:void 0)``}function k(x){return x?.m}"
		);
	});

	it("should drop a `for`'s own declarator nothing reads", () => {
		const source = "function f(){for(var a,b=1;;);}function g(){for(let i=0,n=h();;)k(i)}function m(){for(let c=32,d=0;d<c;d++)k(d)}k(f,g,m)";
		// A value running code stays, as does a constant its reads print.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("function f(){for(;;);}function g(){for(let i=0,n=h();;)k(i)}function m(){for(let c=32,d=0;d<c;d++)k(d)}k(f,g,m);");
	});

	it("should print a kept global constant's value where it reads shorter", () => {
		const source = "const foo=1;log(foo,{foo});const many=2;log(many,many,many)";
		// A shorthand keeps the name it keys, and a name read three times stays, as it measured smaller once gzipped.
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe("const foo=1;log(1,{foo:foo});const many=2;log(many,many,many);");
	});

	it("should lift a computed key reading a constant as the key it names", () => {
		for (const [source, toplevel, expected] of /** @type {[string, boolean, string][]} */ ([
			// Inlined, the read prints as the plain key; `__proto__` and a class's `constructor` mean something else bare.
			['const key="FOO",p="__proto__",c="constructor",n=12;class X{[key]=1;static get[key](){return 2}[c](){}}console.log(new X,{[key]:1,[p]:2,[n]:3})', true, 'class X{FOO=1;static get FOO(){return 2}["constructor"](){}}console.log(new X,{FOO:1,["__proto__"]:2,12:3});'],
			// Kept for its size, it lifts only where the key prints shorter than the name in brackets.
			['const prop="_foo",x="FOO";console.log({[prop]:1,[x]:2})', false, 'const prop="_foo",x="FOO";console.log({_foo:1,[x]:2});']
		])) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: false, toplevel });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});
});

describe("one-pass minify of unused values and side effects, fourth round", () => {
	it("should drop what only makes a value nobody reads, keeping what may run code", () => {
		const cases = [
			// A loop's body running nothing is `;`, a write to a name nobody reads too, a loop's `let` among them; a global read stays.
			[fixture("javascript", "one-pass-unused-d-4"), "function f(){for(;g(););}for(;g();)h();while(g());for(x in y);for(;g();)a;"]
		];
		for (const [source, expected] of cases) {
			expect(minifyOnePass(source, { compress: { ecma: 2020 }, ecma: 2020, mangle: false }).code).toBe(expected);
		}
	});

});

describe("one-pass minify of known tests and switches, family E", () => {
	const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };

	it("should keep a `switch` whose test is known by no literal, or whose dead case declares what stays", () => {
		const source = fixture("javascript", "one-pass-e2-5");
		const { code } = minifyOnePass(source, options);
		// A `let` or `class` in a case that never runs goes only with the whole `switch`.
		expect(code).toBe(
			"function log(name){console.log(name)}var k=1;switch(1){case log(`a`),k:log(`one`)}function f(q){if(q)switch(3){case log(`b`),1:break;var v}return v}log(`c`),1;log(f(1));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

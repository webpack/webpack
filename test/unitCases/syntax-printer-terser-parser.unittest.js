"use strict";

// cspell:ignore dgimsuyv, nlb, thedef, privatename, NOINLINE, endpos, endcol, endline, readonly, satisfies

const { load } = require("../../lib/javascript/syntax").printer;
const {
	loadTerserSources,
	thrownMessage
} = require("../helpers/terserSources");

/**
 * @param {string} specifier a module's URL
 * @returns {Promise<EXPECTED_ANY>} the module, imported through this file's runtime
 */
const importTerserSource = (specifier) => import(specifier);
const ACORN_CORPUS = require("../fixtures/acorn-corpus.json");

// A token's fields, past which the parser keeps nothing a minify reads.
const TOKEN_FIELDS = [
	"type",
	"value",
	"line",
	"col",
	"pos",
	"endline",
	"endcol",
	"endpos",
	"nlb",
	"file",
	"raw",
	"quote",
	"template_end",
	"flags",
	"comments_before",
	"comments_after"
];

/**
 * Where two trees, each of its own classes, first disagree: node classes by
 * name, every field, and which lists and nodes the trees share.
 * @param {unknown} theirs terser's tree
 * @param {unknown} ours webpack's tree
 * @returns {string | undefined} the first difference, if any
 */
const firstDifference = (theirs, ours) => {
	/** @type {Map<unknown, unknown>} */
	const seen = new Map();
	/**
	 * @param {string} where the path so far
	 * @param {EXPECTED_ANY} a terser's side
	 * @param {EXPECTED_ANY} b webpack's side
	 * @returns {string | undefined} how they differ
	 */
	const walk = (where, a, b) => {
		if (a === b) return undefined;
		if (typeof a !== typeof b) return `${where}: ${typeof a} vs ${typeof b}`;
		if (typeof a === "number" && Number.isNaN(a) && Number.isNaN(b)) {
			return undefined;
		}
		if (typeof a === "function" || typeof a === "symbol") return undefined;
		if (typeof a !== "object" || a === null || b === null) {
			return `${where}: ${String(a)} vs ${String(b)}`;
		}
		if (seen.has(a)) return seen.get(a) === b ? undefined : `${where}: sharing`;
		seen.set(a, b);
		if (Array.isArray(a)) {
			if (!Array.isArray(b) || a.length !== b.length) return `${where}: length`;
			for (let i = 0; i < a.length; i++) {
				const inner = walk(`${where}[${i}]`, a[i], b[i]);
				if (inner) return inner;
			}
			return undefined;
		}
		if (a instanceof RegExp) return undefined;
		// webpack names a node's class for its type with `Node` after it and its
		// token class `ParsedToken`, where terser prefixes `AST_`, so the classes
		// are compared by what they hold rather than by name.
		const kindOf = (/** @type {EXPECTED_ANY} */ node) =>
			node.constructor.name.replace(/^(?:AST_|Parsed)/, "").replace(/Node$/, "");
		if (kindOf(a) !== kindOf(b)) {
			return `${where}: ${a.constructor.name} vs ${b.constructor.name}`;
		}
		const keys =
			a.constructor.name === "ParsedToken" || a.constructor.name === "AST_Token"
				? TOKEN_FIELDS
				: new Set([...Object.keys(a), ...Object.keys(b)]);
		for (const key of keys) {
			const inner = walk(`${where}.${key}`, a[key], b[key]);
			if (inner) return inner;
		}
		return undefined;
	};
	return walk("", theirs, ours);
};

/**
 * @param {EXPECTED_ANY} error what a parse threw, if anything
 * @returns {boolean} whether it ran out of stack
 */
const isStackOverflow = (error) =>
	Boolean(error) && error.name === "RangeError" && /call stack/i.test(error.message);

/**
 * @param {EXPECTED_ANY} error what a parse threw
 * @returns {EXPECTED_OBJECT} what a caller reads off it
 */
const describeError = (error) => ({
	name: error.name,
	message: thrownMessage(error),
	filename: error.filename,
	line: error.line,
	col: error.col,
	pos: error.pos
});

// What each source is parsed with: terser's own option sets.
/** @type {Record<string, EXPECTED_ANY>[]} */
const MODES = [
	{},
	{ module: true },
	{ experimental_typescript: true },
	{ module: true, experimental_typescript: true },
	{ expression: true },
	{ bare_returns: true, html5_comments: false },
	{ shebang: false, strict: true, filename: "a.js" }
];

/**
 * Sources chosen for the errors terser's parser raises and the syntax it reads
 * its own way, beyond what acorn's corpus holds.
 * @type {string[]}
 */
const SOURCES = [
	// Errors, one per message terser raises.
	"class A { m() { this.#x; } }",
	"a.#x",
	"a?.#x",
	"#x in a",
	"({ #x: 1 })",
	"function f(a, a) { 'use strict'; }",
	"function f(...a, b) {}",
	"function f([...a, b]) {}",
	"function f({ ...a, b }) {}",
	"function f(1) {}",
	"[...a, b] = c",
	"while (a) function f() {}",
	"for (;;) async function f() {}",
	"if (a) class B {}",
	"while (a) class B {}",
	"'use strict'; yield = 1",
	"function* g() { var yield; }",
	"'use strict'; function f(yield) {}",
	"'use strict'; function f(eval) {}",
	"'use strict'; var arguments;",
	"'use strict'; with (a) b;",
	"'use strict'; delete a;",
	"'use strict'; 010",
	"'use strict'; '\\010'",
	"`\\010`",
	"async function f() { await: 1; }",
	"await x",
	"for (var a, b in c);",
	"for (using a in b);",
	"for (a() in b);",
	"for (1 of b);",
	"a = 1__0",
	"a = 1_",
	"'\\u{110000}'",
	"'\\u{zz}'",
	"'\\xZ'",
	"'\\u12'",
	"'abc",
	"a\\u0030",
	"\\u0030a",
	"\\u{63}lass A {}",
	"x = 1 @",
	"throw\na",
	"a\n=> b",
	"import(a)\n=> b",
	"break foo;",
	"continue;",
	"foo: { continue foo; }",
	"foo: foo: a;",
	"return 1",
	"const a;",
	"using a;",
	"try {}",
	"()",
	"1 = 2",
	"a++ ++",
	"++a()",
	"new.target2",
	"import.foo",
	"import.source",
	"import.defer = 1",
	"import { a } from b",
	"export { a } from 1",
	"export default var a;",
	"export 1;",
	"import x, 1 from 'y'",
	"export * as 1 from 'y'",
	"var import = 1",
	"let [a",
	"a ? b",
	"(a, ...b)",
	"(a, b, ) => 1",
	"x = { get 1n() {} }",
	"a`x`\n?.b",
	"a?.b`c`",
	"-a ** 2",
	"async x\n=> x",
	"a = /x",
	"a = /x\n/",
	"/* unterminated",
	"<!-- html comment\nx --> also\n-->",
	"#!shebang\nx",
	"x\n#!not a shebang",
	"\\u{1F600}",
	"'\\u{1F600}\\uD83D\\uDE00\\u2028\\u2029'",
	"x = .5e+3 + 0X1f + 0B11 + 0O17 + 5e-2 + 08 + 09.5",
	"x = 1n + 0x1n + 0o1n + 0b1n",
	"x = 07n",
	"x = 1.5n",
	"x = `a${b}c${d}e`; y = `\\u{61}\\x61\\\n`; z = String.raw`\\unicode`",
	"label: for (;;) { label2: for (;;) continue label; }",
	"switch (a) { case 1: default: case 2: }",
	"switch (a) { default: default: }",
	"switch (a) { b; }",
	"class A { static async *[a]() {} static get b() {} static set c(v) {} static d = 1; ;; }",
	"class A { constructor() { super(); super.x; } }",
	"class A extends B { 'constructor'() {} static {} }",
	"x = { __proto__: 1, async, get, set, static: 1, async: 2, get: 3, set: 4 }",
	"x = { async() {}, get() {}, set() {}, static() {}, *gen() {}, async *ag() {} }",
	"x = { a = 1 } = b",
	"({ a: 1 } = b)",
	"for (let [a, b] of c); for (const { d } in e); for (var f = 1 in g);",
	"for await (const a of b);",
	"async function f() { for await (a of b); for await (;;); }",
	"label: function f() {}",
	"if (a) function f() {} else function g() {}",
	"a = async function* () { yield* b; yield\nc; }",
	"a = function* () { yield /re/; yield /= 1/ }",
	"x = a ?? b || c",
	"x = a || b ?? c",
	"a ||= b; a &&= c; a ??= d; a **= e; a >>>= f",
	"a = b => c => d",
	"a = async b => await c",
	"a = async (b, c) => d; a = async(); a = async; a = async\n(b)",
	"var { a, b: [c, ...d], ...e } = f",
	"import a, { b as c, default as d, 'e' as f } from 'g' with { type: 'json' }",
	"import a, * as b from 'c'; import 'd' assert { type: 'json' }",
	"import source a from 'b'; import defer * as c from 'd'; import.source('e'); import.defer('f')",
	"import source from 'a'; import defer, { b } from 'c'",
	"export { a as 'b', 'c' as d } from 'e'; export * as 'f' from 'g'",
	"export default class {} export default function () {}",
	"export default (a, b); export default async () => 1",
	"export default async function f() {}",
	"export const a = 1, b = 2; export let c; export var d; export function e() {} export class F {}",
	"export { a }; export {}",
	"using a = b; await using c = d",
	"for (using a of b); for (await using a of b);",
	"async function f() { await using a = b; await using\nc = d; }",
	"x = { 'a': 1, 2: 3, [4]: 5, 6n: 7, 0x10: 8, 1e3: 9 }",
	"x = a?.[b]?.(c)?.d.e",
	"new a.b.c(); new a; new (a()); new new a()()",
	"x = typeof void delete !~-+a",
	"x = a in b instanceof c",
	"x = `${`${`${a}`}`}`",
	"debugger; ;;; {} with (a) {}",
	"'use strict'; ({ eval } = a)",
	"'use strict'; [eval] = a",
	"function f() { 'use strict'; return function eval() {} }",
	"function arguments() { 'use strict'; }",
	"(function* yield() {})",
	"a = function () { return /* comment */ ; }",
	"/*#__PURE__*/ (a)(); /* @__INLINE__ */ b(); /*@__KEY__*/ 'c'; /*#__MANGLE_PROP__*/ d.e",
	"x = /[/]/g; y = /\\//u; z = /a/dgimsuyv",
	"// comment at the end",
	"\uFEFFa",
	"a\u00A0=\u2003b",
	"'a\\\r\nb'",
	"1e5 + 1.5e-3 + 0x1e + 2E+2",
	"1e5e",
	"async function f() { await using /* c */ x = y; await using // c\n z = w; await using\n v; }",
	"for (using of /* c */ = a; ; );"
];

/**
 * TypeScript, which terser strips. Parsed only where TypeScript is on: without
 * it, terser reads a `type` or `interface` statement forever.
 * @type {string[]}
 */
const TYPESCRIPT_SOURCES = [
	"a<{ b: (c: 'x\\'y') => void /* > */ // >\n }>(d); e<[f, \"g\"]>(i); j<k>?.(l); m<n> + o",
	"const f = <T,>(a: T = 'x\\'y', b = (1), c = { d: [1] } /* c ) */, e = \"//\"): T => a;",
	"const g = <T,>(a = '\\\\', b = `t`, // c )\n): T => a;",
	"type /* c */ A = number;",
	"type // c\nA = number;",
	"let a = <T>(b: T) => /* x */ b;",
	"let a: number = 1; const b: string[] = []; var c: Array<number> | null;",
	"function f(this: Window, a?: number, b: string = 'x', ...c: number[]): void {}",
	"function f<T, U extends keyof T = T>(a: T): U { return a as U; }",
	"function f(a: number): string;\nfunction f(a: string): string;\nfunction f(a) { return a; }",
	"type A = { a: number; readonly b?: string; [key: string]: unknown; (x: number): void; new (x: number): A; m<T>(x: T): T };",
	"type B<T> = T extends string ? `a${T}` : typeof c | (d & e) | [f, g?, ...h[]] | readonly i[] | import('j').K;",
	"interface C<T> extends D, E<T> { a: T; b(): void }",
	"export interface F { a: number }",
	"export type G = number;",
	"import type { H } from 'i'; import type J from 'k'; import { type L, M } from 'n'",
	"import type * as O from 'p'; export type { Q } from 'r'; export type * from 's'; export type * as T from 'u'",
	"class V<T> implements W, X<T> { public a: number; private b?: string = 'x'; protected static c; readonly d = 1; constructor(public e: number) {} m(): void {} get f(): number { return 1; } [key: string]: unknown; }",
	"class Y { private static readonly z = 1; public async *m(): AsyncGenerator<number> {} }",
	"const a = b as const; const c = d satisfies E; const f = <G>(h: G): G => h;",
	"x = a<b>(c); y = a < b > c; z = a<b, c>(d)",
	"x = new A<B>(); y = a?.<b>(c)",
	"let a: (x: number) => string; let b: new () => C; let d: { new (): E };",
	"let a: `x${number}`; let b: typeof c.d; let e: f.g.h<i>; let j: k[l];",
	"function f(a: number) => void",
	"let a: = 1",
	"type A = { a: number b: string }",
	"type A = `x${number}",
	"let a: {",
	"class A { a: number b; }",
	"enum A { B }",
	"namespace A {}",
	"declare const a: number;",
	"abstract class A {}",
	"x = a!",
	"function f(a?) {}",
	"let [a]: number[] = b",
	"export default interface A {}",
	"x = (a: number, b?: string): void => {}",
	"x = async <T>(a: T) => a",
	"x = <T,>(a: T) => a",
	"type A = (a: number, ...b: string[]) => void",
	"type A = (a?: number) => void",
	"type A = { readonly [a]: number; readonly 'b': string; readonly `c`: d }",
	"type A = [a?: number, ...b: string[]]",
	"let a: A[][][]",
	"let a: string | number & boolean",
	"import { type } from 'a'; import { type as b } from 'c'; import { type, d } from 'e'",
	"import type from 'a'; import type, { b } from 'c'",
	"export type A<T> = T;",
	"export { type a, b }",
	"class A { public get a() { return 1 } private set b(v) {} protected m() {} }",
	"class A { public; private; protected = 1; readonly; static; }",
	"function f(this, a) {}",
	"function f(this: A, ...b) {}"
];

describe("syntax-printer's port of terser's parser", () => {
	/** @type {{ theirs: EXPECTED_ANY, ours: EXPECTED_ANY }} */
	const parsers = { theirs: undefined, ours: undefined };

	beforeAll(async () => {
		parsers.theirs = (await loadTerserSources(importTerserSource)).parse;
		parsers.ours = (await load()).modules.parse;
	});

	/**
	 * @param {string} source a source
	 * @param {EXPECTED_OBJECT} options terser's parse options
	 * @returns {string | undefined} how the two parsers disagree, if they do
	 */
	const disagreement = (source, options) => {
		/** @type {EXPECTED_ANY} */
		let theirs;
		/** @type {EXPECTED_ANY} */
		let ours;
		/** @type {EXPECTED_ANY} */
		let theirError;
		/** @type {EXPECTED_ANY} */
		let ourError;
		try {
			theirs = parsers.theirs.parse(source, { ...options });
		} catch (err) {
			theirError = err;
		}
		try {
			ours = parsers.ours.parse(source, { ...options });
		} catch (err) {
			ourError = err;
		}
		// How deep a source nests before the stack runs out is the engine's: Bun's
		// smaller stack overflows on corpus sources Node parses.
		if (isStackOverflow(theirError) || isStackOverflow(ourError)) return;
		if (theirError || ourError) {
			if (!theirError || !ourError) {
				return `throws: ${theirError ? thrownMessage(theirError) : "no"} / ${ourError ? thrownMessage(ourError) : "no"}`;
			}
			const expected = JSON.stringify(describeError(theirError));
			const actual = JSON.stringify(describeError(ourError));
			return expected === actual ? undefined : `${expected} vs ${actual}`;
		}
		return firstDifference(theirs, ours);
	};

	it("should export what terser's parse.js exports", () => {
		const { theirs, ours } = parsers;
		expect([...ours.ALL_RESERVED_WORDS].sort()).toEqual(
			[...theirs.ALL_RESERVED_WORDS].sort()
		);
		expect(ours.PRECEDENCE).toEqual(theirs.PRECEDENCE);
		const error = new ours.JS_Parse_Error("message", "file", 1, 2, 3);
		expect(describeError(error)).toEqual(
			describeError(new theirs.JS_Parse_Error("message", "file", 1, 2, 3))
		);
		expect(error).toBeInstanceOf(Error);
		expect(() => ours.js_error("message", "file", 1, 2, 3)).toThrow(
			ours.JS_Parse_Error
		);
	});

	it("should parse acorn's corpus as terser does", () => {
		/** @type {string[]} */
		const disagreements = [];
		for (const { code, options } of ACORN_CORPUS.cases) {
			const module = Boolean(options && options.sourceType === "module");
			for (const mode of [{ module }, { module, experimental_typescript: true }]) {
				const difference = disagreement(code, mode);
				if (difference) {
					disagreements.push(`${JSON.stringify(code)} ${JSON.stringify(mode)}: ${difference}`);
				}
			}
		}
		expect(disagreements).toEqual([]);
	});

	for (const mode of MODES) {
		it(`should parse as terser does: ${JSON.stringify(mode)}`, () => {
			/** @type {string[]} */
			const disagreements = [];
			const sources = mode.experimental_typescript
				? [...SOURCES, ...TYPESCRIPT_SOURCES]
				: SOURCES;
			for (const source of sources) {
				const difference = disagreement(source, mode);
				if (difference) disagreements.push(`${JSON.stringify(source)}: ${difference}`);
			}
			expect(disagreements).toEqual([]);
		});
	}

	it("should parse several files into one toplevel as terser does", () => {
		/**
		 * @param {EXPECTED_ANY} parser a parse module
		 * @returns {EXPECTED_ANY} the toplevel of three files
		 */
		const parseFiles = (parser) => {
			let toplevel = null;
			for (const [filename, source] of [
				["a.js", "var a = `x${1}`;"],
				["b.js", "/* b */ function b() { return a; }"],
				["c.js", "export const c = b();"]
			]) {
				toplevel = parser.parse(source, { filename, toplevel, module: true });
			}
			return toplevel;
		};
		expect(firstDifference(parseFiles(parsers.theirs), parseFiles(parsers.ours))).toBeUndefined();
	});

	it("should show a token in Node's console as terser does", () => {
		const { inspect } = require("util");
		for (const source of ["a", "`b`", "'`'"]) {
			const theirs = parsers.theirs.parse(source).start;
			const ours = parsers.ours.parse(source).start;
			// The same line but for the class's own name, which is webpack's here.
			expect(inspect(ours, { colors: true })).toBe(
				inspect(theirs, { colors: true }).replace("AST_Token", "ParsedToken")
			);
		}
	});

	it("should tokenize as terser does", () => {
		/**
		 * @param {EXPECTED_ANY} parser a parse module
		 * @returns {EXPECTED_ANY[]} every token of a source, and a regexp read on request
		 */
		const tokens = (parser) => {
			const next = parser.tokenizer("a /* b */ = /c/g\n<!-- d\n.5 ?. e", "f.js", true, true);
			const read = [];
			let token;
			do {
				token = next();
				read.push(token);
			} while (token.type !== "eof");
			// After a name, `/` reads as division until the parser asks for a regexp.
			const regexp = parser.tokenizer("x /a/g", "g.js", false, false);
			read.push(regexp(), regexp(), regexp(""));
			return read;
		};
		expect(firstDifference(tokens(parsers.theirs), tokens(parsers.ours))).toBeUndefined();
	});
});

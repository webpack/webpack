"use strict";

// cspell:ignore nlb, thedef, privatename, NOINLINE

const path = require("path");
const { pathToFileURL } = require("url");
const { createTerserTree } = require("../../lib/javascript/syntax").printer;
const ACORN_CORPUS = require("../fixtures/acorn-corpus.json");

/** @typedef {EXPECTED_ANY} Node one of terser's nodes */

/**
 * terser's own modules, loaded the way `syntax-printer` loads them.
 * @returns {Promise<{ ast: EXPECTED_ANY, parse: EXPECTED_ANY }>} the modules
 */
const loadTerser = async () => {
	// eslint-disable-next-line no-new-func
	const importModule = new Function("specifier", "return import(specifier)");
	const directory = path.dirname(require.resolve("terser/package.json"));
	/**
	 * @param {string} file a file in terser's `lib`
	 * @returns {Promise<EXPECTED_ANY>} the module
	 */
	const at = (file) =>
		importModule(pathToFileURL(path.join(directory, "lib", file)).href);
	const ast = await at("ast.js");
	const parse = await at("parse.js");
	return { ast, parse };
};

/**
 * Where two trees first disagree: every node field, and every token field
 * terser reads once parsing is done, comment sharing included.
 * @param {EXPECTED_ANY} ast terser's ast module
 * @param {Node} theirs terser's tree
 * @param {Node} ours the converted tree
 * @returns {string | undefined} the first difference, if any
 */
const firstDifference = (ast, theirs, ours) => {
	/** @type {Map<unknown, number>[]} */
	const ids = [new Map(), new Map()];
	/**
	 * @param {number} side which tree
	 * @param {unknown} list a comment list
	 * @returns {number} its identity, numbered in visiting order
	 */
	const idOf = (side, list) => {
		const map = ids[side];
		if (!map.has(list)) map.set(list, map.size);
		return /** @type {number} */ (map.get(list));
	};
	/**
	 * @param {EXPECTED_ANY} list comments
	 * @returns {string} them, as the fields terser reads
	 */
	const comments = (list) =>
		(list || [])
			.map(
				(/** @type {EXPECTED_ANY} */ comment) =>
					`${comment.type}:${comment.value}:${comment.nlb}:${comment.line}:${comment.col}:${comment.pos}`
			)
			.join("|");
	/**
	 * @param {string} where the token's path
	 * @param {EXPECTED_ANY} a terser's token
	 * @param {EXPECTED_ANY} b the converted token
	 * @param {boolean} isStart whether it starts its node
	 * @returns {string | undefined} how they differ
	 */
	const token = (where, a, b, isStart) => {
		if (!a || !b) {
			return Boolean(a) === Boolean(b) ? undefined : `${where}: presence`;
		}
		const named = (/** @type {string} */ type) =>
			type === "name" || type === "privatename" || type === "string";
		if (named(a.type) || named(b.type)) {
			if (a.type !== b.type || a.value !== b.value) return `${where}: type/value`;
		}
		if ((a.value === "Array") !== (b.value === "Array")) return `${where}: value`;
		for (const key of ["quote", "nlb", "line", "col", "file"]) {
			if (a[key] !== b[key]) return `${where}: ${key} ${a[key]} vs ${b[key]}`;
		}
		if (isStart && a.pos !== b.pos) return `${where}: pos`;
		for (const key of ["comments_before", "comments_after"]) {
			if (comments(a[key]) !== comments(b[key])) return `${where}: ${key}`;
			if (a[key].length || b[key].length) {
				if (idOf(0, a[key]) !== idOf(1, b[key])) return `${where}: ${key} sharing`;
			}
		}
		return undefined;
	};
	/**
	 * @param {string} where the path so far
	 * @param {EXPECTED_ANY} a terser's side
	 * @param {EXPECTED_ANY} b the converted side
	 * @returns {string | undefined} how they differ
	 */
	const walk = (where, a, b) => {
		if (a instanceof ast.AST_Node || b instanceof ast.AST_Node) {
			if (!(a instanceof ast.AST_Node) || !(b instanceof ast.AST_Node)) {
				return `${where}: node presence`;
			}
			if (a.TYPE !== b.TYPE) return `${where}: ${a.TYPE} vs ${b.TYPE}`;
			const difference =
				token(`${where}.start`, a.start, b.start, true) ||
				token(`${where}.end`, a.end, b.end, false);
			if (difference) return difference;
			for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
				if (key === "start" || key === "end") continue;
				if (key === "thedef") {
					if ((a[key] && a[key].name) !== (b[key] && b[key].name)) {
						return `${where}.thedef`;
					}
					continue;
				}
				const inner = walk(`${where}.${a.TYPE}.${key}`, a[key], b[key]);
				if (inner) return inner;
			}
			return undefined;
		}
		if (Array.isArray(a) || Array.isArray(b)) {
			if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
				return `${where}: length`;
			}
			for (let i = 0; i < a.length; i++) {
				const inner = walk(`${where}[${i}]`, a[i], b[i]);
				if (inner) return inner;
			}
			return undefined;
		}
		if (a && typeof a === "object" && b && typeof b === "object") {
			return JSON.stringify(a) === JSON.stringify(b) ? undefined : `${where}: object`;
		}
		return Object.is(a, b) ? undefined : `${where}: ${String(a)} vs ${String(b)}`;
	};
	return walk("", theirs, ours);
};

/**
 * Sources chosen for what terser's parser decides differently from the
 * specification's shape of a tree: tokens, comments and the nodes it builds.
 * @type {[string, string, boolean?][]}
 */
const CASES = [
	["comments before, inside and after parentheses", "/* a */ (/* b */ x /* c */) /* d */; y = /* e */ ((/* f */ z)) // g\n;"],
	["a comment moving across nested parentheses", "/** @type {T} */ (\n\t(a && b).c\n);"],
	["a parenthesized sequence and what follows it", "switch (x) { case (a = 1, 2): // two\n\tbreak; }"],
	["a parenthesized sequence with comments after it", "f((a, b) /* one */, c); (d, e) // two\n;"],
	["a sequence ends a token past the one after it", "a, b; c, d\n e; for (a, b; c, d; e, f) g;"],
	["await ends on its operand's first token", "async () => { await x.y(); await (z); };"],
	["yield starts past the keyword", "function* g() { yield; yield x; yield* y(); const z = yield /r/g; }"],
	["templates end past themselves", "a = `x${b}y${`z${c}`}` + d; f(`t`, ...e); new G(...h);"],
	["templates in binary and logical expressions", "x = a + `${b}` + `${c}`; y = d && `e`; z = `${f(\n g\n)}`;"],
	["function parameters", "function f(a, [b, , c = 1], { d, e: [f], g = 2, ...h }, i = 3, ...j) {}"],
	["arrow parameters", "(a, [b, , c = 1], { d, e: f = 2 }, ...g) => a; async h => h; async (i) => i; j => j;"],
	["catch clauses and declarations", "try {} catch ({ a, b: [c] }) {} finally {} var { d = 1 } = e, [f, , g] = h;"],
	["assignment targets", "({ a, b: c = 1, ...d } = e); [f, , ...g] = h; for ({ i } of j); for ([k] in l);"],
	["loops, labels and their bodies", "while (a) b(); do c(); while (d); with (e) f(); l: for (;;) if (g) continue l; else break l;"],
	["statements the parser does not wrap", "while (a) { while (b) if (c) d(); else e(); } do ; while (f);"],
	["directives, and strings that are not", `"use strict"; 'x'; "\\x61"; "b"; function f() { "use asm"; ("c"); }`],
	["an empty statement ends the prologue", `; "use strict"; function f() { ; "not a directive"; }`],
	["objects and classes", "x = { a, b: 1, 'c': 2, 3: 4, [d]: 5, get e() {}, set e(v) {}, async *f() {}, ...g }; class H extends (I, J) { static #k = 1; l; 'm' = 2; static { n(); } get #o() {} static async *p() {} [q]() {} }"],
	["annotations", "/*#__PURE__*/ a(); /*@__PURE__*/ new B(); /*#__INLINE__*/ c(); /*#__NOINLINE__*/ d.e(); x = /*#__KEY__*/ 'k'; y = { /*@__MANGLE_PROP__*/ f: 1 }; /*#__PURE__*/ (g)(); /* x */ (/*#__PURE__*/ h());"],
	["member chains, optional chains and calls", "a.b.c(); d?.e.f(); g.h?.[i]?.(j); k()(); l`m`.n; (o.p)(); async(q, ...r); new s.t.u(v).w;"],
	["private names", "class A { #a; b(c) { return #a in c; } }"],
	["regular expressions read twice", "{}\n/a/.test(b); if (c) /d/.test(e); x = yield_ => /f/;"],
	["literals", "a = [1, 1.5, .5, 1e3, 0x10, 0b1, 0o7, 1_000, 10n, 0x1Fn, 1e400, 'x', \"y\", null, true, false, /re/giu];"],
	["identifiers beyond ASCII", "var été = 1, \u{1d49c} = 2; sink(été, \u{1d49c});"],
	["line breaks of every kind", "a = 1\r\nb = 2\rc = 3 d = 4 e = /* x\r\ny */ 5;"],
	["a shebang and banners", "#!/usr/bin/env node\n/*! banner */\n// line\nsink();"],
	["an empty source", ""],
	["only comments", "/* a */ // b\n"],
	[
		"imports and exports",
		`import a, { b, c as d, "e" as f } from "g" with { type: "json" };
		import * as h from "i"; import "j"; import k, * as l from "m"; import {} from "n";
		export { a, b as o, d as "p" }; export * from "q"; export * as r from "s";
		export { t as u } from "v"; export const w = 1; export function x() {} export class Y {}`,
		true
	],
	["a default export swallowing a semicolon", "export default function () {};\nexport const a = 1;;", true],
	["a default class export swallowing a semicolon", "export default class {};", true],
	["default exports", "export default async function () {}", true],
	["default export of an expression", "export default (a, b);", true],
	["default export of an object", "export default { a };", true],
	["import.meta and dynamic imports", "x = import.meta.url; y = import('z'); w = import('v', { with: {} });", true]
];

/**
 * Sources terser reads unlike the specification, which the conversion leaves
 * to terser's own parser.
 * @type {[string, string][]}
 */
const DECLINED = [
	["an HTML comment opening", "x = 1; <!-- y\n"],
	["an HTML comment closing a line", "x = 1;\n--> y\n"],
	["a string holding a line continuation", "x = 'a\\\nb';"],
	["a template holding a line continuation", "x = `a\\\nb`;"],
	["an invalid escape in a tagged template", "f`\\x`;"],
	["a legacy octal number", "x = 0123;"],
	["a bare async before a function", "async\nfunction f() {}"],
	["let as an identifier", "let = 1;"],
	["a class field named async", "class A { async\n*b() {} }"],
	["more operators after a private in", "class A { #a; b(c) { return #a in c && c; } }"],
	["what webpack's parser refuses", "function ("]
];

describe("syntax-printer parse", () => {
	/** @type {{ ast: EXPECTED_ANY, parse: EXPECTED_ANY }} */
	let terser;
	/** @type {ReturnType<typeof createTerserTree>} */
	let toTree;

	beforeAll(async () => {
		terser = await loadTerser();
		toTree = createTerserTree(terser);
	});

	for (const [name, source, module] of CASES) {
		it(`should build terser's own tree: ${name}`, () => {
			const options = { module: Boolean(module), filename: "input.js" };
			const theirs = terser.parse.parse(source, options);
			const ours = toTree(source, options);
			expect(ours).toBeDefined();
			expect(firstDifference(terser.ast, theirs, ours)).toBeUndefined();
			// Converted twice, so what a call keeps for the next is held to it.
			expect(firstDifference(terser.ast, theirs, toTree(source, options))).toBeUndefined();
		});
	}

	for (const [name, source] of DECLINED) {
		it(`should leave to terser: ${name}`, () => {
			expect(toTree(source, { filename: "input.js" })).toBeUndefined();
		});
	}

	it("should build terser's own tree for acorn's corpus wherever it reads it", () => {
		let compared = 0;
		/** @type {string[]} */
		const differences = [];
		for (const { code, options } of ACORN_CORPUS.cases) {
			const settings = {
				module: Boolean(options && options.sourceType === "module"),
				filename: "input.js"
			};
			let theirs;
			try {
				theirs = terser.parse.parse(code, settings);
			} catch (_err) {
				continue;
			}
			const ours = toTree(code, settings);
			if (ours === undefined) continue;
			compared++;
			const difference = firstDifference(terser.ast, theirs, ours);
			if (difference) differences.push(`${code}\n\t${difference}`);
		}
		expect(differences).toEqual([]);
		expect(compared).toBeGreaterThan(2000);
	});
});

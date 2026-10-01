"use strict";

// cspell:ignore endline, endcol, endpos, nlb, thedef

const acorn = require("acorn");
const { load } = require("../../lib/javascript/syntax").printer;
const { loadTerserSources } = require("../helpers/terserSources");

/**
 * @param {string} specifier a module's URL
 * @returns {Promise<EXPECTED_ANY>} the module, imported through this file's runtime
 */
const importTerserSource = (specifier) => import(specifier);
const ACORN_CORPUS = require("../fixtures/acorn-corpus.json");

// A token's fields, past which a converted tree keeps nothing a minify reads.
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
	"comments_before",
	"comments_after"
];

/**
 * Where two trees, each of its own classes, first disagree.
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
		if (a.constructor.name !== b.constructor.name) {
			return `${where}: ${a.constructor.name} vs ${b.constructor.name}`;
		}
		const keys =
			a.constructor.name === "AST_Token"
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
 * @param {unknown} value an ESTree tree, or anything a conversion returns
 * @returns {string} it as text, a bigint as its digits
 */
const text = (value) =>
	JSON.stringify(value, (_key, item) =>
		typeof item === "bigint" ? `${item}n` : item
	);

describe("syntax-printer's port of terser's ESTree conversion", () => {
	/** @type {{ theirs: EXPECTED_ANY, ours: EXPECTED_ANY }} */
	const modules = { theirs: undefined, ours: undefined };

	beforeAll(async () => {
		modules.theirs = await loadTerserSources(importTerserSource);
		modules.ours = (await load()).modules;
	});

	/**
	 * @param {string} code a source
	 * @param {"script" | "module"} sourceType how acorn reads it
	 * @returns {string[]} how the conversions disagree
	 */
	const disagreements = (code, sourceType) => {
		/** @type {string[]} */
		const found = [];
		for (const locations of [false, true]) {
			/** @type {string} */
			let estree;
			try {
				estree = text(
					acorn.parse(code, {
						ecmaVersion: "latest",
						sourceType,
						locations,
						ranges: locations,
						allowHashBang: true,
						allowReturnOutsideFunction: true,
						sourceFile: locations ? "a.js" : undefined
					})
				);
			} catch (_err) {
				return found;
			}
			// Each conversion is handed its own copy: terser's writes into it.
			const fresh = () =>
				JSON.parse(estree, (_key, item) =>
					typeof item === "string" && /^-?\d+n$/.test(item)
						? BigInt(item.slice(0, -1))
						: item
				);
			/** @type {EXPECTED_ANY[]} */
			const results = [];
			for (const { ast } of [modules.theirs, modules.ours]) {
				try {
					results.push(ast.AST_Node.from_mozilla_ast(fresh()));
				} catch (err) {
					results.push(new Error(/** @type {Error} */ (err).message));
				}
			}
			const [theirs, ours] = results;
			const difference =
				theirs instanceof Error || ours instanceof Error
					? text(String(theirs)) === text(String(ours))
						? undefined
						: `${theirs} / ${ours}`
					: firstDifference(theirs, ours);
			if (difference) found.push(`from ${sourceType} ${locations}: ${difference}`);
		}
		for (const mangled of [false, true]) {
			/** @type {string[]} */
			const results = [];
			for (const { parse } of [modules.theirs, modules.ours]) {
				try {
					const tree = parse.parse(code, { module: sourceType === "module" });
					if (mangled) {
						tree.figure_out_scope({ module: sourceType === "module" });
						tree.compute_char_frequency({});
						tree.mangle_names({ module: sourceType === "module" });
					}
					results.push(text(tree.to_mozilla_ast()));
				} catch (err) {
					results.push(`throws ${/** @type {Error} */ (err).message}`);
				}
			}
			if (results[0] !== results[1]) {
				found.push(`to ${sourceType} ${mangled}: ${results[0]} vs ${results[1]}`);
			}
		}
		return found;
	};

	it("should convert acorn's corpus both ways as terser does", () => {
		/** @type {string[]} */
		const found = [];
		for (const { code, options } of ACORN_CORPUS.cases) {
			const sourceType =
				options && options.sourceType === "module" ? "module" : "script";
			for (const difference of disagreements(code, sourceType)) {
				found.push(`${JSON.stringify(code)}: ${difference}`);
			}
		}
		expect(found).toEqual([]);
	});

	it("should convert what the corpus leaves out as terser does", () => {
		/** @type {[string, "script" | "module"][]} */
		const sources = [
			["class A { static #a = 1; #b() {} get #c() {} set #c(v) {} static { #a in this; } }", "script"],
			["label: for (;;) { inner: while (a) { continue label; break inner; } }", "script"],
			["x = { 'a': 1, 2: 3, 'b'() {}, get 'c'() {}, [d]: 4, e, f = 5 } = g", "script"],
			["x = { 'a': 1, 2: 3, 'b'() {}, get 'c'() {}, [d]: 4, e, ...f }", "script"],
			["import a, * as b from 'c'; import { 'd' as e, f } from 'g' with { type: 'json' }; export { e as 'h' }; export * as 'i' from 'j'", "module"],
			["export * from 'a' with { type: 'json' }; export default class {} ", "module"],
			["export default function () {}; export const x = 1;", "module"],
			["import.meta; import('a', { with: {} }); new.target", "script"],
			["'use strict'; 'second'; function f() { 'inner'; return a?.b?.[c]?.(d); }", "script"],
			["x = 10n + 0x10n; y = /a/v; z = 1e400; w = -0", "script"],
			["using a = b; async function f() { await using c = d; for (using e of f); }", "script"],
			["try {} catch {} try {} catch ([a]) {} finally {}", "script"],
			["x = a ?? b; y = a || b && c; z = (a, b); a **= 2; a ??= b", "script"],
			["class A extends B { constructor() { super(); super.x(); } 'm'() {} 1() {} static async *[n]() {} }", "script"],
			["x = `a${b}c` + tag`d${e}`; y = async () => { for await (const z of w) yield* z; }", "script"]
		];
		/** @type {string[]} */
		const found = [];
		for (const [code, sourceType] of sources) {
			for (const difference of disagreements(code, sourceType)) {
				found.push(`${JSON.stringify(code)}: ${difference}`);
			}
		}
		expect(found).toEqual([]);
	});

	it("should refuse what terser refuses", () => {
		/** @type {EXPECTED_ANY[]} */
		const trees = [
			{ type: "Program", body: [{ type: "Unknown" }] },
			{
				type: "Program",
				body: [
					{
						type: "TryStatement",
						block: { type: "BlockStatement", body: [] },
						handlers: [{}, {}]
					}
				]
			},
			{
				type: "Program",
				body: [
					{
						type: "ClassDeclaration",
						id: { type: "Identifier", name: "A" },
						body: {
							type: "ClassBody",
							body: [
								{
									type: "FieldDefinition",
									computed: false,
									key: { type: "Literal", value: "a" },
									value: null
								}
							]
						}
					}
				]
			},
			{
				type: "Program",
				body: [
					{
						type: "VariableDeclaration",
						kind: "var",
						declarations: [
							{
								type: "VariableDeclarator",
								id: { type: "MemberExpression" },
								init: null
							}
						]
					}
				]
			},
			{
				type: "Program",
				body: [
					{
						type: "ExpressionStatement",
						expression: { type: "Literal", value: null, regex: {}, raw: "nope" }
					}
				]
			},
			{
				type: "Program",
				body: [
					{
						type: "ExpressionStatement",
						expression: {
							type: "Literal",
							value: null,
							regex: { flags: "g" },
							raw: "/a/g"
						}
					},
					{
						type: "ExpressionStatement",
						expression: { type: "Literal", value: 1, bigint: "1", raw: "1n" }
					},
					{
						type: "ExpressionStatement",
						expression: {
							type: "MetaProperty",
							meta: { type: "Identifier", name: "a" },
							property: { type: "Identifier", name: "b" }
						}
					}
				]
			}
		];
		for (const tree of trees) {
			/** @type {string[]} */
			const results = [];
			for (const { ast } of [modules.theirs, modules.ours]) {
				try {
					results.push(text(ast.AST_Node.from_mozilla_ast(JSON.parse(JSON.stringify(tree))).TYPE));
				} catch (err) {
					results.push(`throws ${/** @type {Error} */ (err).message}`);
				}
			}
			expect(results[1]).toBe(results[0]);
		}
	});
});

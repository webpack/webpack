"use strict";

// cspell:ignore endline, endcol, endpos, nlb, thedef

const acorn = require("acorn");
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
const { nodeClasses } = require("../../lib/javascript/syntax-printer-data");

// What terser calls each field webpack's node classes name as ESTree does, by
// class: the trees are compared under terser's names.
/** @type {Map<string, Record<string, string>>} */
const RENAMED_FIELDS = new Map(
	nodeClasses().map(({ type, renamed }) => [type, renamed])
);

// The fields webpack's node classes hold where ESTree has them and terser's
// classes none.
const ESTREE_ADDED_FIELDS = new Set(["computed", "kind", "method", "shorthand"]);

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
		// webpack holds a name terser held as a string as a node.
		if (
			typeof a === "string" &&
			typeof b === "object" &&
			b !== null &&
			(b.TYPE === "SymbolProperty" || b.TYPE === "SymbolPrivateProperty")
		) {
			return a === b.name ? undefined : `${where}: ${a} vs ${b.name}`;
		}
		if (typeof a !== typeof b) return `${where}: ${typeof a} vs ${typeof b}`;
		if (typeof a === "number" && Number.isNaN(a) && Number.isNaN(b)) {
			return undefined;
		}
		// webpack holds a hole as null, where terser has a node.
		if (b === null && a !== null && a.constructor.name === "AST_Hole") {
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
		// webpack names a node's class for its type with `Node` after it and its
		// token class `ParsedToken`, where terser prefixes `AST_`, so the classes
		// are compared by what they hold rather than by name.
		const kindOf = (/** @type {EXPECTED_ANY} */ node) =>
			node.constructor.name.replace(/^(?:AST_|Parsed)/, "").replace(/Node$/, "");
		if (kindOf(a) !== kindOf(b)) {
			return `${where}: ${a.constructor.name} vs ${b.constructor.name}`;
		}
		const renamed = (kindOf(b) !== "Token" && RENAMED_FIELDS.get(b.TYPE)) || {};
		/** @type {Record<string, string>} */
		const ourNames = {};
		for (const ourName of Object.keys(renamed)) {
			ourNames[renamed[ourName]] = ourName;
		}
		const keys =
			kindOf(a) === "Token"
				? TOKEN_FIELDS
				: new Set([
						...Object.keys(a),
						...Object.keys(b).map((key) => renamed[key] || key)
					]);
		for (const key of keys) {
			// webpack holds a class's members in a class body, where terser's
			// class holds them as `properties` and its `body` holds nothing.
			const isClass = b.TYPE === "DefClass" || b.TYPE === "ClassExpression";
			if (isClass && key === "body" && a.body === undefined) continue;
			// webpack's directive holds terser's `value` as `directive`, its quote
			// on the string literal it holds as `expression`.
			const isDirective = b.TYPE === "Directive";
			if (isDirective && (key === "directive" || key === "expression")) {
				continue;
			}
			if (ESTREE_ADDED_FIELDS.has(key) && !(key in a)) continue;
			// webpack's destructuring holds terser's `names` as an array pattern's
			// `elements` or an object pattern's `properties`, the other null.
			const isPattern = b.TYPE === "Destructuring";
			if (isPattern && (key === "elements" || key === "properties")) continue;
			let ours =
				isClass && key === "properties"
					? b.body.body
					: isPattern && key === "names"
						? b.is_array
							? b.elements
							: b.properties
						: isDirective && key === "value"
						? b.directive
						: isDirective && key === "quote"
							? b.expression.quote
							: b[ourNames[key] || key];
			// webpack holds a function's or catch's statements in a block.
			if (
				Array.isArray(a[key]) &&
				ours &&
				ours.TYPE === "BlockStatement" &&
				Array.isArray(ours.body)
			) {
				ours = ours.body;
			}
			const inner = walk(`${where}.${key}`, a[key], ours);
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

/**
 * The root node class of either side: webpack names it for what it is, terser
 * prefixes `AST_`.
 * @param {EXPECTED_ANY} ast one side's node classes
 * @returns {EXPECTED_ANY} its root class
 */
const rootOf = (ast) => ast.SyntaxNode || ast.AST_Node;

/**
 * Reads back a BigInt `text` wrote as a string.
 * @param {string} _key the key
 * @param {unknown} item the value read
 * @returns {unknown} the value, a BigInt where it was one
 */
const reviveBigInt = (_key, item) =>
	typeof item === "string" && /^-?\d+n$/.test(item)
		? BigInt(item.slice(0, -1))
		: item;

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
	 * @returns {Promise<string[]>} how the conversions disagree
	 */
	const disagreements = async (code, sourceType) => {
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
			const fresh = () => JSON.parse(estree, reviveBigInt);
			/** @type {EXPECTED_ANY[]} */
			const results = [];
			for (const { ast } of [modules.theirs, modules.ours]) {
				try {
					results.push(rootOf(ast).from_mozilla_ast(fresh()));
				} catch (err) {
					results.push(new Error(thrownMessage(err)));
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
			// Both trees are read from the same ESTree, as the conversion above
			// holds them alike, so only the conversion back is compared.
			for (const side of [modules.theirs, modules.ours]) {
				try {
					const tree = rootOf(side.ast).from_mozilla_ast(
						JSON.parse(
							text(
								acorn.parse(code, {
									ecmaVersion: "latest",
									sourceType,
									allowHashBang: true,
									allowReturnOutsideFunction: true
								})
							),
							reviveBigInt
						)
					);
					if (mangled) {
						// terser's `minify` mangles a tree it is given, and hands it back.
						const { ast } = await side.minify(tree, {
							compress: false,
							mangle: { module: sourceType === "module" },
							format: { spidermonkey: true, code: false }
						});
						results.push(text(ast));
					} else {
						results.push(text(tree.to_mozilla_ast()));
					}
				} catch (err) {
					results.push(`throws ${thrownMessage(err)}`);
				}
			}
			if (results[0] !== results[1]) {
				found.push(`to ${sourceType} ${mangled}: ${results[0]} vs ${results[1]}`);
			}
		}
		return found;
	};

	it("should convert acorn's corpus both ways as terser does", async () => {
		/** @type {string[]} */
		const found = [];
		for (const { code, options } of ACORN_CORPUS.cases) {
			const sourceType =
				options && options.sourceType === "module" ? "module" : "script";
			for (const difference of await disagreements(code, sourceType)) {
				found.push(`${JSON.stringify(code)}: ${difference}`);
			}
		}
		expect(found).toEqual([]);
	});

	it("should convert what the corpus leaves out as terser does", async () => {
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
			for (const difference of await disagreements(code, sourceType)) {
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
					results.push(text(rootOf(ast).from_mozilla_ast(JSON.parse(JSON.stringify(tree))).TYPE));
				} catch (err) {
					results.push(`throws ${thrownMessage(err)}`);
				}
			}
			expect(results[1]).toBe(results[0]);
		}
	});
});

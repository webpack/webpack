"use strict";

const { toEstreeObject } = require("../../lib/javascript/syntax");
const {
	Field,
	Flag,
	NodeType,
	Part,
	SyntaxTree,
	WebpackParser
} = require("../../lib/javascript/syntax-parser");
const { firstDifference } = require("../helpers/compareParserOutput");

/** @typedef {import("estree").Node} EstreeNode */

// The options a build parses with, and the ones the minifier does.
const OPTION_SETS = [
	{
		ecmaVersion: /** @type {const} */ ("latest"),
		ranges: true,
		allowReturnOutsideFunction: true,
		allowAwaitOutsideFunction: true,
		importPhases: true
	},
	{
		ecmaVersion: /** @type {const} */ ("latest"),
		preserveParens: true,
		allowSuperOutsideMethod: true,
		importPhases: true
	}
];

const SCRIPT = `
var a = 1, b; let c; const d = 2;
function* generate(x = 1, { y, z: [w, , ...v] }, ...rest) { yield* x; yield; }
function strict() { "use strict"; }
async function run() { await a; for await (const x of y) {} }
const arrow = async (p) => (p ? 1 : 2);
const K = class Named extends Base {
	#hidden = 1; static s; static { this.t = 1; }
	method() { return #hidden in this && super.x; }
	get g() { return 1; } set g(value) {}
};
function F() { new.target; }
outer: for (let i = 0; i < 1; i++) { if (i) continue outer; else break outer; }
for (const k in o); for (x of y) {}
while (a) a--; do ++a; while (false);
with (o) { p; }
switch (a) { case 1: break; default: }
try { throw new Error("e"); } catch ({ message }) {} finally { debugger; }
try {} catch {}
o?.p?.[q]?.(r);
tag\`a\${b}c\`; \`x\${y}\`;
a = b += c ?? d; e || (f && g);
[a, , b] = [1, , ...c]; ({ a, b: e = 1, ...f } = { a, [b]: 1, get c() {}, d() {} });
x = /re/gi; y = 10n; z = null; t = true; u = 1.5e3; s = "s";
(a, b); void 0; typeof a; delete o.p; -a; !a; ~a;
(function () { return; })();
`;

const MODULE = `
import a, { b as c, "d" as e } from "x" with { type: "json" };
import * as ns from "y";
import defer * as lazy from "z";
export const f = 1;
export default class extends a {}
export { f as g, c };
export * as h from "x";
export * from "x" with { type: "json" };
await import("x", { with: { type: "json" } });
import.meta.url;
import.defer("x");
`;

const SKIPPED = new Set(["type", "start", "end", "range", "regex", "bigint"]);

/**
 * Writes a parsed tree into a `SyntaxTree` as a parser writing columns would.
 * @param {SyntaxTree} tree the tree
 * @param {Record<string, EXPECTED_ANY>} node the parsed node
 * @param {Set<string>} seen the types written so far
 * @returns {number} the node's id
 */
const write = (tree, node, seen) => {
	seen.add(node.type);
	const id = tree.add(
		/** @type {Record<string, number>} */ (NodeType)[node.type],
		node.start,
		node.end
	);
	for (const key of Object.keys(node)) {
		if (SKIPPED.has(key)) continue;
		const value = node[key];
		if (Array.isArray(value)) {
			tree.set(
				id,
				key,
				value.map((item) => (item === null ? null : write(tree, item, seen)))
			);
		} else if (value && typeof value === "object" && "type" in value) {
			tree.set(id, key, write(tree, value, seen));
		} else {
			tree.set(id, key, value);
		}
	}
	return id;
};

/**
 * @param {string} code the source
 * @returns {{ tree: SyntaxTree, node: number }} the tree and its first expression
 */
const writeExpression = (code) => {
	const tree = new SyntaxTree();
	const statement = /** @type {EXPECTED_ANY} */ (
		WebpackParser.parse(code, { ecmaVersion: "latest" })
	).body[0];
	return { tree, node: write(tree, statement.expression, new Set()) };
};

describe("SyntaxTree", () => {
	it("rebuilds every node type the parser makes", () => {
		/** @type {Set<string>} */
		const seen = new Set();
		const tree = new SyntaxTree();
		for (const options of OPTION_SETS) {
			for (const [code, sourceType] of [
				[SCRIPT, "script"],
				[MODULE, "module"]
			]) {
				const program = WebpackParser.parse(code, {
					...options,
					sourceType: /** @type {"script" | "module"} */ (sourceType)
				});
				tree.reset();
				const rebuilt = toEstreeObject(tree, write(tree, program, seen));
				expect(firstDifference(rebuilt, program, "Program")).toBeNull();
			}
		}
		// Every type the tree knows, so a new one fails until a fixture has it.
		expect(seen.size).toBe(73);
	});

	it("writes a parsed tree whose parts were written first", () => {
		for (const options of OPTION_SETS) {
			const tree = new SyntaxTree();
			const program = /** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(SCRIPT, options)
			);
			/**
			 * Writes each function body under a node first, innermost first, the
			 * body standing as its id, as a parser writing as it goes leaves it.
			 * @param {EXPECTED_ANY} node a parsed node
			 * @returns {void}
			 */
			const writeBodies = (node) => {
				for (const key of Object.keys(node)) {
					const value = node[key];
					const children = Array.isArray(value) ? value : [value];
					for (const child of children) {
						if (child && typeof child === "object" && "type" in child) {
							writeBodies(child);
						}
					}
				}
				if (/Function/.test(node.type) && node.body.type === "BlockStatement") {
					node.body = tree.addEstree(node.body);
				}
			};
			writeBodies(program);
			// A statement of a list written first stands as its id too.
			program.body = program.body.map(
				(/** @type {EXPECTED_ANY} */ statement, /** @type {number} */ index) =>
					index % 2 === 0 ? tree.addEstree(statement) : statement
			);
			const rebuilt = toEstreeObject(tree, tree.addEstree(program));
			expect(
				firstDifference(
					rebuilt,
					WebpackParser.parse(SCRIPT, options),
					"Program"
				)
			).toBeNull();
		}
	});

	it("builds only the fields asked for, then the rest on the same object", () => {
		const { tree, node } = writeExpression("f(a, b);");
		const call = /** @type {EXPECTED_ANY} */ (
			toEstreeObject(tree, node, ["callee"])
		);
		expect(call.callee.name).toBe("f");
		expect("arguments" in call).toBe(false);
		expect(toEstreeObject(tree, node)).toBe(call);
		expect(
			call.arguments.map((/** @type {EXPECTED_ANY} */ arg) => arg.name)
		).toEqual(["a", "b"]);
		expect(call.optional).toBe(false);
		expect(toEstreeObject(tree, node, ["callee"])).toBe(call);
		expect(call.range).toEqual([0, 7]);
		call.range = [1, 6];
		expect(call.range).toEqual([1, 6]);
	});

	it("reads a literal's regex and bigint forms when asked for alone", () => {
		const regex = writeExpression("/a/g;");
		const literal = /** @type {EXPECTED_ANY} */ (
			toEstreeObject(regex.tree, regex.node, ["regex"])
		);
		expect(literal.regex).toEqual({ pattern: "a", flags: "g" });
		expect("value" in literal).toBe(false);
		const bigint = writeExpression("10n;");
		expect(
			/** @type {EXPECTED_ANY} */ (toEstreeObject(bigint.tree, bigint.node))
				.bigint
		).toBe("10");
	});

	it("clears a flag and starts over after reset", () => {
		const tree = new SyntaxTree();
		const member = tree.add(NodeType.MemberExpression, 0, 4);
		tree.set(member, "computed", true);
		tree.set(member, "computed", false);
		const before = /** @type {EXPECTED_ANY} */ (
			toEstreeObject(tree, member, ["computed"])
		);
		expect(before.computed).toBe(false);
		tree.reset();
		expect(tree.add(NodeType.ThisExpression, 0, 4)).toBe(member);
		expect(tree.type(member)).toBe(NodeType.ThisExpression);
		expect(toEstreeObject(tree, member)).not.toBe(before);
		expect(toEstreeObject(tree, 0)).toBeNull();
	});

	it("reads a field never set, or set to none, as empty", () => {
		const tree = new SyntaxTree();
		const block = tree.add(NodeType.BlockStatement, 0, 2);
		const name = tree.add(NodeType.Identifier, 0, 1);
		tree.set(name, "name", null);
		const statement = tree.add(NodeType.ExpressionStatement, 0, 2);
		tree.set(statement, "directive", undefined);
		expect(
			/** @type {EXPECTED_ANY} */ (toEstreeObject(tree, block)).body
		).toEqual([]);
		expect(
			/** @type {EXPECTED_ANY} */ (toEstreeObject(tree, name)).name
		).toBeNull();
		expect(
			"directive" in /** @type {EXPECTED_OBJECT} */ (toEstreeObject(tree, statement))
		).toBe(false);
		const literal = tree.add(NodeType.Literal, 0, 1);
		expect(tree.name(name)).toBe("");
		expect(tree.value(literal)).toBe("");
		expect(tree.textOf(Part.directive, statement)).toBeNull();
		expect(tree.fieldCount(Field.expression, statement)).toBe(0);
	});

	it("builds a tree nested deeper than the call stack", () => {
		const tree = new SyntaxTree();
		let node = tree.add(NodeType.Identifier, 0, 1);
		tree.set(node, "name", "a");
		for (let i = 0; i < 100000; i++) {
			const unary = tree.add(NodeType.UnaryExpression, 0, 1);
			tree.set(unary, "operator", "!");
			tree.set(unary, "prefix", true);
			tree.set(unary, "argument", node);
			node = unary;
		}
		let object = /** @type {EXPECTED_ANY} */ (toEstreeObject(tree, node));
		while (object.type === "UnaryExpression") object = object.argument;
		expect(object.name).toBe("a");
	});

	it("reads a node as the CSS and HTML paths read theirs", () => {
		const { tree, node } = writeExpression("a[b](1, /x/g, ...c);");
		expect(tree.type(node)).toBe(NodeType.CallExpression);
		expect(tree.range(node)).toEqual([0, 19]);
		expect(tree.flag(Flag.optional, node)).toBe(false);
		const callee = tree.field(0, Field.callee, node);
		expect(tree.fieldCount(Field.callee, node)).toBe(1);
		expect(tree.field(1, Field.callee, node)).toBe(0);
		expect(tree.type(callee)).toBe(NodeType.MemberExpression);
		expect(tree.flag(Flag.computed, callee)).toBe(true);
		expect(tree.flag(Flag.optional, callee)).toBe(false);
		expect(tree.name(tree.field(0, Field.object, callee))).toBe("a");
		expect(tree.fieldCount(Field.arguments, node)).toBe(3);
		const regex = tree.field(1, Field.arguments, node);
		expect(tree.value(regex)).toEqual(/x/g);
		expect(tree.textOf(Part.raw, regex)).toBe("/x/g");
		expect(tree.start(regex)).toBe(8);
		expect(tree.end(regex)).toBe(12);
		expect(tree.field(3, Field.arguments, node)).toBe(0);
		expect(tree.fieldCount(Field.body, node)).toBe(0);
		expect(tree.field(0, Field.body, node)).toBe(0);
		expect(tree.name(node)).toBe("");
		expect(tree.value(node)).toBe("");
		expect(tree.textOf(Part.operator, node)).toBeNull();
		const spread = tree.field(2, Field.arguments, node);
		expect(tree.name(tree.field(0, Field.argument, spread))).toBe("c");
	});

	it("refuses an unknown type or field", () => {
		const tree = new SyntaxTree();
		expect(() => tree.add(0, 0, 1)).toThrow(/Unknown node type/);
		const node = tree.add(NodeType.Identifier, 0, 1);
		expect(() => tree.set(node, "value", 1)).toThrow(/has no field value/);
	});
});

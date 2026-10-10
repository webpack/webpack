"use strict";

const JavascriptNodeStore = require("../../lib/javascript/JavascriptNodeStore");
const { WebpackParser } = require("../../lib/javascript/syntax-parser");
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
 * Writes a parsed tree into the store as a parser writing columns would.
 * @param {JavascriptNodeStore} store the store
 * @param {Record<string, EXPECTED_ANY>} node the parsed node
 * @param {Set<string>} seen the types written so far
 * @returns {number} the node's ref
 */
const write = (store, node, seen) => {
	seen.add(node.type);
	const ref = store.add(node.type, node.start, node.end);
	for (const key of Object.keys(node)) {
		if (SKIPPED.has(key)) continue;
		const value = node[key];
		if (Array.isArray(value)) {
			store.set(
				ref,
				key,
				value.map((item) => (item === null ? null : write(store, item, seen)))
			);
		} else if (value && typeof value === "object" && "type" in value) {
			store.set(ref, key, write(store, value, seen));
		} else {
			store.set(ref, key, value);
		}
	}
	return ref;
};

/**
 * @param {string} code the source
 * @returns {{ store: JavascriptNodeStore, ref: number }} the store and the call's ref
 */
const storeCall = (code) => {
	const store = new JavascriptNodeStore();
	const statement = /** @type {EXPECTED_ANY} */ (
		WebpackParser.parse(code, { ecmaVersion: "latest" })
	).body[0];
	return { store, ref: write(store, statement.expression, new Set()) };
};

describe("JavascriptNodeStore", () => {
	it("rebuilds every node type the parser makes", () => {
		/** @type {Set<string>} */
		const seen = new Set();
		const store = new JavascriptNodeStore();
		for (const options of OPTION_SETS) {
			for (const [code, sourceType] of [
				[SCRIPT, "script"],
				[MODULE, "module"]
			]) {
				const tree = WebpackParser.parse(code, {
					...options,
					sourceType: /** @type {"script" | "module"} */ (sourceType)
				});
				store.reset();
				const rebuilt = store.toEstreeObject(write(store, tree, seen));
				expect(firstDifference(rebuilt, tree, "Program")).toBeNull();
			}
		}
		// Every type the store knows, so a new one fails until a fixture has it.
		expect(seen.size).toBe(73);
	});

	it("builds only the fields asked for, then the rest on the same object", () => {
		const { store, ref } = storeCall("f(a, b);");
		const call = /** @type {EXPECTED_ANY} */ (
			store.toEstreeObject(ref, ["callee"])
		);
		expect(call.callee.name).toBe("f");
		expect("arguments" in call).toBe(false);
		expect(store.toEstreeObject(ref)).toBe(call);
		expect(call.arguments.map((/** @type {EXPECTED_ANY} */ arg) => arg.name)).toEqual(["a", "b"]);
		expect(call.optional).toBe(false);
		expect(store.toEstreeObject(ref, ["callee"])).toBe(call);
		expect(call.range).toEqual([0, 7]);
		call.range = [1, 6];
		expect(call.range).toEqual([1, 6]);
	});

	it("reads a literal's regex and bigint forms when asked for alone", () => {
		const regex = storeCall("/a/g;");
		const literal = /** @type {EXPECTED_ANY} */ (
			regex.store.toEstreeObject(regex.ref, ["regex"])
		);
		expect(literal.regex).toEqual({ pattern: "a", flags: "g" });
		expect("value" in literal).toBe(false);
		const bigint = storeCall("10n;");
		expect(
			/** @type {EXPECTED_ANY} */ (bigint.store.toEstreeObject(bigint.ref))
				.bigint
		).toBe("10");
	});

	it("clears a flag and starts over after reset", () => {
		const store = new JavascriptNodeStore();
		const member = store.add("MemberExpression", 0, 4);
		store.set(member, "computed", true);
		store.set(member, "computed", false);
		const before = /** @type {EXPECTED_ANY} */ (
			store.toEstreeObject(member, ["computed"])
		);
		expect(before.computed).toBe(false);
		store.reset();
		expect(store.add("ThisExpression", 0, 4)).toBe(member);
		expect(store.typeOf(member)).toBe("ThisExpression");
		expect(store.toEstreeObject(member)).not.toBe(before);
		expect(store.toEstreeObject(-1)).toBeNull();
	});

	it("refuses an unknown type or field", () => {
		const store = new JavascriptNodeStore();
		expect(() => store.add("JSXElement", 0, 1)).toThrow(/Unknown node type/);
		const ref = store.add("Identifier", 0, 1);
		expect(() => store.set(ref, "value", 1)).toThrow(/has no field value/);
	});
});

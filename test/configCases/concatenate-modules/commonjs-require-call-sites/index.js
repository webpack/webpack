// the ESM import gives this entry a concatenation; each require() below decides
// whether its target is absorbed into it
import { tag } from "./member";

function getLazy() {
	return require("./lazy").v;
}

const condV = global.__notSet ? require("./cond").v : "no";
const andV = global.__notSet && require("./and").v;
let tryV;
try {
	tryV = require("./try-target").v;
} catch (_err) {
	tryV = "failed";
}
const argM = require(global.__notSet ? "./arg-a" : "./arg-b");

require("./written-direct").p = "set";
const writtenDirect = require("./written-direct");

const resolveM = require("./resolve-target");
const resolveId = require.resolve("./resolve-target");

// snapshot before any test forces the lazy require()
const ORDER_AT_LOAD = global.__bailoutOrder.slice();

// no single target for a computed request; require.resolve() cannot concatenate
const BAILED_OUT = ["./arg-a.js", "./arg-b.js", "./resolve-target.js"];
// absorbed targets render as wrapped members, so they evaluate at their
// require() instead of at their position in the concatenation
const ABSORBED = [
	"./and.js",
	"./cond.js",
	"./index.js",
	"./lazy.js",
	"./member.js",
	"./try-target.js",
	"./written-direct.js"
];

it("should not evaluate a require() inside a function until it is called", () => {
	expect(ORDER_AT_LOAD).not.toContain("lazy");
	expect(getLazy()).toBe("lazy");
	expect(global.__bailoutOrder).toContain("lazy");
});

it("should never evaluate a require() in a branch that is not taken", () => {
	expect(condV).toBe("no");
	expect(andV).toBe(undefined);
	expect(global.__bailoutOrder).not.toContain("cond");
	expect(global.__bailoutOrder).not.toContain("and");
});

it("should keep a require() inside try/catch working", () => {
	expect(tryV).toBe("try-target");
});

it("should resolve a require() with a computed request at runtime", () => {
	expect(argM.v).toBe("arg-b");
	// only the taken branch evaluates
	expect(ORDER_AT_LOAD).not.toContain("arg-a");
});

it("should keep a member-assigned require() target writable", () => {
	expect(writtenDirect.p).toBe("set");
	expect(writtenDirect.v).toBe("written-direct");
});

it("should keep a require.resolve() target working", () => {
	// require(esm) is covered by the commonjs-require-esm fixture
	expect(tag).toBe("member");
	expect(resolveM.v).toBe("resolve-target");
	expect(resolveId).toBeDefined();
});

it("should leave a computed request and a require.resolve() target out of the concatenation", () => {
	const absorbed = new Set();
	for (const m of __STATS__.modules) {
		if (!m.modules) continue;
		for (const inner of m.modules) absorbed.add(inner.name);
	}
	for (const name of BAILED_OUT) {
		expect(absorbed).not.toContain(name);
	}
});

it("should absorb every require() target that can be wrapped", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual(ABSORBED);
});

it("should evaluate the absorbed targets at their require(), in source order", () => {
	// a bailed-out target is reached through a lazy accessor too, so it keeps its
	// source position instead of being hoisted above the concatenation
	expect(ORDER_AT_LOAD).toEqual([
		"member",
		"try-target",
		"arg-b",
		"written-direct",
		"resolve-target"
	]);
	delete global.__bailoutOrder;
});

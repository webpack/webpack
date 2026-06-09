import * as ns from "lib";
import { foo, bar } from "lib";
import { foo as rfoo } from "./reexport.js";

const SKIP = "(skipped side-effect-free modules)";

it("should resolve named, namespace and re-exported imports through a multi-star barrel", () => {
	expect(foo()).toBe(1);
	expect(bar()).toBe(2);
	expect(rfoo()).toBe(1);
	expect(ns.foo()).toBe(1);
	expect(ns.bar()).toBe(2);
	expect(Object.keys(ns).sort()).toEqual(["bar", "foo"]);
});

it("should skip the single-star sub-chains and land consumers on the real modules", () => {
	const mods = __STATS__.modules;
	const reasons = (suffix) => {
		const m = mods.find((m) => m.name.endsWith(suffix));
		return new Set(m.reasons.filter((r) => r.explanation === SKIP).map((r) => r.moduleName));
	};
	// real modules are reached directly, past the side-effect-free a.js/b.js
	expect(reasons("lib/real-a.js").has("./node_modules/lib/index.js")).toBe(true);
	expect(reasons("lib/real-b.js").has("./node_modules/lib/index.js")).toBe(true);
});

it("should leave the intermediate single-star passthroughs unused", () => {
	const mods = __STATS__.modules;
	for (const s of ["lib/a.js", "lib/b.js"]) {
		expect(mods.find((m) => m.name.endsWith(s)).usedExports).toBe(false);
	}
});

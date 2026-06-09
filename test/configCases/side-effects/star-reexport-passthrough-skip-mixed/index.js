import * as ns from "lib";
import { foo } from "lib";

const SKIP = "(skipped side-effect-free modules)";

it("should resolve named and namespace imports through a star + named barrel", () => {
	expect(foo()).toBe(1);
	expect(ns.foo()).toBe(1);
	expect(ns.c()).toBe(3);
	expect(Object.keys(ns).sort()).toEqual(["c", "foo"]);
});

it("should skip the single-star sub-chains and land consumers on the real modules", () => {
	const mods = __STATS__.modules;
	const reasons = (suffix) => {
		const m = mods.find((m) => m.name.endsWith(suffix));
		return new Set(m.reasons.filter((r) => r.explanation === SKIP).map((r) => r.moduleName));
	};
	expect(reasons("lib/real-a.js").has("./node_modules/lib/index.js")).toBe(true);
	expect(reasons("lib/real-c.js").has("./node_modules/lib/index.js")).toBe(true);
});

it("should leave the intermediate single-star passthroughs unused", () => {
	const mods = __STATS__.modules;
	for (const s of ["lib/a.js", "lib/c.js"]) {
		expect(mods.find((m) => m.name.endsWith(s)).usedExports).toBe(false);
	}
});

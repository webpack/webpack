import * as ns from "lib";

const SKIP = "(skipped side-effect-free modules)";

const stats = __STATS__.children[__STATS_I__];
const find = (suffix) => stats.modules.find((m) => m.name.endsWith(suffix));
const skippedFrom = (suffix) =>
	new Set(
		find(suffix)
			.reasons.filter((r) => r.explanation === SKIP)
			.map((r) => r.moduleName)
	);

it("should resolve fan-out named imports to their distinct real source modules", () => {
	expect(ns.foo()).toBe(1);
	expect(ns.bar()).toBe(2);
	expect(ns.baz()).toBe(3);

	// No `dep.id`, but still re-target/re-connect the deep star-reexport exportInfo.
	expect(Object.keys(ns).length).toBe(3);
});

it("should repoint each name past the passthrough and re-connect to its own real module", () => {
	expect(skippedFrom("lib/b-source.js").has("./node_modules/lib/b.js")).toBe(
		true
	);
	expect(skippedFrom("lib/b-source.js").has("./node_modules/lib/b-1.js")).toBe(
		true
	);
});

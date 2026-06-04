import * as ns from "lib";
import { foo, bar } from "./named.js";

const SKIP = "(skipped side-effect-free modules)";

it("should resolve named and namespace imports through a pure star passthrough chain", () => {
	expect(foo()).toBe(1);
	expect(bar()).toBe(2);
	expect(ns.foo()).toBe(1);
	expect(ns.bar()).toBe(2);
	expect(ns.baz()).toBe(3);
	expect(Object.keys(ns).sort()).toEqual(["bar", "baz", "foo"]);
});

it("should repoint consumers past the passthrough chain onto the real module", () => {
	const real = __STATS__.modules.find((m) => m.name.endsWith("lib/real.js"));
	// both the namespace import (index.js) and the named re-export (named.js)
	// land directly on real.js, tagged with the skip explanation
	const skippedFrom = new Set(
		real.reasons.filter((r) => r.explanation === SKIP).map((r) => r.moduleName)
	);
	expect(skippedFrom.has("./index.js")).toBe(true);
	expect(skippedFrom.has("./named.js")).toBe(true);
	expect(skippedFrom.has("./node_modules/lib/a.js")).toBe(true);
});

it("should leave the intermediate star passthrough modules unused", () => {
	const intermediates = __STATS__.modules.filter(
		(m) => m.name.endsWith("lib/a.js") || m.name.endsWith("lib/b.js")
	);
	expect(intermediates).toHaveLength(2);
	for (const m of intermediates) {
		expect(m.usedExports).toBe(false);
	}
});

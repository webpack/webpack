import {
	bumped,
	cjsName,
	cjsNamespace,
	combined,
	nextFromCjs,
	wrappedNamespace
} from "./mixed.js";

it("should read both an ESM import and a require() from one module", () => {
	expect(combined).toBe("esm-dep+cjs-dep");
	expect(bumped).toBe(2);
	expect(cjsName).toBe("cjs-dep");
	expect(cjsNamespace.name).toBe("cjs-dep");
});

it("should share one instance across repeated require() calls", () => {
	expect(nextFromCjs()).toBe(1);
	expect(cjsNamespace.next()).toBe(2);
});

it("should evaluate a wrapped module at its import edge, before the importer body", () => {
	// require() alone would run it after "mixed"; the import edge pulls it ahead
	expect(global.__mixedOrder).toEqual(["wrapped-cjs", "mixed"]);
});

it("should share one instance between the import and the require of that module", () => {
	expect(wrappedNamespace.tag).toBe("wrapped-cjs");
	expect(
		global.__mixedOrder.filter((tag) => tag === "wrapped-cjs")
	).toHaveLength(1);
});

it("should concatenate the mixed module together with every dependency", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./cjs-dep.js",
		"./esm-dep.js",
		"./index.js",
		"./mixed.js",
		"./wrapped-cjs.js"
	]);
	delete global.__mixedOrder;
});

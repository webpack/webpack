import { ns } from "./a";

it("should concatenate both sides of the namespace re-export cycle", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./a.js",
		"./b.js",
		"./index.js"
	]);
});

it("should resolve a namespace re-export chain up to the cycle", () => {
	expect(ns.b).toBe(2);
	expect(ns.ns.a).toBe(1);
});

it("should bail out when the namespace re-export chain closes the cycle", () => {
	// `ns.ns.ns` walks a.ns -> b.ns -> a.ns, so the binding is rendered as a
	// self-calling function instead of a name; reading it throws
	expect(() => ns.ns.ns).toThrow();
});

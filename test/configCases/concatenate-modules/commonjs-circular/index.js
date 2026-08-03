import a from "./a";
import staleA from "./stale-a";

it("should run each module of a require cycle exactly once, innermost first", () => {
	expect(global.__order).toEqual([
		"a:start",
		"b:start",
		"b:end",
		"a:end",
		"stale-a:start",
		"stale-b:start",
		"stale-b:end",
		"stale-a:end"
	]);
});

it("should expose the partially-filled exports object to the cycle partner", () => {
	expect(a.name).toBe("a");
	expect(a.b.name).toBe("a from b: a");
	// `b` captured the exports object itself, so it sees `b` added afterwards
	expect(a.b.aRef).toBe(a);
});

it("should keep the stale reference when module.exports is reassigned late", () => {
	expect(staleA.name).toBe("stale-a");
	// `stale-b` ran before the reassignment, so it holds the original empty object
	expect(staleA.staleB.seenName).toBeUndefined();
	expect(staleA.staleB.seenKeys).toEqual([]);
	expect(staleA.staleB.aRef).not.toBe(staleA);
});

it("should concatenate the whole cycle", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./a.js",
		"./b.js",
		"./index.js",
		"./stale-a.js",
		"./stale-b.js"
	]);
	delete global.__order;
});

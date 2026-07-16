import { foo, usedResolve } from "./foo.js";

const assetNames = (__STATS__.assets || []).map((a) => a.name);

it("should keep the asset import for a used import.meta.resolve", () => {
	expect(foo).toBe("foo");
	expect(usedResolve).toContain("used.json");
	expect(assetNames.some((name) => name.includes("used.json"))).toBe(true);
});

it("should drop the asset import for an unused import.meta.resolve", () => {
	expect(assetNames.some((name) => name.includes("unused.json"))).toBe(false);
});

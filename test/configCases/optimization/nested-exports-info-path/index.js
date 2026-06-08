import {
	used,
	partly,
	whole,
	provideLeaf,
	provideMissing,
	providePastLeaf,
	usedLeaf,
	usedOther,
	usedUnused,
	useInfoUsed,
	canMangleLeaf
} from "./module.js";

it("should resolve deeply nested mangled used names to correct values", () => {
	// Reaching these values requires getUsedName to walk the nested path and emit
	// the mangled access for `used.deep.leaf` / `used.sibling` / `partly.kept`.
	expect(used.deep.leaf).toBe(42);
	expect(used.sibling).toBe(3);
	expect(partly.kept).toBe("yes");
});

it("should keep property access on a fully-used nested object", () => {
	// `whole` is consumed as a whole (not OnlyPropertiesUsed), so getUsedName keeps
	// the trailing id unchanged instead of descending.
	expect(JSON.stringify(whole)).toBe('{"m":1,"n":2}');
	expect(whole.m).toBe(1);
});

it("should walk isExportProvided at depth", () => {
	expect(provideLeaf).toBe(true);
	expect(provideMissing).toBe(false);
	expect(providePastLeaf).toBe(undefined);
});

it("should walk getUsed at depth", () => {
	expect(usedLeaf).toBe(true);
	expect(usedOther).toBe(false);
	expect(usedUnused).toBe(false);
	expect(useInfoUsed).toBe(true);
});

it("should resolve canMangle through a recursive nested lookup", () => {
	expect(canMangleLeaf).toBe(true);
});

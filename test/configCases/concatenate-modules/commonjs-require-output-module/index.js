import { constructed, member, whole } from "./consumer";

it("should read a whole-namespace require(esm) in an ESM output bundle", () => {
	expect(whole.NAME).toBe("esm");
	expect(whole.default).toBe("default");
});

it("should read a member of a require() in an ESM output bundle", () => {
	expect(member).toBe("cjs");
});

it("should pass an object module.exports through `new require()` in an ESM output bundle", () => {
	expect(constructed).toEqual({ value: "object" });
});

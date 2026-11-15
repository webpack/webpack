import optionalImported from "./optional-imported";

it("should preserve receivers of optional calls", () => {
	expect(require("./optional-required").map?.(value => value.toUpperCase())).toEqual(["MD", "MARKDOWN"]);
	expect(optionalImported.map?.(value => value.toUpperCase())).toEqual(["MD", "MARKDOWN"]);
	expect(require("./optional-nested").list.includes?.("markdown")).toBe(true);
});

it("should retain only the optional call receiver", () => {
	expect(global.__prototypeMethodsUsedExports.optionalNested).toEqual(["list"]);
});


it("should keep the receiver before an optional dynamic import access", async () => {
	const module = await import("./dynamic");
	expect(module.default.list?.map(value => value.toUpperCase())).toEqual(["MD", "MARKDOWN"]);
});

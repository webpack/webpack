it("should resolve an escaped identifier", () => {
	expect(require("./escaped")).toEqual([42, 42]);
});

it("should resolve a definition introduced by a loader's AST", () => {
	expect(require("./ast")).toBe(42);
});

it("should resolve a definition a custom parse function introduces", () => {
	expect(require("./parsed")).toBe(42);
});

it("should evaluate an async value reached through another definition", () => {
	expect(require("./alias")).toBe(42);
	expect(require("./generated")).toBe(42);
	expect(require("./sync-generated")).toBe(42);
});

it("should report an async error only when its definition is used", () => {
	expect(SETTINGS.used).toBe(42);
});

it("should provide the built module to an async generator", () => {
	expect(HAS_SOURCE).toBe(true);
});

it("should leave modules with noParse alone", () => {
	expect(require("./unparsed")).toBe(42);
});

it("should resolve the leaf key when a dotted value is merged into an object", () => {
	expect(MERGED.value).toBe("MERGED.value");
	expect(MERGED).toEqual({ value: "value" });
});

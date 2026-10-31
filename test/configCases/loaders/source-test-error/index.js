it("should report a source test that throws as a module error", () => {
	expect(() => require("./plain.js")).toThrow(/source test failed/);
});

it("should report a source test that throws a non-error value", () => {
	expect(() => require("./plain-null.js")).toThrow(/sourceTest threw null/);
});

it("should report a source test that throws a symbol", () => {
	expect(() => require("./plain-symbol.js")).toThrow(/sourceTest threw Symbol\(odd\)/);
});

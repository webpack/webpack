it("should replace require.extensions with undefined", function () {
	expect(require("./extensions")).toBe(undefined);
});

it("should replace a require.main.require() call with undefined", function () {
	expect(require("./main-require")).toBe(undefined);
});

it("should replace a module.parent.require() call with undefined", function () {
	expect(require("./parent-require")).toBe(undefined);
});

it("should replace a module.parent.require reference with undefined", function () {
	expect(require("./parent-require-expression")).toBe(undefined);
});

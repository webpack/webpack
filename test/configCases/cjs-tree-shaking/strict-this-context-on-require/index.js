it("should keep the namespace object as this for require(esm).fn()", () => {
	expect(require("./module").that().value).toBe(42);
	expect(require("./module").usedExports).toBe(true);
});

it("should still tree-shake member access that is not a call", () => {
	expect(require("./plain").value).toBe(7);
	expect(require("./plain").usedExports).toEqual(["usedExports", "value"]);
});

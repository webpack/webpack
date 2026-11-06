it("should keep a generator without `isBinary` to the `binary` option", () => {
	expect(require("./file.duck")).toBe(true);
	expect(require("./other.duck")).toBe(false);
});

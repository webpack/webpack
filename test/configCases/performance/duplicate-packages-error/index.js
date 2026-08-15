it("should include the same version of the package twice", () => {
	expect(require("copied-lib")).toBe("hoisted");
	expect(require("copy-consumer")).toBe("nested");
});

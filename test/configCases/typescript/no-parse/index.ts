it("blanks the types of a module module.noParse keeps from the parser", () => {
	expect(require("./vendor.cts")).toBe(1);
});

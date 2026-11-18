it("blanks the types of a module module.noParse keeps from the parser", () => {
	// a parse of `vendor.cts` refuses its top-level `new.target`
	expect(require("./vendor.cts")).toBe(1);
});

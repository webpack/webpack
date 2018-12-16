require("./common");

it("should have the correct main flag for multi first module", function() {
	expect(module.hot._main).toBe(true);
});

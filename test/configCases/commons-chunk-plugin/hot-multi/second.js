require("./common");

it("should have the correct main flag for multi second module", function() {
	expect(module.hot._main).toBe(true);
});

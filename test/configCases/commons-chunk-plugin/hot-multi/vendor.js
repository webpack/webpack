require("./common");

module.exports = "vendor";

it("should have the correct main flag for multi vendor module", function() {
	expect(module.hot._main).toBe(true);
});

it("should have the correct main flag", function() {
	var a = require("./vendor");
	expect(a._main).toBe(false);
	expect(module.hot._main).toBe(true);
});

it("should be main", function() {
	expect(require.main).toBe(module);
});

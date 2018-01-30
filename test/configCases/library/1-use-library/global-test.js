var data = require("library");

it("should be able get items from library (" + NAME + ")", function() {
	expect(data).toHaveProperty("default", "default-value");
	expect(data).toHaveProperty("a", "a");
	expect(data).toHaveProperty("b", "b");
});

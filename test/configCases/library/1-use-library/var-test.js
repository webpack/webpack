var getData = require("library");

it("should be able get items from library (" + NAME + ")", function() {
	const d = getData();
	expect(d).toHaveProperty("x");
	expect(d.x).toHaveProperty("y");
	const data = d.x.y;
	expect(data).toHaveProperty("default", "default-value");
	expect(data).toHaveProperty("a", "a");
	expect(data).toHaveProperty("b", "b");
});

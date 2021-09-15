it("should be able to use loadModule multiple times within a loader, on files in different directories", function() {
	const data = require("!./loader/index.js!./a.data");
	expect(data).toHaveProperty("a");
	expect(data).toHaveProperty("b");
	expect(data).toHaveProperty("c");
});

it("should run", function() {
	var a = require("./a");
	expect(a).toBe("a");
});

it("should be main", function() {
	expect(require.main).toBe(module);
});

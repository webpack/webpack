var a = require("./a");

it("should run", function() {
	expect(a).toBe("a");
});

var mainModule = require.main;

it("should be main", function() {
	expect(mainModule).toBe(module);
});

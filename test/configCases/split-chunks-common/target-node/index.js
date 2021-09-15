it("should run", function() {
	var a = require("a");
	expect(a).toBe("a");
	var b = require("b");
	expect(b).toBe("b");
	var c = require("c");
	expect(c).toBe("c");
	var d = require("d");
	expect(d).toBe("d");
});

it("should be main", function() {
	expect(require.main).toBe(module);
});

it("should match rule with resource query", function() {
	var a1 = require("./a");
	expect(a1).toEqual([
		"a"
	]);
	var a2 = require("./a?loader");
	expect(a2).toEqual([
		"a",
		"?query"
	]);
	var a3 = require("./a?other");
	expect(a3).toEqual([
		"a"
	]);
});

it("should match rule with multiple loaders in 'loader'", function() {
	var abc = require("./abc");
	expect(abc).toEqual([
		"abc",
		"?b",
		"?a"
	]);
});
it("should match rule with multiple loaders in 'loaders'", function() {
	var def = require("./def");
	expect(def).toEqual([
		"def",
		"?d",
		"?c"
	]);
});

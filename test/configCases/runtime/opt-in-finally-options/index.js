it("should throw exception on every try to load a module", function() {
	expect(function() {
		require("./exception");
	}).toThrow();
	expect(function() {
		require("./exception");
	}).toThrow();
});

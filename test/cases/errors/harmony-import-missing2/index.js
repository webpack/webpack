it("should not crash on importing missing modules", function() {
	expect(function() {
		require("./module1");
	}).toThrow();
});

it("should not crash on importing missing modules", function() {
	expect(function() {
		require("./module2");
	}).toThrow();
});

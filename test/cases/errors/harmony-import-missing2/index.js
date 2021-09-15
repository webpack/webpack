it("should not crash on importing missing modules", function() {
	expect(function() {
		require("./module1");
	}).toThrowError();
});

it("should not crash on importing missing modules", function() {
	expect(function() {
		require("./module2");
	}).toThrowError();
});

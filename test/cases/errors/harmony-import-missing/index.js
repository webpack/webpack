it("should not crash on importing missing modules", function() {
	expect(function() {
		require("./module");
	}).toThrowError();
});

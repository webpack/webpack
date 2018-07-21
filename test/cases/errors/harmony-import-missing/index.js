it("should not crash on importing missing modules", function() {
	(function() {
		require("./module");
	}).should.throw();
});

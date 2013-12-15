it("should handle the raw loader correctly", function() {
	require("raw!../_resources/abc.txt").should.be.eql("abc");
});

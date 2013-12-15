it("should handle the coffee loader correctly", function() {
	require("!coffee!../_resources/script.coffee").should.be.eql("coffee test");
	require("../_resources/script.coffee").should.be.eql("coffee test");
});

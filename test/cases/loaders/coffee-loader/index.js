it("should handle the coffee loader correctly", function() {
	require("!coffee-loader!../_resources/script.coffee").should.be.eql("coffee test");
	require("../_resources/script.coffee").should.be.eql("coffee test");
});

it("should handle literate coffee script correctly", function() {
	require("!coffee-loader?literate!./script.coffee.md").should.be.eql("literate coffee test");
});

it("should generate valid code with cheap-source-map", function() {
	require("!coffee-loader!./module-only.coffee");
});

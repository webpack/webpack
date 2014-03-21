it("should handle the coffee loader correctly", function() {
	require("!coffee!../_resources/script.coffee").should.be.eql("coffee test");
	require("../_resources/script.coffee").should.be.eql("coffee test");
});

it("should handle literate coffee script correctly", function() {
	require("!coffee?literate!./script.coffee.md").should.be.eql("literate coffee test");
});
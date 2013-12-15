it("should be able to use a context with a loader", function() {
	var abc = "abc", scr = "script.coffee";
	require("../_resources/" + scr).should.be.eql("coffee test");
	require("raw!../_resources/" + abc + ".txt").should.be.eql("abc");
});

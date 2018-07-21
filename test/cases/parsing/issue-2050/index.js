it("should support multiple reexports", function() {
	require("./x").should.be.eql({
		xa: "a",
		xb: "b",
		xc: "c",
		xd: "d"
	});
});

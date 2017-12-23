it("should require json via require", function() {
	({ data: require("./a.json") }).should.be.eql({ data: null });
	({ data: require("./b.json") }).should.be.eql({ data: 123 });
	({ data: require("./c.json") }).should.be.eql({ data: [1, 2, 3, 4] });
	({ data: require("./e.json") }).should.be.eql({ data: {
		"aa": 1,
		"bb": 2,
		"1": "x"
	} });
});

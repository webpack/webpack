it("should match a custom loader", function() {
	var a = require("./a");
	a.should.be.eql([
		"a",
		{
			issuer: "index.js",
			resource: "a.js",
			resourceQuery: ""
		}
	]);
	var b = require("./b?hello");
	b.should.be.eql([
		"b",
		{
			issuer: "index.js",
			resource: "b.js",
			resourceQuery: "?hello"
		}
	]);
	var ca = require("./call-a?hello");
	ca.should.be.eql([
		"a",
		{
			issuer: "call-a.js",
			resource: "a.js",
			resourceQuery: "?hello"
		},
		{
			issuer: "index.js",
			resource: "call-a.js",
			resourceQuery: "?hello"
		}
	]);
});

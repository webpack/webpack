it("should resolve loaders relative to require", function() {
	var index = "index", test = "test";
	require("./loaders/queryloader?query!!!!./node_modules/subcontent/" + index + ".js").should.be.eql({
		resourceQuery: null,
		query: "?query",
		prev: "module.exports = \"error\";"
	});
	require("!./loaders/queryloader?query!./node_modules/subcontent/" + test + ".jade").should.be.eql({
		resourceQuery: null,
		query: "?query",
		prev: "xyz: abc"
	});
});

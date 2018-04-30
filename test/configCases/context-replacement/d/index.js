it("should replace a context with resource query and manual map", function() {
	function rqInContext(x) {
		return require(x);
	}
	rqInContext("a").should.be.eql({
		resourceQuery: "?cats=meow",
		query: "?lions=roar",
		prev: "module.exports = \"a\";\n",
	});
});

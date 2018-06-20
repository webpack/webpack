it("should replace a context with resource query and manual map", function() {
	function rqInContext(x) {
		return require(x);
	}
	expect(rqInContext("a")).toEqual({
		resourceQuery: "?cats=meow",
		query: "?lions=roar",
		prev: "module.exports = \"a\";\n",
	});
});

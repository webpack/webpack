it("should replace a context with a new regExp", function() {
	function rqInContext(x) {
		return require('./folder/' + x);
	}
	expect(rqInContext("a")).toBe("a");
});

it("should replace a context with a new regExp", function() {
	function rqInContext(x) {
		return require(x);
	}
	expect(rqInContext("./only-this")).toBe("ok");
});

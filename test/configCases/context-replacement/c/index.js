it("should replace a context with a manual map", function() {
	function rqInContext(x) {
		return require(x);
	}
	expect(rqInContext("a")).toBe("a");
	expect(rqInContext("b")).toBe("b");
	expect(rqInContext("./c")).toBe("b");
	expect(rqInContext("d")).toBe("d");
	expect(rqInContext("./d")).toBe("d");
	(expect(function() {
		rqInContext("module-b")
	}).toThrowError());
});

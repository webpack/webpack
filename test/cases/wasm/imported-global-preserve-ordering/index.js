it("should preserve the ordering of globals", function() {
	return import("./module.wat").then(function(e) {
		expect(e.c).toBe(3);
		expect(e.d).toBe(4);
	});
});

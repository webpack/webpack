it("should export imported global", function() {
	return import("./module.wat").then(function({v}) {
		expect(v).toBe(1);
	});
});

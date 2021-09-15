it("should preserve the valtype of the imported global", function() {
	return import("./module.wat").then(function({get}) {
		expect(get()).toBe(0xFFFFFFFFFF);
	});
});

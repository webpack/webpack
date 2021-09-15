it("should allow global with imported global as initializer", function() {
	return import("./module.wat").then(function({get}) {
		expect(get()).toEqual(33);
	});
});

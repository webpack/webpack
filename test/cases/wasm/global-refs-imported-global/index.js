it("should allow global with imported global as initilizer", function() {
	return import("./module.wat").then(function({get}) {
		expect(get()).toEqual(33);
	});
});

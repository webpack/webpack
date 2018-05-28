it("should allow global with imported global as initilizer", function() {
	return import("./module.wat").then(function({value}) {
		expect(value).toEqual(33);
	});
});

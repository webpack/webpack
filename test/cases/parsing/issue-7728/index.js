it("should detect module.require dependency", function () {
	var test1 = module.require('./a').default;
	expect(test1()).toBe("OK");
});

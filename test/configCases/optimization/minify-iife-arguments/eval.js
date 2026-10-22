it("should evaluate an argument in the caller's scope", function () {
	var value = 1;
	(function (value) {
		expect(value).toBe(1);
		expect(value).toBe(1);
	})(eval("value"));
});

it("should answer typeof __non_webpack_require__ correctly", function () {
	var oldValue;
	eval("oldValue = require;");
	expect(typeof __non_webpack_require__).toBe("function");
	eval("require = undefined;");
	expect(typeof __non_webpack_require__).toBe("undefined");
	eval("require = oldValue;");
	expect(typeof __non_webpack_require__).toBe("function");
});

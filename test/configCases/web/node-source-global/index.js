it("should disallow rename global", () => {
	var shouldBeGlobal = global;
	// prevent optimizations
	var method = shouldBeGlobal[String.fromCharCode(40, 40, 40)];
	method && method();
	eval("expect(shouldBeGlobal.value1).toBe('value1')");
	expect(shouldBeGlobal.test).toBe("test");
	expect(global.test).toBe("test");
});

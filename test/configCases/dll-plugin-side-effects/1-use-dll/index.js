it("should include all exports and modules in the dll", function() {
	const { a, b, c } = require("dll/module");
	expect(typeof a).toBe("function");
	expect(a()).toBe("a");
	expect(typeof b).toBe("function");
	expect(b()).toBe("b");
	expect(typeof c).toBe("function");
	expect(c()).toBe("c");
});

it("should not throw when using dynamic properties in unused classes", () => {
	require("./unused1");
});

it("should not throw when using dynamic properties in used classes", () => {
	const exports = require("./used1");
	const x = new exports.Used();
	expect(x.a()).toBe("A");
	expect(x.b).toBe("B");
	expect(x.c).toBe("C");
	expect(exports.Used.d()).toBe("D");
	expect(exports.Used.e).toBe("E");
	expect(exports.Used.f).toBe("F");
	const x2 = new exports.Used2();
	expect(x2.a()).toBe("A");
	expect(x2.b).toBe("B");
	expect(x2.c).toBe("C");
	expect(exports.Used2.d()).toBe("D");
	expect(exports.Used2.e).toBe("E");
	expect(exports.Used2.f).toBe("F");
	expect(x2.x).toBe("X");
});

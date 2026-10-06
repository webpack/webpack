const a = require("./asm");

it("should not evaluate constants inside a \"use asm\" function", () => {
	const source = a.toString();

	expect(source).toContain('"use asm";');
	// `b` and `d` are asm.js, so every branch stays as written
	for (const kept of [101, 102, 103, 104, 109, 110]) {
		expect(source).toContain(String(kept));
	}
	// `c` is not, so its dead branches are dropped
	expect(source).toContain("105");
	for (const dropped of [106, 107, 108]) {
		expect(source).not.toContain(String(dropped));
	}
	expect(a()).toBe(101 + 105 + 109);
});

it("should build rather than deadlock on two chunks that name each other", async () => {
	const [a, b] = await Promise.all([import("./a.js"), import("./b.js")]);
	expect(a.default).toBe(1);
	expect(b.default).toBe(2);
});

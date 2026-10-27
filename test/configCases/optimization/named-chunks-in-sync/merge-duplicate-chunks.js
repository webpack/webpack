it("should reuse the merged chunk for a cache group with its name", async () => {
	const unnamed = await import("./a");
	const named = await import(/* webpackChunkName: "named" */ "./a");
	expect(named).toBe(unnamed);
	expect(named.default).toBe("a");
});

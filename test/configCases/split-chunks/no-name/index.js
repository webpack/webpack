it("should work", async function() {
	const a = await import(/* webpackChunkName: "chunk" */ "./a");
	expect(a.default).toBe("a");
});

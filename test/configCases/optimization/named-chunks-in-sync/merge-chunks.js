it("should load the chunks after the named chunk is merged", async () => {
	const a = await import("./a");
	const b = await import(/* webpackChunkName: "named" */ "./b");
	expect(a.default).toBe("a");
	expect(b.default).toBe("b");
});

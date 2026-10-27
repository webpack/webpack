it("should load the chunks after merged named chunks become empty", async () => {
	const named = await import(/* webpackChunkName: "named" */ "./x");
	const other = await import(/* webpackChunkName: "other" */ "./x");
	expect(named).toBe(other);
	expect(named.default).toBe("x");
});

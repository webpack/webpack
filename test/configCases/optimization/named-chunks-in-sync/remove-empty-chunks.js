it("should load the chunks after the named chunk becomes empty", async () => {
	const x = await import(/* webpackChunkName: "named" */ "./x");
	const y = await import("./y");
	expect(x.default).toBe("x");
	expect(y.default).toBe("xy");
});

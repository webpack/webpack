it("should report a chain of import() calls", async () => {
	const a = await import(/* webpackChunkName: "a" */ "./a");

	expect(a.loadDeep).toBeInstanceOf(Function);
	expect(a.loadHeavy).toBeInstanceOf(Function);
	expect(a.loadLight).toBeInstanceOf(Function);
});

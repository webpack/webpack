it("should warn, not fail, on magic comment values that evaluate to a symbol", async () => {
	const named = await import(/* webpackChunkName: Symbol() */ "./mod");
	expect(named.default).toBe(42);
	const ignored = await import(/* webpackIgnore: Symbol() */ "./mod");
	expect(ignored.default).toBe(42);
});

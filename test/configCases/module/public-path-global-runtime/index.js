it("should not need the global object for the automatic public path", () => {
	expect(new URL("./file.text", import.meta.url)).toBeDefined();

	const stats = __STATS__.children[__STATS_I__];

	// with or without `globalThis`, no `__webpack_require__.g` runtime module
	expect(stats.modules.length).toBe(4);
});

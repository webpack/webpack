it("should not take an element named like the chunk loading global for the chunk array", async () => {
	expect(Array.isArray(self.webpackChunkmy_app)).toBe(true);
	const module = await import(/* webpackChunkName: "the-chunk" */ "./chunk");
	expect(module.default).toBe("ok");
});

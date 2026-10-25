it("should resolve a relative manifest against the configured module URL", async () => {
	manifestState.error = new TypeError("Failed to fetch dynamically imported module");
	expect(await module.hot.check()).toBe(null);
	expect(module.hot.status()).toBe("idle");
	expect(manifestState.requests.pop()).toEqual({
		url: new URL(__webpack_require__.hmrF(), manifestState.baseURL).href,
		method: "HEAD"
	});
});

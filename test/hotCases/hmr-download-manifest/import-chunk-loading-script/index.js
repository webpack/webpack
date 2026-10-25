it("should ignore a missing manifest at an absolute URL in a classic script", async () => {
	manifestState.error = new TypeError("Failed to fetch dynamically imported module");
	expect(await module.hot.check()).toBe(null);
	expect(module.hot.status()).toBe("idle");
	expect(manifestState.requests.pop()).toEqual({
		url: __webpack_public_path__ + __webpack_require__.hmrF(),
		method: "HEAD"
	});
});

it("should preserve the import error when a classic script URL cannot be resolved", async () => {
	const error = new TypeError("Failed to fetch dynamically imported module");
	manifestState.error = error;
	__webpack_public_path__ = "./";
	await expect(__webpack_require__.hmrM()).rejects.toBe(error);
	expect(manifestState.requests).toHaveLength(0);
});

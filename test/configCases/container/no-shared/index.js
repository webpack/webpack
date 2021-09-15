it("should allow to work without shared modules", async () => {
	await __webpack_init_sharing__("default");
	const container = __non_webpack_require__("./container.js");
	container.init(__webpack_share_scopes__.default);
	const moduleFactory = await container.get("./module");
	expect(moduleFactory().ok).toBe(true);
});

it("should allow sharing between share scopes", async () => {
	await __webpack_init_sharing__("default");
	await __webpack_init_sharing__("example");

	const container1 = __non_webpack_require__("./container1.js");
	await container1.init({
		name: "default",
		shareScope: __webpack_share_scopes__.default
	});
	await container1.init({
		name: "example",
		shareScope: __webpack_share_scopes__.example
	});
	const moduleFactory1 = await container1.get("./module");
	const module1 = moduleFactory1();

	const container2 = __non_webpack_require__("./container2.js");
	await container2.init({
		name: "default",
		shareScope: __webpack_share_scopes__.default
	});
	await container2.init({
		name: "example",
		shareScope: __webpack_share_scopes__.example
	});
	const moduleFactory2 = await container2.get("./module");
	const module2 = moduleFactory2();

	expect(module1.default).toBeDefined();
	expect(module1.default).toBe(module2.default);
});

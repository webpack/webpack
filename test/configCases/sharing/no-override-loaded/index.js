it("should not override an already loaded shared module version", async () => {
	__webpack_share_scopes__.default = {
		package: {
			"1.0.0": {
				get: () => () => 42,
				loaded: true,
				from: "a"
			}
		}
	};
	await __webpack_init_sharing__("default");
	await expect(import("package")).resolves.toHaveProperty("default", 42);
});

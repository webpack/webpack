it("should expose modules from the container", async () => {
	const container = __non_webpack_require__("./container-file.js");
	expect(container).toBeTypeOf("object");
	expect(container.init).toBeTypeOf("function");
	container.init({
		value: {
			get: () =>
				new Promise(resolve => {
					setTimeout(() => {
						resolve(() => ({
							__esModule: true,
							default: "overriden-value"
						}));
					}, 100);
				})
		}
	});
	const testFactory = await container.get("./test");
	expect(testFactory).toBeTypeOf("function");
	expect(testFactory()).toEqual(
		nsObj({
			default: "test overriden-value"
		})
	);
});

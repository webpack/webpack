it("should expose modules from the container", async () => {
	const container = __non_webpack_require__("./container-file.js");
	expect(container).toBeTypeOf("object");
	expect(container.get).toBeTypeOf("function");
	const testFactory = await container.get("test");
	expect(testFactory).toBeTypeOf("function");
	expect(testFactory()).toBe("test");
	const test2Factory = await container.get("test2");
	expect(test2Factory).toBeTypeOf("function");
	expect(test2Factory()).toEqual(
		nsObj({
			default: "test2",
			other: "other"
		})
	);
});

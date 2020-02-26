it("should expose modules from the container", async () => {
	const file = __non_webpack_require__("./container-file.js");
	expect(file).toBeTypeOf("object");
	expect(file.container).toBeTypeOf("object");
	expect(file.container.get).toBeTypeOf("function");
	const testFactory = await file.container.get("test");
	expect(testFactory).toBeTypeOf("function");
	expect(testFactory()).toBe("test");
	const test2Factory = await file.container.get("test2");
	expect(test2Factory).toBeTypeOf("function");
	expect(test2Factory()).toEqual(
		nsObj({
			default: "test2",
			other: "other"
		})
	);
});

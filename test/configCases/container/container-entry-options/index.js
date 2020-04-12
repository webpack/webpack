it("should expose `setOptions` API from the container", async () => {
	const container = __non_webpack_require__("./container-file.js");
	expect(container).toBeTypeOf("object");
	expect(container.setOptions).toBeTypeOf("function");
	container.setOptions({ publicPath: "/abc/def/" });
	const publicPathFactory = await container.get("publicPath");
	expect(publicPathFactory).toBeTypeOf("function");
	expect(publicPathFactory()).toBe("/abc/def/");
});

it("should not crash if no options are passed into `setOptions` API from the container", async () => {
	const container = __non_webpack_require__("./container-file.js");
	expect(container).toBeTypeOf("object");
	expect(container.setOptions).toBeTypeOf("function");
	container.setOptions();
	const publicPathFactory = await container.get("publicPath");
	expect(publicPathFactory).toBeTypeOf("function");
	expect(publicPathFactory()).toBe("");
});

it("should not crash if an empty options object is passed into `setOptions` API from the container", async () => {
	const container = __non_webpack_require__("./container-file.js");
	expect(container).toBeTypeOf("object");
	expect(container.setOptions).toBeTypeOf("function");
	container.setOptions({});
	const publicPathFactory = await container.get("publicPath");
	expect(publicPathFactory).toBeTypeOf("function");
	expect(publicPathFactory()).toBe("");
});

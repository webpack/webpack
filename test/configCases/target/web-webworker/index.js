it("should compile with web+webworker target", () => {
	expect(typeof self).toBe("object");
});

it("should load a dynamic import", () => {
	return import("./chunk").then(({ value }) => {
		expect(value).toBe(42);
	});
});

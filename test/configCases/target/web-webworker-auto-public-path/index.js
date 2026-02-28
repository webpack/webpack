it("should resolve public path automatically in web+webworker target", () => {
	expect(__webpack_public_path__).toBe("https://test.cases/path/");
});

it("should load a dynamic import with auto public path", () => {
	return import("./chunk").then(({ value }) => {
		expect(value).toBe(42);
	});
});

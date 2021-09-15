it("should work normally (a)", () => {
	return import("./a").then(({ value }) => {
		expect(value).toBe("shared");
	});
});

it("should work normally (b)", () => {
	return import("./b").then(({ value }) => {
		expect(value).toBe("shared");
	});
});

it("should work normally (container-with-shared/a)", () => {
	return import("container-with-shared/a").then(({ value }) => {
		expect(value).toBe("shared");
	});
});

it("should work normally (container-with-shared/b)", () => {
	return import("container-with-shared/b").then(({ value }) => {
		expect(value).toBe("shared");
	});
});

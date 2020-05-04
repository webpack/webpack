it("should allow transitive overrides (container-no-shared/a)", () => {
	return import("container-no-shared/a").then(({ value }) => {
		expect(value).toBe("new shared");
	});
});

it("should not override non-overridables (container-no-shared/b)", () => {
	return import("container-no-shared/b").then(({ value }) => {
		expect(value).toBe("shared");
	});
});

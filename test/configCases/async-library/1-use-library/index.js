it("should get valid export from library", () => {
	return import("library").then(({ a }) => {
		expect(a).toBe(42);
	});
});

const value = await new Promise((resolve) => {
	setTimeout(() => resolve(42), 0);
});

it("should settle the bundle only after the async entry finished", () => {
	expect(value).toBe(42);
});

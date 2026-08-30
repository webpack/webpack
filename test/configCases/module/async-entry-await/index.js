const value = await Promise.resolve(42);

it("should settle the bundle only after the async entry finished", () => {
	expect(value).toBe(42);
});

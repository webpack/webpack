it("should be able to consume package self referencing", async () => {
	const result = await import("my-middleware");
	expect(result.m()).toBe("ABA");
});

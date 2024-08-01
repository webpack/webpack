it("should merge chunks", async () => {
	const { value } = await import("./a");
	expect(value).toBe("fine")
});


it("should import a chunk carrying a stylesheet", async () => {
	const { value } = await import("./lazy-css.js");
	expect(value).toBe(1);
});

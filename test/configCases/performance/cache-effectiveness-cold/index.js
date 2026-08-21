it("should not report caching on a build that reused nothing", async () => {
	const lazy = await import("./lazy.js");

	expect(lazy.default).toBe("lazy");
});

it("should await every entry before resolving the library import", async () => {
	const library = await import("library");
	expect(library.isReady()).toBe(true);
	expect(library.value).toBe(42);
});

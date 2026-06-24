it("loads an async chunk whose filename uses an inline [fullhash:<digest>]", async () => {
	// The runtime inlines the re-encoded full hash; if it didn't match the emitted
	// filename this dynamic import would reject with "Cannot find module" (404).
	const m = await import("./async");
	expect(m.value).toBe(1);
});

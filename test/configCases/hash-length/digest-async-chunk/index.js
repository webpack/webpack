it("loads an async chunk whose filename uses an inline hash digest", async () => {
	// The runtime-computed chunk URL must match the emitted filename, otherwise
	// this dynamic import rejects with "Cannot find module" (the 404 case).
	const m = await import("./async");
	expect(m.value).toBe(42);
});

it("loads an async chunk routed through the static-URL inline-digest path", async () => {
	// A function chunkFilename routes chunks through GetChunkFilenameRuntimeModule's
	// static-URL builder; a 404 (mismatched re-encode) would reject this import.
	const m = await import("./async");
	expect(m.value).toBe(1);
});

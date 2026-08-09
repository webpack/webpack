it("should attach a runtime module queued through addLazyRuntimeModule", () => {
	expect(globalThis.__lazyRuntimeMarker).toBe("attached");
});

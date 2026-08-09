it("should attach a runtime module queued through addLazyRuntimeModule", () => {
	expect(global.__lazyRuntimeMarker).toBe("attached");
});

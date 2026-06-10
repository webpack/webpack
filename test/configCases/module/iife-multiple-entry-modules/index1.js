it("isolates index2's top-level `value` from index1 without an IIFE", () => {
	// index2 declares `value`; renaming keeps it from leaking into index1, so the
	// per-entry IIFE is not needed.
	expect(typeof value).toBe("undefined");
});

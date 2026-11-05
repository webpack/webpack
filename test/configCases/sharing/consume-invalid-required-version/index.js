it("should fall back to the local modules when the required version is unusable", async () => {
	expect((await import("plus-range")).default).toBe("plus-range");
	expect((await import("dash-range")).default).toBe("dash-range");
	expect((await import("number-range")).default).toBe("number-range");
});

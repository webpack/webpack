it("should load an async chunk that is initial for another entry", async () => {
	expect((await import("./feature.js")).value).toBe("shared-feature");
	expect((await import("./feature.js")).value).toBe("shared-feature");
});

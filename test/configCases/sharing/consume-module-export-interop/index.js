it("should correctly handle export interop", async () => {
	await __webpack_init_sharing__("default");
	const { something } = await import("./strict.mjs");

	expect(typeof something).toBe("function");
	expect(something()).toBe("something");
});

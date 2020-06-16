it("should provide both shared versions, but not the unused one", async () => {
	await __webpack_init_sharing__("default");
	const { version } = await import("shared");
	const { version: versionInner } = await import("my-module");
	expect(version).toBe("1.0.0");
	expect(versionInner).toBe("2.0.0");
});

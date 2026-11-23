it("should rethrow a failed init function's error on every later import", async () => {
	globalThis.crossChunkInitThrows = 0;
	await expect(
		import(/* webpackChunkName: "throws-1" */ "./throws-1.js")
	).rejects.toThrow("init failed");
	await expect(
		import(/* webpackChunkName: "throws-2" */ "./throws-2.js")
	).rejects.toThrow("init failed");
	expect(globalThis.crossChunkInitThrows).toBe(1);
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const shared = fs.readFileSync(
		path.join(__dirname, "shared-2.chunk.mjs"),
		"utf-8"
	);
	expect(shared).toMatch(/^function throws_init\(\) \{$/m);
});

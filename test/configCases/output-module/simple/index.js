it("should execute as module", () => {
	expect(
		(function () {
			return !this;
		})()
	).toBe(true);
});

it("should be able to load a chunk", async () => {
	const module = await import("./chunk");
	expect(module.default).toBe(42);
});

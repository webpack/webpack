it("should report through the error channel", async () => {
	const loaded = await Promise.all([
		import("./r0"),
		import("./r1"),
		import("./r2"),
		import("./r3"),
		import("./r4"),
		import("./r5"),
		import("./r6"),
		import("./r7"),
		import("./r8"),
		import("./r9")
	]);

	expect(loaded.map((module) => module.default)).toEqual([
		0, 1, 2, 3, 4, 5, 6, 7, 8, 9
	]);
});

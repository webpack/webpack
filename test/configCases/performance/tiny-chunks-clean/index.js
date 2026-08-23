it("should stay quiet when too few chunks are that small", async () => {
	const loaded = await Promise.all([
		import("./r0"),
		import("./r1"),
		import("./r2"),
		import("./r3"),
		import("./r4"),
		import("./r5"),
		import("./r6"),
		import("./r7"),
		import("./r8")
	]);

	expect(loaded.map((module) => module.default)).toEqual([
		0, 1, 2, 3, 4, 5, 6, 7, 8
	]);
	expect(__STATS__.warnings).toHaveLength(0);
});

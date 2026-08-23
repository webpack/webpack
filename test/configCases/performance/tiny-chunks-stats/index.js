it("should report through the stats channel", async () => {
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
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/tiny chunks: 10 chunks/);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});

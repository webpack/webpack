it("should stay quiet when hints are off", async () => {
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

	expect(loaded).toHaveLength(10);
	expect(__STATS__.hints).toHaveLength(0);
});

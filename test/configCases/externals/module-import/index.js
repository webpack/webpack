it("should allow async externals", async () => {
	const fs1 = await import("fs");
	const fs2 = await import("node:fs");
	const fs3 = await import("node-fs");

	expect(fs1).toStrictEqual(fs2);
	expect(fs1).toStrictEqual(fs3);
});

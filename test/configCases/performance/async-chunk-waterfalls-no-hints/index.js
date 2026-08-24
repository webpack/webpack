it("should stay quiet when hints are off", async () => {
	const a = await import("./a");

	expect(a.load).toBeInstanceOf(Function);
	expect(__STATS__.hints).toHaveLength(0);
});

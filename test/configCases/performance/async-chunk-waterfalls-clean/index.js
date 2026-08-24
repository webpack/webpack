it("should stay quiet at the depth import() is meant for", async () => {
	const a = await import("./a");

	expect(a.load).toBeInstanceOf(Function);});

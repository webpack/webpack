it("should report a chain of import() calls", async () => {
	const a = await import("./a");

	expect(a.load).toBeInstanceOf(Function);});

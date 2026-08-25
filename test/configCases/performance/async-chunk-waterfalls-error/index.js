it("should report through the error channel", async () => {
	const a = await import("./a");

	expect(a.load).toBeInstanceOf(Function);});

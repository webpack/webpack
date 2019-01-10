it("should set NODE_ENV according to mode", () => {
	expect(process.env.NODE_ENV).toBe(__MODE__);
});

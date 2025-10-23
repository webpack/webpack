it("should set NODE_ENV according to mode", () => {
	if (__MODE__ === "none") {
		expect(process.env.NODE_ENV).toBe("test");
	} else {
		expect(process.env.NODE_ENV).toBe(__MODE__);
	}
});

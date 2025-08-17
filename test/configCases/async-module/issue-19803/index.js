it("should work", () => {
	return import("./d").then(d => {
		expect(d.d).toBe("ab");
	});
});
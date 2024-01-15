it("should allow to use top-level-await", () => {
	return import("./reexport").then(({ number, getNumber }) => {
		expect(number).toBe(1);
		expect(getNumber()).toBe(42);
	});
});

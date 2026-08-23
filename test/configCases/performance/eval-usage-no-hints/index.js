it("should stay quiet when hints are off", () => {
	expect(eval("1")).toBe(1);
	expect(__STATS__.hints).toHaveLength(0);
});

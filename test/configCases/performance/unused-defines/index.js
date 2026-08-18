it("should compile and report the keys nothing reads", () => {
	expect(USED_FLAG).toBe(true);
	expect(NESTED.INNER).toBe("inner");
	expect(typeof TYPEOF_USED).toBe("string");
});

it("should report a single OS-dependent condition as an error", () => {
	expect(__STATS__.errors).toHaveLength(1);
	expect(__STATS__.errors[0].message).toMatch(
		/condition hardcodes a path separator, so it only match/
	);
});

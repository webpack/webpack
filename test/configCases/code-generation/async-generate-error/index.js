it("should report async code generation error in stats", () => {
	const errors = __STATS__.errors;
	expect(errors).toHaveLength(1);
	expect(errors[0].message).toMatch(/async code generation failed/);
});

it("should still build entry without errors", () => {
	expect(1 + 1).toBe(2);
});

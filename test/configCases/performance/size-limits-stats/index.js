it("should report the size hint in stats only", () => {
	const messages = __STATS__.hints.map((hint) => hint.message).join("\n");
	expect(messages).toMatch(/recommended size limit/);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});

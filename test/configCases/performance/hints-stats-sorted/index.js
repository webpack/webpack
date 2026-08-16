it("should sort hints from every producer", () => {
	const messages = __STATS__.hints.map((hint) => hint.message);
	// `unusedRules` taps `afterSeal` and the size limits tap `afterEmit`, so
	// insertion puts the rule hint first while sorting puts it last.
	expect(messages.length).toBeGreaterThan(1);
	expect(messages).toEqual([...messages].sort());
	expect(messages[0]).toMatch(/^asset size limit/);
	expect(messages[messages.length - 1]).toMatch(
		/^webpack rule recommendations/
	);
	expect(__STATS__.hintsCount).toBe(messages.length);
});

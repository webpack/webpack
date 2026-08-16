it("should report only the conditions that hardcode a separator", () => {
	expect(__STATS__.hints).toHaveLength(1);

	const message = __STATS__.hints[0].message;

	expect(message).toMatch(
		/module\.rules\[0\]\.exclude .* only matches '\/' paths/
	);
	expect(message).toMatch(
		/module\.rules\[1\]\.include .* only matches '\\' paths/
	);
	expect(message).toMatch(
		/module\.rules\[2\]\.oneOf\[0\]\.test .* only matches '\/' paths/
	);
	expect(message).toMatch(
		/module\.rules\[3\]\.rules\[0\]\.test .* only matches '\/' paths/
	);
	// A portable or separator-free condition must not be named.
	for (const index of [5, 6, 7, 8]) {
		expect(message).not.toMatch(new RegExp(`module\\.rules\\[${index}\\]`));
	}
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});

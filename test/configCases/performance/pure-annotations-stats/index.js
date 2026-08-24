const onLiteral = /*#__PURE__*/ 42;

it("should report through the stats channel", () => {
	expect(onLiteral).toBe(42);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/pure annotations: 1/);
	expect(__STATS__.warnings).toHaveLength(0);
});

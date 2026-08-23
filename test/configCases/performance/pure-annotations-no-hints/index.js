const onLiteral = /*#__PURE__*/ 42;

it("should stay quiet when hints are off", () => {
	expect(onLiteral).toBe(42);
	expect(__STATS__.hints).toHaveLength(0);
});

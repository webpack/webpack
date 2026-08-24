const onLiteral = /*#__PURE__*/ 42;

it("should report through the error channel", () => {
	expect(onLiteral).toBe(42);
});

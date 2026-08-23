const works = /*#__PURE__*/ String(1);
const onLiteral = /*#__PURE__*/ 42;
const onIdentifier = /*#__PURE__*/ works;

it("should report annotations the parser does not read", () => {
	expect(onLiteral).toBe(42);
	expect(onIdentifier).toBe("1");
});

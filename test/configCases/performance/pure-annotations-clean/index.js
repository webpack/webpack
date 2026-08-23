class Thing {}

const call = /*#__PURE__*/ String(1);
const built = /*#__PURE__*/ new Thing();
const tagged = /*#__PURE__*/ String.raw`x`;

it("should stay quiet where the parser reads them", () => {
	expect(call).toBe("1");
	expect(built).toBeInstanceOf(Thing);
	expect(tagged).toBe("x");
	expect(__STATS__.warnings).toHaveLength(0);
});

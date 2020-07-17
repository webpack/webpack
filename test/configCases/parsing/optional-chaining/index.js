it("should correctly render defined data #1", () => {
	expect(_VALUE_?._DEFINED_).toBe(1);
});

it("should correctly render defined data #2", () => {
	const val1 = _VALUE_?._PROP_?._DEFINED_;
	const val2 = _VALUE_?._PROP_?._UNDEFINED_;
	expect(val1).toBe(2);
	expect(val2).toBeUndefined();
});

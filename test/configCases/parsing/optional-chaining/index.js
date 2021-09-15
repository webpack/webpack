it("should correctly render defined data #1", () => {
	expect(_VALUE_?._DEFINED_).toBe(1);
});

it("should correctly render defined data #2", () => {
	const val1 = _VALUE_?._PROP_?._DEFINED_;
	const val2 = _VALUE_?._PROP_?._UNDEFINED_;
	const val3 = typeof _VALUE_?._PROP_?._DEFINED_;
	const val4 = typeof _VALUE_?._PROP_?._UNDEFINED_;
	const val5 = _VALUE_?._PROP_;
	const val6 = typeof _VALUE_?._PROP_;
	expect(val1).toBe(2);
	expect(val2).toBeUndefined();
	expect(val3).toBe("number");
	expect(val4).toBe("undefined");
	expect(val5).toEqual({ _DEFINED_: 2 });
	expect(val6).toBe("object");
	expect((() => typeof _VALUE_?._PROP_?._DEFINED_).toString()).toContain(
		"number"
	);
	expect((() => typeof _VALUE_?._PROP_).toString()).toContain("object");
	if (_VALUE_._PROP_._DEFINED_ !== 2) require("fail");
	if (_VALUE_?._PROP_?._DEFINED_ !== 2) require("fail");
	if (typeof _VALUE_._PROP_._DEFINED_ !== "number") require("fail");
	if (typeof _VALUE_?._PROP_?._DEFINED_ !== "number") require("fail");
	if (typeof _VALUE_._PROP_ !== "object") require("fail");
	if (typeof _VALUE_?._PROP_ !== "object") require("fail");
});

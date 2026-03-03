it("should get options", function() {
	expect(require("./a")).toStrictEqual({
		unknown: true,
		arg: true,
		arg1: null,
		arg3: 1234567890,
		arg4: "string",
		arg5: [1, 2, 3],
		arg6: { foo: "value", bar: { baz: "other-value" } }
	});
});

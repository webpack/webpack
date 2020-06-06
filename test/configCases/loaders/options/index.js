it("should get options", function() {
	expect(require("./a")).toStrictEqual({
		arg: true,
		arg1: null,
		arg3: 1234567890,
		arg4: "string",
		arg5: [1, 2, 3],
		arg6: { foo: "value", bar: { baz: "other-value" } }
	});
	expect(require("./b")).toStrictEqual({
		arg: true,
		arg1: null,
		arg3: 1234567890,
		arg4: "string",
		arg5: [1, 2, 3],
		arg6: { foo: "value", bar: { baz: "other-value" } }
	});
	expect(require("./c")).toStrictEqual({
		arg: true,
		arg1: null,
		arg3: 1234567890,
		arg4: "string",
		arg5: [1, 2, 3],
		arg6: { foo: "value", bar: { baz: "other-value" } }
	});
	expect(require("./d")).toStrictEqual({
		arg4: "text"
	});
	expect(require("./e")).toStrictEqual({});
	expect(require("./f")).toStrictEqual({
		delicious: "",
		name: "cheesecake",
		slices: "8",
		warm: "false"
	});
	expect(require("./g")).toStrictEqual({
		"=": "="
	});
	expect(require("./h")).toStrictEqual({
		foo: "bar"
	});
	expect(require("./i")).toStrictEqual({
		foo: "bar"
	});
});

const never = false;
if (never) {
	require("./error1");
	require("./error2");
}
